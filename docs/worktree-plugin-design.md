# JetBrains Worktree 插件详细设计方案

## 1. 项目背景与目标
- 背景：现有 Git 管理窗口缺乏针对 `git worktree` 的可视化与生命周期操作，团队希望以 JetBrains 系 IDE 插件形式提供统一工作树体验。
- 目标：
  - 在 Git 工具窗口新增 `Worktree` 标签页，专注展示与管理工作树。
  - 无缝复用 IDE Git 服务（`git4idea`）、终端组件，减少重复造轮子。
  - 以可配置的路径策略自动创建工作树目录，支持全生命周期操作与终端联动。
  - 保证 PyCharm、PyCharm CE、GoLand 等 IDE 的一致行为。
- 非目标：
  - 不修改官方 Git 分支/日志 UI；
  - 不承担 Git 凭证/代理配置；
  - 不覆盖团队已有的 worktree CLI 脚本（可集成调用）。

## 2. 用户角色与核心场景
| 角色 | 核心诉求 | 典型场景 |
| --- | --- | --- |
| 后端/客户端开发者 | 快速为特性分支创建隔离工作区 | 在 PyCharm 中右键分支 → Add Worktree → 自动打开终端开始开发 |
| 项目维护者 | 清理废弃/冲突的工作树，保持仓库整洁 | 检测脏工作树，执行 Lock/Remove/Prune |
| DevOps/CI 支持 | 统一配置路径命名、清理策略 | 通过 Settings 调整模板和保护规则 |

## 3. 功能需求细化
### 3.1 标签页结构
```
╔════════ Git Tool Window ════════╗
║ Local Changes | Log | Console | **Worktree** | ...        ║
╠═════════════════════════════════╣
║ 工具栏: [+] Add | ⟳ Refresh | ⚙ Settings                      ║
║ ─────────────────────────────────────────────────────────── ║
║ Repositories                                                   ║
║   repo-a (/Users/.../repo-a)
║     Worktrees
║       • master → ../.worktree_repo-a_master          [⋮]
║       • feature/login → ../.worktree_repo-a_feature-login [⋮]
║     (No other worktrees 提示)
║                                                              ║
║ 详情面板: 状态徽章 | 最近操作 | 快速终端按钮                      ║
╚══════════════════════════════════╝
```
- 工具栏按钮：
  - `Add`：打开创建对话框。
  - `Refresh`：触发重新扫描工作树信息。
  - `Settings`：跳转插件配置页面。
- 详情面板：显示 `branch`, `path`, `HEAD`, `locked`, `dirty`, `lastUsed`, `lastCommand` 等信息。

### 3.2 节点右键菜单
| 节点类型 | 菜单项 | 描述 |
| --- | --- | --- |
| 仓库节点 | Add Worktree | 触发创建流程 |
| 工作树节点 | Open in Terminal | 新建或聚焦终端并 `cd` |
|  | Checkout in IDE | 打开或切换到对应目录 |
|  | Pull / Push / Fetch | 转发至 `git4idea` 标准操作 |
|  | Lock / Unlock | 执行 `git worktree lock --reason` / `unlock` |
|  | Remove | `git worktree remove`，可选保留目录 |
|  | Prune Detached | `git worktree prune` |
|  | Reveal in Finder | 调用 `Desktop.getDesktop().open()` |
|  | Copy Path / Copy Branch | 复制到剪贴板 |
|  | Rename Display Name | 只影响 UI 展示 |

### 3.3 工作树创建对话框
- 字段：
  - 目标仓库（自动填充）
  - 分支选择器（支持新建分支）
  - 目录预览（根据模板展示结果）、自定义按钮
  - 选项：`创建后打开终端`、`创建后在 IDE 中打开`
  - 错误提示：目录存在、分支非法、Git 命令失败
- 路径模板默认值：`../.worktree_${REPO}_${BRANCH}`
- 冲突解决：若路径存在，附加 `_1`, `_2`...

## 4. 技术架构
```
+---------------------------+
| WorktreeToolWindowFactory |
+-------------+-------------+
              |
              v
+---------------------------+            +---------------------------+
| WorktreePanel (UI)        |<---------->| WorktreeService           |
| - Tree                    |    data    | - cache state             |
| - DetailView              |            | - git command gateway     |
+-------------+-------------+            +-------------+-------------+
              |                                      |
              v                                      v
   +-------------------+               +---------------------------+
   | WorktreeActions   |-------------->| GitGateway (git4idea/CLI) |
   +---------+---------+               +-------------+-------------+
             |                                        |
             v                                        v
   +-------------------+               +---------------------------+
   | TerminalGateway   |               | Settings / PersistentState|
   +-------------------+               +---------------------------+
```
- `WorktreeService`
  - 实现 `ProjectComponent`
  - 维护 `MutableStateFlow<List<WorktreeDescriptor>>`
  - 监听 `GitRepositoryChangeListener`, `.git/worktrees` 目录变更
  - 提供 CRUD 方法：`addWorktree()`, `remove()`, `lock()`, `prune()`, `refresh()`
- `GitGateway`
  - 首选 `git4idea.commands.Git#getInstance()`
  - 当 API 缺口（如 lock 未封装）时，调用 `GeneralCommandLine` 运行 CLI
  - 统一返回 `GitCommandResultWrapper`（含 stdout/stderr/exitCode）
- `TerminalGateway`
  - 适配 `TerminalToolWindowManager` (<2025.2) 与 `TerminalView` (>=2025.2)
  - 方法：`open(path: Path, focus: Boolean = true, preset: String? = null)`
- `Settings` (应用级 + 项目级)
  - `WorktreeSettingsState` (`PersistentStateComponent`)
  - 字段：`pathTemplate`, `autoOpenTerminal`, `autoOpenProject`, `confirmDangerOps`, `pruneThresholdDays`, `terminalCommandTemplate`
  - 提供 `Configurable` UI，支持模板变量校验。

## 5. 数据模型
```kotlin
@Serializable
data class WorktreeDescriptor(
    val id: String,                     // repoName + branch + path hash
    val repository: GitRepository,
    val branchName: String,
    val path: Path,
    val headRevision: String?,
    val locked: Boolean,
    val lockReason: String?,
    val dirty: Boolean,
    val lastUsed: Instant?,
    val displayName: String? = null
)
```
- `dirty` 通过 `VcsDirtyScopeManager` 或 `git status --porcelain` 判定。
- 缓存：使用 `ConcurrentHashMap<String, WorktreeDescriptor>`，刷新增量更新。

## 6. 关键流程
### 6.1 Add Worktree
1. 用户点击 `+` 或右键仓库节点 → `AddWorktreeAction`。
2. 弹出对话框，用户选择分支/新建分支 → 即时校验。
3. 根据模板生成路径 → 冲突处理。
4. `Task.Backgroundable` 调用 `git worktree add <path> <branch>`；
   - 成功：`WorktreeService.refresh()` → 选中新增节点 → 若勾选自动打开终端/IDE，依次执行。
   - 失败：解析 `GitCommandResult`，通过 `NotificationGroup` 弹窗并附调试日志。

### 6.2 Open in Terminal
1. 用户右键工作树节点 → `OpenInTerminalAction`。
2. `TerminalGateway` 检测是否已有匹配标签（依据工作树路径）。
3. 若无 → 创建新标签，执行 `cd "path"` + 可选自定义命令。
4. 聚焦终端，记录 `lastUsed` 时间。

### 6.3 Remove / Prune
- Remove：
  1. 弹出确认对话框（显示路径、锁状态、是否保留目录）。
  2. 执行 `git worktree remove <path>`；若锁定则先 `unlock`。
  3. 成功后刷新 UI；若用户选择保留目录则仅 `git` 清理。
- Prune：
  - 执行 `git worktree prune --dry-run` 提示后再执行真实命令。

## 7. 刷新与事件监听
- 启动时调用 `refresh()`。
- 注册以下事件：
  - `messageBus.connect(project).subscribe(GitRepository.GIT_REPO_CHANGE, listener)`
  - `VirtualFileManager` 监听 `.git/worktrees` 变动
  - 定时器：每 10 分钟刷新一次，用户可在设置中关闭。
- 刷新策略：后台任务执行 `git worktree list --porcelain`，解析并与缓存比对，增量更新 UI。

## 8. 终端兼容细节
| IDE 版本 | API | 处理 |
| --- | --- | --- |
| <= 2025.1 | `TerminalToolWindowManager`, `LocalTerminalCustomizer` | 使用旧 API 创建 `ShellTerminalWidget` |
| >= 2025.2 | `com.intellij.terminal.ui.TerminalView` | 通过 `TerminalView#createLocalShellWidget`，支持 Reworked Terminal |
- 检测方式：运行时通过 `ApplicationInfo.getInstance().build.baselineVersion`。
- 终端缺失：若 `PluginManagerCore.isDisabled("org.jetbrains.plugins.terminal")` → 弹窗提示启用。

## 9. 配置模板语法
- 占位符：
  - `$REPO` → 仓库目录名
  - `$BRANCH` → 分支名（非 ASCII 转换为 `_`）
  - `$DATE` → `yyyyMMdd`
  - `$TIME` → `HHmmss`
  - `$COUNTER` → 冲突时自增数字
- 示例：`../.worktree_$REPO_$BRANCH`
- 验证：使用正则 `^[\w./\-$]+$`，防止危险字符。

## 10. 错误处理与通知
- 定义 `NotificationGroupManager.getInstance().getNotificationGroup("Worktree")`
- 统一异常：
  - Git 命令失败 → `ERROR` 通知 + “查看日志”操作。
  - 路径冲突 → `WARNING` 通知 + “自定义目录”按钮。
  - 锁定删除 → `WARNING` 提醒先解锁。
- 日志：`Logger.getInstance("WorktreePlugin")`，记录命令、耗时、结果。

## 11. 性能与资源
- `git worktree list` 仅在后台执行，避免阻塞 EDT。
- 缓存工作树信息，UI 更新通过 `invokeLater`。
- 控制终端标签数量：若用户连续打开多个工作树，可提示“复用已有终端”。

## 12. 安全与权限
- 所有命令依赖用户当前 Git 配置，不触碰凭证存储。
- 操作目录位于用户可写区域，执行前确认不在仓库根内覆盖。
- 记录敏感路径时遵守 IDE 日志脱敏规则（隐藏用户名，可配置）。

## 13. 测试策略
- 单元测试：
  - 模板解析、路径生成、特殊字符处理。
  - `WorktreeDescriptor` 解析 mock 输出。
- 集成测试：
  - 使用 `LightPlatformCodeInsightFixtureTestCase` 模拟项目。
  - 验证工具窗口加载、菜单触发、状态刷新。
- 端到端脚本：
  - 使用真实仓库样本（含多分支、锁定状态）在 PyCharm/GoLand 运行。
- 手动测试清单：
  - Add/Remove/Lock/Unlock、终端打开、路径冲突、插件禁用终端等。

## 14. 构建与发布
- 工程结构：
  - `build.gradle.kts` 使用 IntelliJ Platform Plugin 2.x
  - 目标产品：`setProducts(listOf("PY", "PC", "GO"))`
  - Kotlin 编译目标：`jvmToolchain(17)`
- CI：GitHub Actions → `gradle buildPlugin`, `verifyPlugin`, `test`
- 发布：`gradle publishPlugin`（需 JetBrains Marketplace Token）
- 签名：`sign-plugin` 任务，密钥存储在 CI secrets。

## 15. 风险与缓解
| 风险 | 影响 | 缓解策略 |
| --- | --- | --- |
| 终端 API 变更 | 终端功能失效 | 实现 Gateway 并在启动时检测版本 |
| Git 命令失败/权限不足 | 创建/删除失败 | 解析错误提示，提供 CLI fallback 与日志 |
| 大量工作树导致性能下降 | UI 刷新卡顿 | 虚拟化列表 + 节流刷新 |
| 用户误删工作树 | 数据丢失 | 默认要求确认，可选保留目录 |
| 多 IDE 打开同一路径 | 状态混乱 | 检测 `ProjectManager`，提示切换 |

## 16. 实施计划
| 阶段 | 周期 | 关键产出 |
| --- | --- | --- |
| 0. 预研 | 1 周 | 终端 API 验证、git4idea 接口梳理、PoC 列表 |
| 1. MVP | 2 周 | 标签页 UI、WorktreeService、Add/Refresh 流程 |
| 2. 功能完善 | 2 周 | 全部右键菜单、终端联动、详情面板、设置页 |
| 3. 稳定优化 | 1-2 周 | 自动化测试、性能与错误处理、兼容性验证 |
| 4. 发布准备 | 1 周 | 文档、CI/CD、Marketplace 提交、Beta 反馈 |
| 5. 后续迭代 | 持续 | 批量操作、自动清理、统计图、Issue 集成 |

## 17. 后续扩展思路
- 引入工作树标签颜色、自定义排序、快速过滤。
- 集成 Jira/YouTrack：选择任务 → 自动创建命名规范工作树。
- 自动化脚本：在创建后运行初始化脚本（如安装依赖）。
- Telemetry（可选）：收集匿名操作指标，指导迭代。

## 18. 交付物与文档
- 插件源代码仓库
- 用户指南（创建、终端、清理、问题排查）
- 运维手册（发布流程、密钥管理）
- FAQ（权限问题、终端打不开、路径冲突）

## 19. 当前实现进度（2025-09-24）
- Gradle 工程重构完成：使用 IntelliJ Platform Gradle Plugin 构建，JDK 21 工具链、代理配置与多产品目标预留。
- 核心服务 `WorktreeService` 已可解析 `git worktree list --porcelain`，通过消息总线推送状态。
- 工具窗口 `Worktree` 标签页落地，提供树状列表、详情视图以及工具栏按钮（`Add Worktree`、`Refresh`）。
- `AddWorktreeAction` 按模板创建工作树目录，封装后台任务执行 `git worktree add`，并在成功后自动刷新、可选打开终端。
- 终端打开动作通过反射桥接 `TerminalView`，避免 SDK 版本差异。
- `WorktreePathPlanner` 支持模板变量替换与目录冲突自动追加编号。
- 打包已通过 `./gradlew buildPlugin`，产出 `build/distributions/git-worktree-toolwindow-0.1.0.zip`。
- 工具窗口右键菜单提供终端、锁定/解锁、删除（含 `--force` 选项）、Prune Detached 及 IDE 打开操作，统一调用 `GitWorktreeCommands`。
- 新增设置页 `Preferences | Tools | Worktree`，可配置路径模板、自动打开终端/IDE、危险操作确认策略；`AddWorktreeAction` 与右键菜单尊重该配置。
- 添加单元测试 `WorktreePathPlannerTest` 验证路径模板解析与冲突处理逻辑（`./gradlew test`）。
