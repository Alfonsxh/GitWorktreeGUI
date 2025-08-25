package com.gitworktree.manager.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindowManager
import com.gitworktree.manager.services.WorktreeService
import com.gitworktree.manager.ui.WorktreePanel

class LockWorktreeAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        
        val selectedWorktree = panel?.getSelectedWorktree()
        if (selectedWorktree == null) {
            Messages.showWarningDialog(
                project,
                "Please select a worktree to lock/unlock",
                "No Selection"
            )
            return
        }
        
        val service = project.getService(WorktreeService::class.java)
        
        if (selectedWorktree.locked) {
            // Unlock the worktree
            val result = Messages.showYesNoDialog(
                project,
                "Do you want to unlock worktree '${selectedWorktree.displayName}'?",
                "Unlock Worktree",
                Messages.getQuestionIcon()
            )
            
            if (result == Messages.YES) {
                ApplicationManager.getApplication().executeOnPooledThread {
                    val success = service.unlockWorktree(selectedWorktree)
                    
                    ApplicationManager.getApplication().invokeLater {
                        if (success) {
                            Messages.showInfoMessage(
                                project,
                                "Worktree unlocked successfully",
                                "Success"
                            )
                            panel.refreshWorktrees()
                        } else {
                            Messages.showErrorDialog(
                                project,
                                "Failed to unlock worktree. Check the IDE log for details.",
                                "Error"
                            )
                        }
                    }
                }
            }
        } else {
            // Lock the worktree
            val reason = Messages.showInputDialog(
                project,
                "Enter lock reason (optional):",
                "Lock Worktree",
                Messages.getQuestionIcon()
            )
            
            if (reason != null) { // null means user cancelled
                ApplicationManager.getApplication().executeOnPooledThread {
                    val success = service.lockWorktree(
                        selectedWorktree, 
                        reason.ifBlank { null }
                    )
                    
                    ApplicationManager.getApplication().invokeLater {
                        if (success) {
                            Messages.showInfoMessage(
                                project,
                                "Worktree locked successfully",
                                "Success"
                            )
                            panel.refreshWorktrees()
                        } else {
                            Messages.showErrorDialog(
                                project,
                                "Failed to lock worktree. Check the IDE log for details.",
                                "Error"
                            )
                        }
                    }
                }
            }
        }
    }
    
    override fun update(e: AnActionEvent) {
        val project = e.project
        if (project == null) {
            e.presentation.isEnabled = false
            return
        }
        
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        val selectedWorktree = panel?.getSelectedWorktree()
        
        if (selectedWorktree != null) {
            e.presentation.text = if (selectedWorktree.locked) "Unlock Worktree" else "Lock Worktree"
            e.presentation.isEnabled = true
        } else {
            e.presentation.text = "Lock/Unlock Worktree"
            e.presentation.isEnabled = false
        }
    }
}