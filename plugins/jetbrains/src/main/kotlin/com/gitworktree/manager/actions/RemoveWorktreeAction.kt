package com.gitworktree.manager.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindowManager
import com.gitworktree.manager.services.WorktreeService
import com.gitworktree.manager.ui.WorktreePanel

class RemoveWorktreeAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        
        val selectedWorktree = panel?.getSelectedWorktree()
        if (selectedWorktree == null) {
            Messages.showWarningDialog(
                project,
                "Please select a worktree to remove",
                "No Selection"
            )
            return
        }
        
        if (selectedWorktree.isMainWorktree) {
            Messages.showErrorDialog(
                project,
                "Cannot remove the main worktree",
                "Invalid Operation"
            )
            return
        }
        
        val result = Messages.showYesNoDialog(
            project,
            "Are you sure you want to remove worktree '${selectedWorktree.displayName}' at ${selectedWorktree.path}?",
            "Confirm Remove",
            Messages.getQuestionIcon()
        )
        
        if (result == Messages.YES) {
            ApplicationManager.getApplication().executeOnPooledThread {
                val service = project.getService(WorktreeService::class.java)
                val success = service.removeWorktree(selectedWorktree, false)
                
                ApplicationManager.getApplication().invokeLater {
                    if (success) {
                        Messages.showInfoMessage(
                            project,
                            "Worktree removed successfully",
                            "Success"
                        )
                        panel.refreshWorktrees()
                    } else {
                        // Try with force if regular remove failed
                        val forceResult = Messages.showYesNoDialog(
                            project,
                            "Failed to remove worktree. Do you want to force remove it?",
                            "Force Remove?",
                            Messages.getWarningIcon()
                        )
                        
                        if (forceResult == Messages.YES) {
                            ApplicationManager.getApplication().executeOnPooledThread {
                                val forceSuccess = service.removeWorktree(selectedWorktree, true)
                                ApplicationManager.getApplication().invokeLater {
                                    if (forceSuccess) {
                                        Messages.showInfoMessage(
                                            project,
                                            "Worktree force removed successfully",
                                            "Success"
                                        )
                                        panel.refreshWorktrees()
                                    } else {
                                        Messages.showErrorDialog(
                                            project,
                                            "Failed to remove worktree. Check the IDE log for details.",
                                            "Error"
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}