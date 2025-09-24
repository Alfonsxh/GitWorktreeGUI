package com.alfons.worktree.plugin.actions

import com.alfons.worktree.plugin.services.WorktreeService
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.alfons.worktree.plugin.utils.TerminalLauncher
import java.nio.file.Files
import java.nio.file.Path

/**
 * 打开终端并定位到选定工作树目录。
 * 使用反射调用 Terminal API，避免编译期强依赖特定实现类。
 */
class OpenWorktreeInTerminalAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val descriptor = WorktreeService.getInstance(project).currentSnapshot().firstOrNull()
        if (descriptor == null) {
            notify(project, "当前没有可用的工作树", NotificationType.WARNING)
            return
        }
        openTerminal(project, descriptor.worktreePath)
    }

    private fun openTerminal(project: Project, path: Path) {
        if (!Files.exists(path)) {
            notify(project, "工作树目录不存在: $path", NotificationType.ERROR)
            return
        }
        val result = TerminalLauncher.open(project, path)
        if (result.isFailure) {
            notify(project, result.exceptionOrNull()?.message ?: "终端不可用", NotificationType.ERROR)
        }
    }

    private fun notify(project: Project, message: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Worktree")
            .createNotification(message, type)
            .notify(project)
    }
}
