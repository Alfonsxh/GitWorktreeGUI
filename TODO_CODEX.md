# TODO（JetBrains 插件 + VS Code 插件）

> 目标：基于 PRD，实现跨平台 git worktree GUI，分别作为 JetBrains/VS Code 插件发布。此文档给出可执行的开发与发布流程、时间线与任务清单。

## 0. 快速开始（环境与工具）

- 系统：macOS/Windows/Linux（开发建议 macOS/Linux，CI 统一跑 Linux）
- Git：`git >= 2.39`（需支持 `git worktree` 全量子命令）
- Node.js：`LTS 18/20`，包管理器任选 `npm`/`pnpm`/`yarn`
- VS Code 工具：`vsce`、`ovsx`（本地可用 npx 调用）
- JDK：`17`（JetBrains 插件要求），Gradle Wrapper 由工程自带
- IDE：IntelliJ IDEA（Community/Ultimate 用于开发与调试插件）、VS Code（用于调试扩展）

```bash
# 版本检查
node -v
npm -v
java -version
git --version

# 可选安装打包工具
npm i -g @vscode/vsce ovsx
```

## 1. Monorepo 结构规划

```
./
├─ PRD.md
├─ TODO_CODEX.md  ← 本文件
├─ docs/                       # 架构、UI 规范、发布说明
├─ spec/                       # 统一规格与夹具（git 输出样本与黄金 JSON）
│  ├─ fixtures/
│  │  ├─ worktree-list/basic.txt
│  │  ├─ worktree-list/locked.txt
│  │  ├─ worktree-list/detached-head.txt
│  │  └─ ...
│  └─ expected/
│     └─ worktree-list/*.json
├─ core/                      # 核心逻辑/薄 CLI（Node/TS，输出 JSON，供双端复用）
├─ plugins/
│  ├─ vscode/                 # VS Code 插件源码
│  └─ jetbrains/              # JetBrains 插件源码（Kotlin）
├─ assets/                    # 图标等共享资源
└─ .github/workflows/         # CI pipelines（vscode.yml, jetbrains.yml, release.yml）
```

## 2. 统一规格（两端共用）

- 数据模型
  - Worktree: `{ path: string, branch?: string, head?: string, locked: boolean }`
  - Repo: `{ rootPath: string, defaultBranch?: string, status?: { dirty: boolean, ahead?: number, behind?: number } }`
- 命令映射
  - 列表：`git worktree list --porcelain`
  - 创建：`git worktree add <path> <branch>` 或 `git worktree add -b <newBranch> <path>`
  - 删除：`git worktree remove <path>`
  - 锁定：`git worktree lock|unlock <path>`
  - 合并：`git -C <targetPath> merge <sourceBranch>`
  - 预检：`git -C <path> status --porcelain -b`
- 解析规范
  - 以 `--porcelain` 输出为准；跨平台换行处理；Windows 路径空格需谨慎传参
  - `branch refs/heads/<name>` → 提取 `<name>`；`HEAD <sha>` 保留 40/7 字符形式
- 夹具
  - 在 `spec/fixtures` 放置各类输出样例（含 locked、detached HEAD、无分支、超长路径等）及黄金 JSON，双端单测读取并断言一致性

### 2.1 核心模块/CLI（来自 TODO_CC 的可取点）

- 目标：提供统一的 `list/add/remove/lock/unlock/merge` 能力，输出 JSON，便于双端保持一致行为与错误处理。
- 形态：
  - 短期：`core/` 以 Node/TypeScript 实现为“薄 CLI”（通过命令行返回 JSON），VS Code 直接 import 使用，JetBrains 可先保留直接 `git` 路径，后续切换为调用 CLI；
  - 中期：如需去 Node 依赖，可以 Go/Rust 重写 CLI 并保持相同 JSON 契约。
- 测试：Jest 单测读取 `spec/fixtures` 与 `expected` 断言解析与指令编排一致。

## 3. 开发流程与规范

- 分支策略：
  - `main`（稳定分支）、`feat/*`（功能）、`fix/*`（修复）、`chore/*`
- Commit 规范：Conventional Commits（如 `feat(vscode): add worktree list`）
- 代码规范：
  - VS Code 端：TypeScript/ESLint（或零依赖 JS 起步，后续迁移 TS）
  - JetBrains 端：Kotlin + ktlint（或官方建议的格式化）
- 日志与错误：
  - VS Code：`OutputChannel` 名称 `Worktrees`
  - JetBrains：`Logger.getInstance("Worktrees")`，耗时操作使用 `Task.Backgroundable`
- 隐私：不收集代码/仓库内容；错误仅本地展示，可复制命令

## 4. VS Code 插件任务分解

1) 脚手架与视图
- 初始化 `plugins/vscode/`（`package.json`、`extension.ts|js`、`media/` 图标）
- `viewsContainers`+`views` 创建 Activity Bar 容器与 TreeView
- `TreeDataProvider` 展示：仓库 → worktrees（路径/分支/HEAD/锁定）

2) Git/核心封装
- 优先调用 `core/` 核心（可直接 import 或通过 CLI 调用）；如不可用则回退 `execFile('git', ...)`（超时/Windows 引号/UTF-8）
- 解析 `--porcelain` 输出为 Worktree[]（单测完善）

3) 核心操作
- Add：表单（使用已有分支/新建分支）→ `git worktree add`
- Remove：二次确认 → `git worktree remove`
- Lock/Unlock：`git worktree lock|unlock`
- Merge：QuickPick 源分支/源 worktree → 预检 status → 执行 `merge` → 冲突交由内置 Merge 编辑器

4) 状态栏与快捷键（来自 TODO_CC 的可取点）
- 状态栏：显示当前活动 worktree/分支，点击弹出最近 worktree 快速切换列表
- 快捷键：
  - 快速切换到最近 worktree（如 `worktrees.quickSwitch`）
  - 在当前 worktree 打开终端
  - 将当前 worktree 加入/移出工作区

5) 终端与工作区
- `window.createTerminal({ cwd })` 打开终端标签
- `workspace.updateWorkspaceFolders` 把 worktree 加入多根工作区

6) 打开能力补全（来自 TODO_CC 的可取点）
- 在文件管理器中显示：`revealFileInOS` 或 `vscode.env.openExternal(Uri.file(path))`
- 在 IDE 中定位：聚焦 Explorer 并选中该 worktree 路径

7) 测试与打包
- 单测：解析函数、命令参数编排；可用 Jest/Node 原生断言
- 构建：采用 esbuild/vite 打包扩展，提升构建与调试效率
- `vsce package` 本地打包 VSIX

8) Webview 仪表盘（增强，来自 TODO_CC 的可取点）
- 提供可选的 Dashboard Webview（React 可选），承载批量操作与冲突概览；MVP 可先占位

9) 文档与本地化
- README：功能说明、命令映射、隐私声明
- 国际化：先中英硬编码，后期抽取 i18n

## 5. JetBrains 插件任务分解

1) 脚手架与 Tool Window
- 初始化 `plugins/jetbrains/`，使用 `gradle-intellij-plugin`
- `plugin.xml` 注册 ToolWindow、依赖 `git4idea`、`org.jetbrains.plugins.terminal`
- ToolWindow UI：表格/树 + 工具栏（Add/Remove/Lock/Unlock/Merge/Refresh）

2) Git 执行与解析
- `GeneralCommandLine(git, ...)` + `CapturingProcessHandler`
- 解析 `--porcelain` 输出为 Worktree[]（Kotlin 单测读取 `spec/fixtures`）

3) 核心操作
- Add/Remove/Lock/Unlock 与 VS Code 对齐
- Merge：预检（`git status --porcelain -b`）→ `merge`；冲突交给 IDE Merge 工具

4) 状态栏与快捷键（来自 TODO_CC 的可取点）
- 状态栏 Widget：显示活动 worktree/分支，点击/快捷键快速切换
- 快捷键：提供默认 Keymap（如 `Ctrl/Cmd+Alt+W` 打开切换面板）
- 打开能力：在文件管理器中显示/在 Project View 中定位

5) 终端与设置
- 终端：`TerminalView.getInstance(project).createLocalShellWidget(cwd, title)`
- 设置：`PersistentStateComponent`（默认 shell、刷新节流）

6) 测试与打包
- 单测：解析、参数编排
- 运行与打包：`./gradlew runIde`、`./gradlew buildPlugin`、`./gradlew verifyPlugin`

6) 文档与本地化
- README：使用说明、快捷方式、隐私声明
- 国际化：后续抽取资源 Bundle

## 6. CI 与质量保障

- GitHub Actions（建议三个工作流）
  - `ci-vscode.yml`：Node 版本矩阵 → 安装 → 测试 → `vsce package` 产物上传
  - `ci-jetbrains.yml`：Set up JDK 17 → `./gradlew test buildPlugin verifyPlugin`，产物上传
  - `release.yml`：基于 tag 触发，调用发布任务（见发布流程）
- 如启用 `core/`：新增 `ci-core.yml` 执行 Node 测试与构建（Jest + esbuild）
- Lint/格式化：ESLint/ktlint 可选；PR 必须通过 CI
- 夹具驱动：两端测试共同读取 `spec/fixtures` 并断言与 `expected/` 等价

## 7. 发布流程（Marketplace）

### 7.1 VS Code（Visual Studio Marketplace + Open VSX）

先备好：
- 账号与 Publisher（如 `your-name`）
- Tokens：VS Marketplace PAT、Open VSX PAT（CI 中以密钥保存）

版本与打包：
```bash
# 提前更新 plugins/vscode/package.json 的 version 与 CHANGELOG.md
cd plugins/vscode
npm ci  # 或 pnpm i / yarn
npx vsce package                        # 生成 *.vsix
npx vsce publish                        # 发布到 VS Marketplace（需 VSCE_PAT）
npx ovsx publish -p $OVSX_PAT           # 发布到 Open VSX（可选）
```

CI 发布（示例步骤）：
- 触发条件：`git tag vX.Y.Z` 推送
- 任务：安装依赖 → 构建 → `vsce package` → `vsce publish` 与 `ovsx publish`
- 产出：已发布扩展；同时将 VSIX 附件上传到 GitHub Release

### 7.2 JetBrains Marketplace

先备好：
- JetBrains Hub Token（`ORG_GRADLE_PROJECT_intellijPublishToken`）
- 插件签名（如需）：证书链 `.pem` + 私钥 `.key`（`signPlugin` 用）

构建与发布：
```bash
cd plugins/jetbrains
./gradlew buildPlugin verifyPlugin       # 产物在 build/distributions/*.zip
# 本地调试
./gradlew runIde
# 发布（需要配置 intellij.publish.token 或环境变量）
./gradlew publishPlugin
```

`build.gradle.kts` 关键配置（示意）：
```kotlin
intellij {
  version.set("2024.1")
  plugins.set(listOf("git4idea", "terminal"))
}
// 发布
publishPlugin {
  token.set(System.getenv("INTELLIJ_PUBLISH_TOKEN"))
}
```

CI 发布（示例步骤）：
- 触发条件：`git tag vX.Y.Z`
- 任务：`setup-java@v4 (17)` → `./gradlew buildPlugin verifyPlugin publishPlugin`
- 产出：Marketplace 新版本；将 ZIP 附件上传 GitHub Release

## 8. 里程碑与时间线（10–12 天）

- Day 1：统一规格与夹具（`spec/*`），初始化双端骨架与 CI pipeline
- Day 1.5：M0.5 核心模块/CLI 雏形（`core/`：list/parse；VS Code 侧接入）
- Day 2–3：VS Code/JetBrains 同步实现：TreeView/ToolWindow + 列表解析 + 刷新
- Day 4–5：Add/Remove/Lock/Unlock（表单/确认/错误处理）+ 单测 80% 覆盖
- Day 6：终端集成（两端）与设置项 + 状态栏与快捷键（VS Code/JetBrains）
- Day 7–8：Merge 预检与执行，冲突引导；集成测试（临时仓库）
- Day 9：性能与 UX 打磨（懒加载/节流、日志与提示）+ VS Code Webview 仪表盘占位
- Day 10–12：打包与签名、商店元数据、首次发布（内测通道）

## 9. 风险与缓解

- Worktree API 支持有限 → 统一走 Git CLI + `--porcelain`，两端各自封装
- Windows 路径与引号 → `execFile`/`GeneralCommandLine`，参数严格转义，夹具覆盖
- 大仓库性能 → 懒加载、手动刷新、后台任务与节流
- 合并冲突体验 → 不自研冲突解决器，调用 IDE 原生能力
- 权限/沙箱 → 操作前检测可写性；错误提供“复制命令”与“在终端重试”

## 10. 验收标准

- 一致性：双端字段与行为一致，命令映射一致
- 稳定性：无 Git 可执行/权限异常时有明确提示与自检
- 性能：中型仓库列表刷新 < 1s；所有命令在后台任务可取消
- 安全与隐私：不收集代码与仓库数据；危险操作需二次确认
- 可维护：核心逻辑单测 ≥ 80%；CI 全绿；文档完整

## 11. 任务清单（可勾选）

- [ ] 初始化 monorepo 目录（plugins/{vscode,jetbrains}, spec, docs, assets, .github/workflows）
- [ ] 规格与夹具：提交 `spec/fixtures` 与对应 `expected/*.json`
- [ ] VS Code：创建骨架（`package.json`、`extension.ts|js`、视图/命令注册）
- [ ] VS Code：`execGit` 封装与解析单测
- [ ] VS Code：列表/刷新/错误提示
- [ ] VS Code：Add/Remove/Lock/Unlock（含二次确认）
- [ ] VS Code：终端与 Add to Workspace
- [ ] VS Code：Merge（预检 + 执行 + 冲突引导）
- [ ] VS Code：状态栏（当前 worktree/分支）与快捷键（快速切换/开终端）
- [ ] VS Code：打开能力（文件管理器/在 IDE 中定位）
- [ ] VS Code：Webview 仪表盘（占位）
- [ ] VS Code：构建改用 esbuild/vite
- [ ] VS Code：README 与图标、`vsce package`
- [ ] JetBrains：创建骨架（gradle-intellij、plugin.xml、ToolWindow）
- [ ] JetBrains：`WorktreeService` 与解析单测
- [ ] JetBrains：列表/刷新/错误提示
- [ ] JetBrains：Add/Remove/Lock/Unlock
- [ ] JetBrains：终端集成与设置
- [ ] JetBrains：状态栏 Widget 与快捷键、在文件管理器/Project View 中定位
- [ ] JetBrains：Merge（预检 + 执行 + 冲突引导）
- [ ] JetBrains：`buildPlugin/verifyPlugin` 通过
- [ ] CI：Node + Gradle 两条流水线
- [ ] 发布：VS Code Marketplace + Open VSX（PAT 配置）
- [ ] 发布：JetBrains Marketplace（Token/签名配置）
- [ ] 首次内测发布与反馈收集

### 核心模块/CLI（新增）
- [ ] 初始化 `core/`（TypeScript）：命令契约与数据模型
- [ ] `list`/`add`/`remove`/`lock`/`unlock`/`merge` 实现（输出 JSON）
- [ ] 读取 `spec/fixtures` 的解析单测（Jest）
- [ ] VS Code 接入 `core/`（import 或 CLI 调用）；JetBrains 后续接入

## 12. 附：脚手架命令片段（落地时参考）

### VS Code（零依赖 JS 起步）
```bash
mkdir -p plugins/vscode && cd $_
cat > package.json <<'JSON'
{ "name":"git-worktrees","displayName":"Git Worktrees","version":"0.0.1","publisher":"your-name","engines":{"vscode":"^1.85.0"},"activationEvents":["onStartupFinished","onView:worktreesView"],"main":"./extension.js","contributes":{"viewsContainers":{"activitybar":[{"id":"worktrees","title":"Worktrees","icon":"media/worktrees.svg"}]},"views":{"worktrees":[{"id":"worktreesView","name":"Worktrees"}]},"commands":[{"command":"worktrees.refresh","title":"Refresh Worktrees"}]}}
JSON
mkdir -p media
```

### JetBrains（Gradle IntelliJ）
```bash
mkdir -p plugins/jetbrains && cd $_
cat > settings.gradle.kts <<'KTS'
rootProject.name = "git-worktrees"
KTS
cat > build.gradle.kts <<'KTS'
plugins {
  kotlin("jvm") version "1.9.24"
  id("org.jetbrains.intellij") version "1.17.2"
}
repositories { mavenCentral() }
dependencies { }
intellij { version.set("2024.1"); plugins.set(listOf("git4idea","terminal")) }
tasks.runIde { }
KTS
```

— 以上为落地执行蓝图，建议先从“规格与夹具 + 双端骨架”开始推进，并在 CI 中集成基本构建与打包。
