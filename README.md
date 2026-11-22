# 🎮 游戏宇宙 · Games Hub

> 六个入口，一个网址，一次启动。围棋、五子棋、星阵解谜、扫雷、混沌光轨与 2D 篮球统一在同一个本地 Web 大厅中。

本仓库由原 `four-games-hub` 整理而来，文件夹与仓库统一命名为 `games`。对外只暴露一个端口（默认 `3300`），围棋、五子棋与可选的 Python 视觉追踪服务只在 `127.0.0.1` 的内部端口运行，再由大厅同源转发。

## 六个世界

| 入口 | 核心内容 | 教学与算法 |
| --- | --- | --- |
| **围棋学堂** | 9/13/19 路棋盘、自由人机、真人联机房间 | 50 节课程、16 套方法论棋谱、可解释的启发式算法实验室 |
| **五子棋** | 双人联机房间、独立人机练习 | 12 节课程、启发式评分、评分教学 |
| **星阵：共振计划** | 3/5/7 路 GF(2) 翻转解谜 | 12 关、高斯消元、解空间维数与最少点击搜索 |
| **扫雷实验室** | 自定义棋盘尺寸与雷数、三种难度 | 12 节课程、不偷看雷位的逻辑助手 |
| **混沌光轨实验室** | 随机运动、1–8 球碰撞、霓虹长尾、检测/预测 | 10 节视觉追踪课程、α–β、OpenCV、Kalman、Hungarian MOT，可选训练 YOLO |
| **篮球：全场掌控（V0.2）** | 2D 俯视角 3v3 人机、运球、传球、投篮、抢断、24 秒 | 8 张战术卡、投篮概率、碰撞与封盖、三档 AI 难度及暂停；**十人联机尚未实现** |

> 混沌光轨是运动与视觉算法实验项目，不是已实现多人房间的竞技游戏。浏览器演示、经典视觉检测和训练后的 YOLO 是三种不同实现，界面中会明确区分。

<p align="center">
  <img src="apps/neon-ball-lab/preview_v4_final.png" alt="混沌光轨实验室预览" width="720">
</p>

## 技术栈

- **入口网关**：Node.js 原生 `http` 服务器 + 同源反向代理 + WebSocket 升级转发（`hub/server.mjs`）
- **围棋 / 五子棋前端**：React 18 + TypeScript + Vite
- **实时对战**：Socket.IO
- **大厅、课程与星阵**：原生 HTML / CSS / JavaScript ES 模块，零前端构建依赖
- **可选视觉算法**：Python、NumPy、OpenCV、SciPy；可选 ultralytics / YOLO 训练

## 快速开始

### 环境要求

- Node.js **>= 20**，npm **>= 10**（`start.sh` 会检查）
- Linux 推荐；macOS 通常可用；Windows 建议 WSL
- 首次启动需要联网安装围棋/五子棋前端依赖
- 可选：Python 3，用于混沌光轨的本机视觉追踪

### 一键启动

```bash
git clone https://github.com/David-tiao/games.git
cd games
./start.sh
```

首次运行会：

1. 检查 Node.js 版本与 `3300` 端口；
2. 执行旧账号数据安全迁移检查（只复制，不删除）；
3. 若缺少依赖，为 `apps/go-online` 和 `apps/gomoku-online` 执行 `npm install`；
4. 构建这两个 React 客户端；
5. 启动统一大厅，并拉起内部后端。

启动后访问：

- 本机：<http://localhost:3300>
- 同一局域网的朋友：<http://你的电脑IP:3300>

如果端口被占用：

```bash
PORT=3301 ./start.sh
```

停止服务：在启动终端按 `Ctrl+C`。

### 可选的 `games` 启动命令

```bash
./scripts/install-launcher.sh
```

重新打开终端后即可用 `games` 启动大厅。它会写入 `~/.local/bin/games`，指向当前仓库的 `start.sh`。

## 开发与验证

```bash
# 语法检查
npm run check

# 全套测试（根测试 + 围棋 + 五子棋 + 星阵）
npm test

# 单独运行星阵测试（无需 npm install）
cd apps/star-array && npm test
```

如果安装了可选的 Python 追踪环境，还可以运行：

```bash
./scripts/install-ball-tracker.sh
apps/neon-ball-lab/.venv/bin/python -m pytest -q apps/neon-ball-lab/tests
```

## 可选的 Python 视觉追踪

混沌光轨默认可直接在浏览器里演示亮白核心检测 + α–β 估计，不需要 Python。若需要本机 OpenCV + Kalman + Hungarian MOT：

```bash
./scripts/install-ball-tracker.sh
```

然后按 `Ctrl+C` 停止大厅并重新运行 `./start.sh`。大厅会在检测到 `apps/neon-ball-lab/.venv/bin/python` 且依赖齐全时自动启动追踪服务。

可用环境变量：

- `BALL_PYTHON`：指定 Python 解释器路径；
- `BALL_TRACKING_MODE`：`hybrid`（默认）、`classical` 或 `yolo`；
- `CORS_ORIGINS`：限制允许访问后端 API 的来源，公网部署时应设置。

**注意**：仓库不包含训练好的 YOLO 权重。训练脚本、数据生成脚本与说明在 `apps/neon-ball-lab/` 中，需自行训练 `best.pt` 后才能启用真正的 YOLO 模式。未训练时系统会明确使用经典视觉检测，不会伪装成 YOLO。

## 项目结构

```text
games/
├── start.sh                     # 一键启动入口
├── package.json                 # 顶层脚本：check / test / build
├── hub/
│   ├── server.mjs               # 唯一对外端口、反向代理、WebSocket 转发
│   ├── public/                  # 大厅首页与全屏容器
│   └── learning/                # 五子棋、扫雷、混沌光轨课程页面
├── apps/
│   ├── go-online/               # 围棋源码 + 可选账号数据目录
│   ├── gomoku-online/           # 五子棋源码 + 可选账号数据目录
│   ├── basketball/              # 2D 篮球 3v3 / 投篮模型与战术卡
│   │   ├── engine.mjs         # 可测试的纯 JS 比赛规则
│   │   ├── game.js            # Canvas 渲染与控制
│   │   ├── style.css          # 球场界面与手机交互
│   │   └── index.html         # 篮球全屏入口
│   ├── star-array/              # GF(2) 星阵解谜
│   └── neon-ball-lab/           # 混沌光轨源码、视觉算法与训练工具
├── scripts/                     # 启动器、迁移、依赖安装脚本
├── tests/                       # 大厅与课程页面测试
├── docs/                        # 开发范围与版本规划
└── data/                        # 迁移日志（运行时生成，不入库）
```

## 数据、隐私与安全

- 账号数据保存在 `apps/go-online/server/data/users.json` 和 `apps/gomoku-online/server/data/users.json`。这些文件**不会**提交到仓库；仓库只保留 `.gitkeep` 占位文件。
- `.env` 与 `.env.*` 不会提交；`apps/go-online/.env.example` 和 `apps/gomoku-online/.env.example` 仅作为配置参考。项目通过环境变量读取配置，不会自动加载 `.env` 文件。
- 默认仅适合局域网使用。若要把 `3300` 暴露到公网，请放在 HTTPS 反向代理之后，并增加认证、访问控制与 `CORS_ORIGINS` 限制。
- 仓库不包含任何真实账号、密码哈希、API 密钥或训练好的模型权重。

## 已知限制

- 围棋与五子棋仍是两套独立账号，没有统一登录。
- 星阵的十人实时协作、服务端 7 天存档尚未实现；当前只是单人核心玩法。
- 篮球 V0.2 当前是 3v3 本地 AI 比赛，不能与朋友实时对战；未来再做联网与服务端比赛。
- 混沌光轨的 100 分评分针对 #1 球的单目标评估，不是完整的 MOT 指标。
- 所有 AI/老师提示均为启发式规则，不代表胜率或职业级最优变化。
- 扫雷逻辑助手不会读取隐藏雷位，只基于已揭开的格子做约束推断。

## 版本历史

- **V1.5（篮球 V0.2）**：球员碰撞分离、近身时机封盖、抛物线及光效、篮板计时 14/24 秒、三档 AI 难度、暂停和终场出手规则。

- **V1.4（篮球预览）**：新增《篮球：全场掌控》2D 3v3 人机、投篮概率和战术卡；不包含十人联网。

- **V1.3**：扫雷支持三种棋盘分别自定义雷数；保留全屏布局与课程。
- **V1.2**：混沌光轨 V4.1 合并、10 节视觉追踪学院、可选 Python 同域代理、追踪会话隔离。
- **V1.1**：沉浸式全屏与算法面板抽屉。
- **V1.0**：四款游戏初次统一。

## License

本仓库未指定开源许可证。若需分发或二次开发，请先补充合适的 LICENSE 文件。
