package com.alfons.worktree.plugin.ui

import com.alfons.worktree.plugin.services.WorktreeService
import com.alfons.worktree.plugin.utils.GitWorktreeCommands
import com.alfons.worktree.plugin.utils.TerminalLauncher
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.Disposer
import com.intellij.ui.JBSplitter
import com.intellij.ui.SimpleColoredComponent
import com.intellij.ui.SimpleTextAttributes
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.panels.NonOpaquePanel
import com.intellij.ui.treeStructure.SimpleTree
import com.intellij.util.messages.MessageBusConnection
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.JMenuItem
import javax.swing.JPanel
import javax.swing.JPopupMenu
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel

/**
 * Worktree 标签页的基础 UI：左侧树形列表，右侧详情面板。
 */
class WorktreeToolWindowPanel(private val project: Project) {

    private val service = WorktreeService.getInstance(project)
    private val tree = SimpleTree()
    private val detail = SimpleColoredComponent()
    private val connection: MessageBusConnection = project.messageBus.connect()

    val component: JComponent

    init {
        val actionManager = ActionManager.getInstance()
        val toolbarGroup = DefaultActionGroup().apply {
            add(actionManager.getAction("com.alfons.worktree.action.AddWorktree"))
            add(actionManager.getAction("com.alfons.worktree.action.RefreshWorktree"))
        }
        val toolbar = actionManager.createActionToolbar("WorktreeToolbar", toolbarGroup, true).apply {
            targetComponent = tree
        }

        val splitter = JBSplitter(false, 0.6f).apply {
            firstComponent = JBScrollPane(tree)
            secondComponent = JBScrollPane(NonOpaquePanel(BorderLayout()).apply {
                add(detail, BorderLayout.NORTH)
            })
        }

        component = JPanel(BorderLayout()).apply {
            border = JBUI.Borders.empty()
            add(toolbar.component, BorderLayout.NORTH)
            add(splitter, BorderLayout.CENTER)
        }

        Disposer.register(project) {
            connection.disconnect()
        }
        tree.emptyText.text = "No worktrees tracked"
        tree.isRootVisible = false
        tree.selectionModel.addTreeSelectionListener {
            val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode ?: return@addTreeSelectionListener
            val descriptor = node.userObject as? WorktreeService.WorktreeDescriptor ?: return@addTreeSelectionListener
            renderDetail(descriptor)
        }
        tree.componentPopupMenu = createPopupMenu()

        connection.subscribe(WorktreeService.TOPIC, object : WorktreeService.WorktreeModelListener {
            override fun stateUpdated(descriptors: List<WorktreeService.WorktreeDescriptor>) {
                ApplicationManager.getApplication().invokeLater { rebuildTree(descriptors) }
            }
        })

        rebuildTree(service.currentSnapshot())
    }

    private fun rebuildTree(descriptors: List<WorktreeService.WorktreeDescriptor>) {
        val root = DefaultMutableTreeNode()
        descriptors.forEach { descriptor ->
            root.add(DefaultMutableTreeNode(descriptor))
        }
        tree.model = DefaultTreeModel(root)
        if (root.childCount > 0) {
            tree.expandRow(0)
            tree.selectionModel.selectionPath = tree.getPathForRow(0)
        } else {
            detail.clear()
            detail.append("尚未检测到工作树", SimpleTextAttributes.GRAYED_ATTRIBUTES)
        }
    }

    private fun renderDetail(descriptor: WorktreeService.WorktreeDescriptor) {
        detail.clear()
        detail.append(descriptor.branchName, SimpleTextAttributes.REGULAR_BOLD_ATTRIBUTES)
        detail.append("  •  ${descriptor.worktreePath}", SimpleTextAttributes.GRAYED_ATTRIBUTES)
        descriptor.headRevision?.let { detail.append("  •  $it", SimpleTextAttributes.GRAYED_ATTRIBUTES) }
        if (descriptor.locked) {
            detail.append("  •  LOCKED", SimpleTextAttributes.ERROR_ATTRIBUTES)
            descriptor.lockReason?.let { detail.append(" ($it)", SimpleTextAttributes.GRAYED_SMALL_ATTRIBUTES) }
        }
    }

    private fun createPopupMenu(): JPopupMenu {
        val menu = JPopupMenu()
        menu.add(menuItem("打开终端") { descriptor ->
            val result = TerminalLauncher.open(project, descriptor.worktreePath)
            if (result.isFailure) {
                notify("终端打开失败：${result.exceptionOrNull()?.message}", NotificationType.WARNING)
            }
        })
        menu.add(menuItem("锁定工作树") { descriptor ->
            if (descriptor.locked) {
                notify("工作树已锁定", NotificationType.INFORMATION)
                return@menuItem
            }
            val reason = Messages.showInputDialog(project, "锁定原因（可选）", "Lock Worktree", null)
            GitWorktreeCommands.lock(project, descriptor.repositoryRoot, descriptor.worktreePath, reason).fold(
                onSuccess = {
                    notify("已锁定 ${descriptor.branchName}", NotificationType.INFORMATION)
                    service.scheduleRefresh(WorktreeService.RefreshTrigger.Manual)
                },
                onFailure = { notify("锁定失败：${it.message}", NotificationType.ERROR) }
            )
        })
        menu.add(menuItem("解锁工作树") { descriptor ->
            if (!descriptor.locked) {
                notify("工作树未锁定", NotificationType.INFORMATION)
                return@menuItem
            }
            GitWorktreeCommands.unlock(project, descriptor.repositoryRoot, descriptor.worktreePath).fold(
                onSuccess = {
                    notify("已解锁 ${descriptor.branchName}", NotificationType.INFORMATION)
                    service.scheduleRefresh(WorktreeService.RefreshTrigger.Manual)
                },
                onFailure = { notify("解锁失败：${it.message}", NotificationType.ERROR) }
            )
        })
        menu.addSeparator()
        menu.add(menuItem("删除工作树") { descriptor ->
            val confirmNeeded = com.alfons.worktree.plugin.settings.WorktreeSettingsService.getInstance().currentState.confirmDangerousOperations
            val confirmationOptions = arrayOf("删除", "强制删除", "取消")
            val choice = if (confirmNeeded) {
                Messages.showChooseDialog(
                    project,
                    "确定删除工作树 ${descriptor.branchName} 吗？\n路径：${descriptor.worktreePath}",
                    "Remove Worktree",
                    Messages.getWarningIcon(),
                    confirmationOptions,
                    confirmationOptions[0]
                )
            } else confirmationOptions[0]
            if (choice == confirmationOptions[2] || choice == null) return@menuItem
            val force = choice == confirmationOptions[1]
            GitWorktreeCommands.remove(project, descriptor.repositoryRoot, descriptor.worktreePath, force = force).fold(
                onSuccess = {
                    notify("已删除 ${descriptor.branchName}", NotificationType.INFORMATION)
                    service.scheduleRefresh(WorktreeService.RefreshTrigger.Manual)
                },
                onFailure = { notify("删除失败：${it.message}", NotificationType.ERROR) }
            )
        })
        menu.add(menuItem("Prune Detached") { descriptor ->
            val dryOutput = GitWorktreeCommands.prune(project, descriptor.repositoryRoot, dryRun = true)
            dryOutput.fold(
                onSuccess = { preview ->
                    val confirmNeeded = com.alfons.worktree.plugin.settings.WorktreeSettingsService.getInstance().currentState.confirmDangerousOperations
                    val proceed = if (confirmNeeded) {
                        Messages.showOkCancelDialog(
                            project,
                            if (preview.isBlank()) "没有待清理的工作树" else preview,
                            "Prune Detached",
                            "执行", "取消", Messages.getQuestionIcon()
                        )
                    } else Messages.OK
                    if (proceed == Messages.OK && preview.isNotBlank()) {
                        GitWorktreeCommands.prune(project, descriptor.repositoryRoot, dryRun = false).onSuccess {
                            notify("Prune 完成", NotificationType.INFORMATION)
                            service.scheduleRefresh(WorktreeService.RefreshTrigger.Manual)
                        }.onFailure {
                            notify("Prune 失败：${it.message}", NotificationType.ERROR)
                        }
                    }
                },
                onFailure = { notify("Prune 失败：${it.message}", NotificationType.ERROR) }
            )
        })
        menu.add(menuItem("在 IDE 中打开") { descriptor ->
            com.intellij.ide.impl.ProjectUtil.openOrImport(descriptor.worktreePath)
        })
        return menu
    }

    private fun menuItem(text: String, action: (WorktreeService.WorktreeDescriptor) -> Unit): JMenuItem {
        return JMenuItem(text).apply {
            addActionListener {
                val node = tree.selectionPath?.lastPathComponent as? DefaultMutableTreeNode ?: return@addActionListener
                val descriptor = node.userObject as? WorktreeService.WorktreeDescriptor ?: return@addActionListener
                action(descriptor)
            }
        }
    }

    private fun notify(message: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Worktree")
            .createNotification(message, type)
            .notify(project)
    }
}
