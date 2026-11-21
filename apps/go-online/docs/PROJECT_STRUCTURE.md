# 围棋学堂 · 工程结构与开发说明

当前版本 V4.3 在 V4.2 上增加了中英文切换，不更改围棋规则、真人房间协议和已有课程的练习目标。

```text
go-online/
├── client/                     前端：React + TypeScript + Vite
│   ├── index.html              网页基础入口
│   ├── package.json            前端依赖及构建脚本
│   ├── vite.config.ts          Vite 配置
│   └── src/
│       ├── main.tsx            React 和 LanguageProvider 启动
│       ├── App.tsx             登录、大厅、人机与真人对局界面
│       ├── academy/
│       │   └── Academy.tsx     独立的十五课训练营
│       ├── components/
│       │   └── GoBoard.tsx     SVG 围棋棋盘和交互
│       ├── i18n/
│       │   ├── index.tsx       语言状态、语言偏好持久化
│       │   ├── translations.ts 通用 UI、状态信息、实时教练文案翻译
│       │   └── lessons.ts      十五课英文教学讲义
│       ├── lib/
│       │   ├── api.ts          HTTP API 调用
│       │   ├── socket.ts       Socket.IO 客户端
│       │   └── localGo.ts      本地 AI 练习状态和回合逻辑
│       ├── styles.css          古风主题、响应式布局、左右切换样式
│       └── types.ts            TypeScript 数据模型
├── server/                     Node.js/Express/Socket.IO 后端
│   ├── src/
│   │   ├── index.js            服务器入口、登录 API、实时事件
│   │   ├── auth.js             账号及登录验证
│   │   └── roomManager.js      真人房间状态、合法落子和同步
│   └── data/                   后端运行时账号数据
├── shared/                     前后端共用围棋规则和教学逻辑
│   ├── goRules.js              气、提子、劫争、虚手、数目
│   ├── goCoach.js              局势分析和启发式推荐
│   ├── goLessons.js            十五节课原始目标与预设棋形
│   ├── goLessons.d.ts          课程 TypeScript 类型声明
│   ├── goCoach.d.ts            教练 TypeScript 类型声明
│   ├── goRules.d.ts            规则 TypeScript 类型声明
│   └── protocol.ts             通信类型
├── tests/                      规则、AI、课程、房间、布局、语言资源测试
├── scripts/                    Linux 辅助脚本
├── start.sh                    一键构建和启动
├── package.json                根工作区脚本和依赖
└── README.md                   安装、使用说明和版本记录
```

## 数据流

- **人机**：`App.tsx` 或 `Academy.tsx` → `lib/localGo.ts` → `shared/goRules.js` / `shared/goCoach.js`。
- **真人**：`App.tsx` → `lib/socket.ts` → `server/src/index.js` → `server/src/roomManager.js` → `shared/goRules.js`。
- **十五课内容**：`shared/goLessons.js` 保存原始课程局面与判定；`client/src/i18n/lessons.ts` 保存英文讲义。它们共享课程 id，不改变棋形。
- **语言切换**：`LanguageProvider` 提供 `lang` 与 `tr`，更改浏览器本地语言偏好，不向服务器发送不同的围棋协议。

## 主要开发入口

- 修改课程任务、目标和预设棋形：`shared/goLessons.js`
- 修改英文课程解释：`client/src/i18n/lessons.ts`
- 修改中英文 UI 文案：`client/src/i18n/translations.ts`
- 修改棋盘、棋子绘制：`client/src/components/GoBoard.tsx`
- 修改整体美术、布局：`client/src/styles.css`
- 修改围棋教练打分：`shared/goCoach.js`
- 修改落子与数目规则：`shared/goRules.js`（修改后务必跑测试）
- 修改房间和联网逻辑：`server/src/roomManager.js`、`server/src/index.js`

## 命令

```bash
./start.sh        # Linux：构建并启动 3100 端口
npm test          # 自动化测试
npm run build     # 前端 TypeScript 类型检查及 Vite 构建
```

## Important note (English)

The bilingual UI translates visible teaching content without changing move legality, AI choices, saved lesson progress, room authentication, or Socket.IO messages. Locale preferences are stored per browser. Some uncommon server error messages may still appear in Chinese until the server error catalog is localized.


## V4.4 新模块

- `shared/goLessonsAdvanced.js`：第 16–50 课，包含中文与英文讲解、训练棋形及关键落点；原 1–15 课仍在 `shared/goLessons.js` 中。
- `shared/goMethodology.js`：16 个原创教学棋谱以及 `methodBoardAt`、`methodToSgf`，回放使用真实的 `tryMove` 规则。
- `client/src/methodology/Methodology.tsx`：方法论独立入口、分类目录、棋谱步进和 SGF 复制。
- `client/src/academy/Academy.tsx`：9/13/19 路训练，按卷筛选，兼容旧 15 课浏览器进度。
