# Git Worktree Manager - 快速启动指南

## 🚀 快速开始

### 前置要求
- Node.js 18+
- Git 2.30+
- VS Code 或 JetBrains IDE

### 1. 安装依赖

```bash
# 安装所有依赖
npm install

# 构建核心模块
npm run build:core
```

### 2. 开发 VS Code 插件

#### 方式一：监视模式（推荐）
```bash
# 启动监视模式 - 自动重新编译
npm run dev:vscode

# 在另一个终端，启动 VS Code 开发实例
code --extensionDevelopmentPath=./plugins/vscode
```

#### 方式二：手动编译
```bash
# 编译插件
npm run compile:vscode

# 启动 VS Code 开发实例
code --extensionDevelopmentPath=./plugins/vscode
```

### 3. 开发 JetBrains 插件

```bash
# 启动 IntelliJ IDEA 沙盒实例
npm run dev:jetbrains
```

或者直接在 JetBrains 插件目录中操作：

```bash
cd plugins/jetbrains
./gradlew runIde
```

## 📦 打包发布

### VS Code 插件

```bash
# 打包为 .vsix 文件
npm run package:vscode

# 文件将生成在 plugins/vscode/*.vsix
```

### JetBrains 插件

```bash
cd plugins/jetbrains
./gradlew buildPlugin

# 文件将生成在 plugins/jetbrains/build/distributions/*.zip
```

## 🧪 测试

```bash
# 运行核心模块测试
npm run test:core

# 运行所有测试
npm test
```

## 📝 项目结构

```
GitWorktreeGUI/
├── packages/core/          # 核心功能模块 (TypeScript)
│   ├── src/               # 源代码
│   └── dist/              # 编译输出
├── plugins/
│   ├── vscode/            # VS Code 插件
│   │   ├── src/           # TypeScript 源代码
│   │   └── out/           # 编译输出
│   └── jetbrains/         # JetBrains 插件
│       └── src/main/kotlin/  # Kotlin 源代码
├── spec/fixtures/         # 测试夹具
└── .github/workflows/     # CI/CD 配置
```

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `npm install` | 安装所有依赖 |
| `npm run build:core` | 构建核心模块 |
| `npm run dev:vscode` | 启动 VS Code 插件开发模式 |
| `npm run compile:vscode` | 编译 VS Code 插件 |
| `npm run package:vscode` | 打包 VS Code 插件 |
| `npm run dev:jetbrains` | 启动 JetBrains 插件开发 |
| `npm test` | 运行测试 |

## 🐛 调试

### VS Code 插件调试

1. 在 VS Code 中打开项目
2. 按 F5 启动调试会话
3. 将自动打开新的 VS Code 实例并加载插件

### JetBrains 插件调试

1. 在 IntelliJ IDEA 中打开 `plugins/jetbrains`
2. 运行 "Run Plugin" 配置
3. 将打开沙盒 IDE 实例

## ❓ 常见问题

### 1. npm run dev:vscode 报错 "No workspaces found"

确保已经构建核心模块：
```bash
npm run build:core
```

### 2. TypeScript 编译错误

确保依赖已安装：
```bash
cd plugins/vscode && npm install
cd ../.. && npm run build:core
```

### 3. JetBrains 插件构建失败

确保已安装 JDK 17+：
```bash
java -version  # 应该显示 17 或更高版本
```

## 📚 更多资源

- [完整文档](README.md)
- [开发计划](TODO_CC.md)
- [VS Code 插件文档](plugins/vscode/README.md)
- [JetBrains 插件文档](plugins/jetbrains/README.md)

---

*Happy Coding! 🎉*