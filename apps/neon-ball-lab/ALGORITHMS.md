# 多小球目标追踪：算法推导与代码路线

## 0. 问题分解

一帧图像中有 N 个发光球，检测器输出一组无身份的观测 `[(cx,cy,r,score), ...]`。追踪器在一系列时刻维护一组**与视觉观测关联但不知真实球编号**的 Track ID。真实球 ID 只能用于**独立评估**，不可作为追踪算法的输入。

此项目多球最多 8 个、每 5 秒换色，容易出现长尾干扰、碰撞、交叉和部分遮挡。不能直接以颜色作为主身份识别器。

## 1. 自写 baseline：YOLO / OpenCV + KF + Hungarian

代码：`mot_core.py`，已由 `local_server.py` 使用。与 `tracker.py` 的**单目标**卡尔曼滤波不同，这里每个 Track 都拥有 `x,P,radius,hits,missing,id`。

**状态** `x=[px,py,vx,vy]^T`，`dt` 为**物理时间**（浏览器 HTTP 按请求时间；离线视频按来源 FPS），转移矩阵：

```
F = [[1,0,dt,0],
     [0,1,0,dt],
     [0,0,1,0],
     [0,0,0,1]]
G = [[.5*dt*dt,0],[0,.5*dt*dt],[dt,0],[0,dt]]
Q = sigma_a**2 * G @ G.T
```

预测 `x-=F@x+`，`P-=F@P+@F.T+Q`。观测 `z=(cx,cy)`，`H=[[1,0,0,0],[0,1,0,0]]`，`R=sigma_z^2 I2`；`y=z-Hx-`，`S=HP-H.T+R`；马氏距离 `d²=y.T S^-1 y`。只关联 `d²<16` 的配对。更新 `K=P-H.T @ S^-1`，`x+=x-+Ky`，并用 Joseph 形式更新 `P`。

将每条轨迹与每个框之间的 `d²+半径偏差+小幅置信度惩罚` 构成代价矩阵。额外为每条轨迹添加一个**虚拟未匹配列**，调用 `scipy.optimize.linear_sum_assignment`；这样目标消失时无需强制匹配到错误球体。

未匹配检测创建新 Track（候选目标需持续 2 帧才确认为显示轨迹）；未匹配 Track 保留最多 1.1s，继续传播预测；超过时限丢弃。相互接近的目标让过程噪声乘 2.8，以更快适应碰撞后的速度改变。

### 重要参数

| 参数 | 默认值 | 含义 |
|---|---:|---|
| `measurement_sigma` | 7 px | 检测位置噪声标准差 |
| `acceleration_sigma` | 950 px/s² | 未知机动强度，越大越灵敏但越抖 |
| `gate` | 16 | 2D 卡方/马氏距离平方上界 |
| `max_missing` | 1.1 s | 短暂遮挡最多保留多久 |
| `min_hits` | 2 | 新轨迹至少检测到几次才确认 |
| `future_seconds` | 0.35 s | 未来预测长度 |

### 输出 JSON 协议

服务返回 `tracks` 数组，例如：

```json
{"tracks": [
  {"id":1,"x":142.3,"y":203.8,"vx":118.0,"vy":-20.1,
   "radius":21.2,"predicted":[183.6,196.8],
   "visible":true,"confirmed":true,"missed_seconds":0.0}
]}
```

上述数值**仅是协议结构示例**，不是运行精度或真实帧数据。

## 2. 工程 baseline：ByteTrack / BoT-SORT

先训练 YOLO 多球检测权重，再用 Ultralytics 的 `model.track(frame, persist=True, tracker="bytetrack.yaml")`。**同一个 YOLO 模型对象必须在连续帧上复用**，`persist=True` 才能累积跟踪状态。可运行脚本：`compare_builtin.py`。

```bash
.venv/bin/python compare_builtin.py --video mot_demo.mp4 --tracker bytetrack
.venv/bin/python compare_builtin.py --video mot_demo.mp4 --tracker botsort --output botsort.mp4 --csv botsort.csv
```

ByteTrack 在第一阶段匹配高置信度结果，第二阶段利用低置信度框延续已有轨迹；碰撞与局部遮挡场景通常值得比较。但仍可能发生目标 ID 交换。

## 3. 研究升级：IMM 多模型估计

在跟踪器里将单个 KF 换成两个或三个模式并行：

- `CV-smooth`：低机动噪声，适合平滑飞行；
- `CV-agile`：高机动噪声，适合变向和碰撞后加速；
- 可选 `CA` 或协调转弯（CT）模型：适合持续加速度或弧线运动。

保持同一状态维度最容易从两个 CV 模型开始。设两个模型的转移概率 `P_ij`，当前概率 `μ_i`，则下一时刻先验模式概率为：

`c_j = Σ_i P_ij μ_i`

模式间混合权重：

`μ_(i|j) = (P_ij μ_i) / c_j`

用权重混合每个模式的初始状态与协方差，分别预测、用该帧检测结果更新。每个模式得到创新 `ν_j` 和创新协方差 `S_j`，似然：

`L_j = exp(-.5 ν_j.T S_j^-1 ν_j) / sqrt((2π)^2 det(S_j))`

更新模式概率：

`μ_j' = c_j L_j / Σ_k c_k L_k`

最后输出加权状态与协方差，替代原来的单 KF 结果。若碰撞导致突然变速，高机动模型的概率通常应上升，但不是自动保证。复杂场景可加入多个观测候选的概率数据关联（JPDA）或多假设跟踪（MHT）。

## 4. 真正应该考核的指标

旧 V4.0 的「100 分」是对**主球 #1 的单目标综合分**，不能拿来代表多目标跟踪质量。建议另设 MOT 100 分（需有每球真实 ID 的独立评估端）：

- 30 分：身份保持，重点 IDF1 / ID switches；
- 20 分：检出率与假阳性，TP / FN / FP；
- 20 分：所有可见球的状态位置 RMSE；
- 15 分：已到期的 +350ms 预测 RMSE；
- 10 分：交叉/碰撞后恢复到误差阈值的成功率与时间；
- 5 分：有效追踪帧覆盖率 / 实时 FPS 门槛。

这是**自定义实验评分**，不是 MOT 官方评分。正规对照另外报告 MOTA、IDF1、HOTA/DetA/AssA。要确保不同模型使用**同一组视频与逐帧 GT**，对预测的 RMSE 按**对应未来时间点**比较，而不是和当前坐标比较；对不可见/完全遮挡帧应定义一致的评估规则。

**评估端**可以读取网页内部的所有球真实坐标、物理球 ID、碰撞事件时间戳，仅用于生成 GT / 算分。**追踪器**始终只接收 Canvas 图像与时间戳；否则会发生答案泄漏。

## 5. 迭代顺序

1. OpenCV -> 手写 KF/Hungarian：先做到 2～4 球 ID 大部分连续；
2. 自训 YOLO（多球标注）替代检测器：分析长尾误检与遮挡漏检；
3. 加 ByteTrack 对照：对比 ID switches 和丢失轨迹数；
4. 手写 IMM：重点测试急转、碰撞的 350ms 误差；
5. 真正多目标统计：从网页导出所有真实球每帧的 GT 和算法 ID，建立离线可复现 benchmark。

源码：`mot_core.py`（手写基线）、`mot_video.py`（视频演示）、`compare_builtin.py`（ByteTrack / BoT-SORT 对照）、`generate_multi_dataset.py`（多目标训练数据）。
