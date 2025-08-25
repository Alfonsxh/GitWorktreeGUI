package com.gitworktree.manager.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.wm.ToolWindowManager
import com.gitworktree.manager.ui.WorktreePanel

class RefreshWorktreeAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        
        panel?.refreshWorktrees()
    }
}