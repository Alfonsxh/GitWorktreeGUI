package com.alfons.worktree.plugin.actions

import com.alfons.worktree.plugin.services.WorktreeService
import com.alfons.worktree.plugin.settings.WorktreeSettingsService
import com.alfons.worktree.plugin.ui.AddWorktreeDialog
import com.alfons.worktree.plugin.utils.TerminalLauncher
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.util.ExecUtil
import com.intellij.ide.impl.ProjectUtil
import git4idea.config.GitExecutableManager
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryManager
import java.nio.file.Files
import java.nio.file.Path

/**
 * 创建工作树：选择仓库、输入分支，按模板生成目录并执行 git 命令。
 */
class AddWorktreeAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val repositories = GitRepositoryManager.getInstance(project).repositories
        if (repositories.isEmpty()) {
            notify(project, "未检测到 Git 仓库，无法创建工作树。", NotificationType.WARNING)
            return
        }

        val repository = chooseRepository(project, repositories) ?: return
        val settings = WorktreeSettingsService.getInstance().currentState
        val dialog = AddWorktreeDialog(project, repository, settings)
        if (!dialog.showAndGet()) return
        val result = dialog.result() ?: return
        val targetPath = result.pathPreview

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "创建工作树", true) {
            private var createdPath: Path? = null

            override fun run(indicator: ProgressIndicator) {
                indicator.text = "git worktree add"
                val gitPath = GitExecutableManager.getInstance().getPathToGit(project)
                targetPath.parent?.let { Files.createDirectories(it) }
                val command = GeneralCommandLine(buildCommand(gitPath, result, targetPath))
                    .withWorkDirectory(repository.root.path)
                val output = ExecUtil.execAndGetOutput(command)
                if (output.exitCode != 0) {
                    throw RuntimeException(output.stderr.ifBlank { output.stdout })
                }
                createdPath = targetPath
            }

            override fun onSuccess() {
                val service = WorktreeService.getInstance(project)
                service.scheduleRefresh(WorktreeService.RefreshTrigger.ModelChange)
                notify(project, "工作树已创建：$targetPath", NotificationType.INFORMATION)
                settings.autoOpenTerminal = result.openTerminal
                settings.autoOpenProject = result.openProject
                if (result.openTerminal) {
                    createdPath?.let { path ->
                        val result = TerminalLauncher.open(project, path)
                        if (result.isFailure) {
                            notify(project, "终端打开失败：${result.exceptionOrNull()?.message}", NotificationType.WARNING)
                        }
                    }
                }
                if (result.openProject) {
                    createdPath?.let { ProjectUtil.openOrImport(it) }
                }
            }

            override fun onThrowable(error: Throwable) {
                notify(project, error.message ?: "创建工作树失败", NotificationType.ERROR)
            }
        })
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = e.project != null
    }

    private fun chooseRepository(project: Project, repositories: List<GitRepository>): GitRepository? {
        if (repositories.size == 1) return repositories.first()
        val prompt = buildString {
            appendLine("请输入仓库编号：")
            repositories.forEachIndexed { index, repo ->
                appendLine("${index + 1}. ${repo.presentableUrl}")
            }
        }
        val input = Messages.showInputDialog(project, prompt, "Add Worktree", null) ?: return null
        val idx = input.trim().toIntOrNull()?.minus(1)
        if (idx == null || idx !in repositories.indices) {
            notify(project, "无效的编号", NotificationType.WARNING)
            return null
        }
        return repositories[idx]
    }

    private fun notify(project: Project, message: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Worktree")
            .createNotification(message, type)
            .notify(project)
    }

    private fun buildCommand(gitPath: String, result: AddWorktreeDialog.Result, targetPath: java.nio.file.Path): List<String> {
        val args = mutableListOf(gitPath, "worktree", "add")
        if (result.createNew) {
            args += listOf("-b", result.checkoutBranch)
            args += listOf(targetPath.toString(), result.baseBranch)
        } else {
            args += listOf(targetPath.toString(), result.checkoutBranch)
        }
        return args
    }
}
