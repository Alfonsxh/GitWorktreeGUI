# Git Worktree GUI Manager

一个简单实用的 Git Worktree 图形化管理工具，专为 AI 编程工具设计。

## 功能特性

- 🗂 **Worktree 管理**：可视化管理所有 Git worktree
- 💻 **集成终端**：每个 worktree 自动打开对应目录的终端
- ➕ **快速创建**：一键创建新的 worktree，自动生成规范目录名
- 🗑 **便捷删除**：右键删除 worktree
- 🔄 **实时刷新**：随时刷新 worktree 列表

## 快速开始

### 安装依赖

```bash
npm install
```

### 重建原生模块

```bash
npx electron-rebuild
```

### 开发模式

```bash
npm run dev    # 监听文件变化
npm start      # 启动应用
```

### 构建运行

```bash
npm run electron  # 构建并启动
```

## 使用说明

1. 点击 "Open Project" 选择 Git 仓库
2. 左侧显示所有 worktree 列表
3. 点击 worktree 切换，右侧终端自动切换到对应目录
4. 点击 "New Worktree" 创建新的 worktree
5. 右键点击 worktree 可以删除（主 worktree 无法删除）

## 目录结构

```
GitWorktreeGUI/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 主进程入口
│   │   ├── git.ts      # Git 操作封装
│   │   ├── terminal.ts # 终端管理
│   │   └── preload.ts  # 预加载脚本
│   ├── renderer/       # 渲染进程
│   │   ├── App.tsx     # 主应用组件
│   │   └── components/ # UI 组件
│   └── shared/         # 共享类型定义
├── dist/               # 构建输出
└── package.json
```

## Worktree 目录命名规则

创建的 worktree 会自动放在项目父目录，命名格式：
`.worktree_[项目名]_[分支名]`

例如：
- `feature/auth` → `.worktree_MyProject_feature_auth`
- `bugfix/issue-123` → `.worktree_MyProject_bugfix_123`

## 技术栈

- Electron 30
- React 19
- TypeScript
- xterm.js (终端集成)
- node-pty (终端进程管理)

## 注意事项

- 需要 macOS 系统
- 需要安装 Git
- 使用代理时设置: `npm config set proxy http://127.0.0.1:1097`

## License

ISC