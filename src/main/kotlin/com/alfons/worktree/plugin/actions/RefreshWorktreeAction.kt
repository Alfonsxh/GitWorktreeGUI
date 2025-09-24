package com.alfons.worktree.plugin.actions

import com.alfons.worktree.plugin.services.WorktreeService
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.DumbAware

class RefreshWorktreeAction : AnAction(), DumbAware {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        WorktreeService.getInstance(project).scheduleRefresh(WorktreeService.RefreshTrigger.Manual)
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = e.project != null
    }
}
