package com.gitworktree.manager.actions

import com.intellij.ide.impl.ProjectUtil
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.popup.JBPopupFactory
import com.intellij.openapi.ui.popup.ListPopup
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.awt.RelativePoint
import com.gitworktree.manager.models.Worktree
import com.gitworktree.manager.services.WorktreeService
import com.gitworktree.manager.ui.WorktreePanel
import java.awt.Point
import java.io.File
import javax.swing.Icon

class SwitchWorktreeAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        // Get selected worktree from panel or show selection popup
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        
        val selectedWorktree = panel?.getSelectedWorktree()
        if (selectedWorktree != null) {
            switchToWorktree(project, selectedWorktree)
        } else {
            showWorktreeSelectionPopup(e, project)
        }
    }
    
    private fun showWorktreeSelectionPopup(e: AnActionEvent, project: Project) {
        val service = project.getService(WorktreeService::class.java)
        val worktrees = service.listWorktrees()
        
        if (worktrees.isEmpty()) {
            Messages.showWarningDialog(
                project,
                "No worktrees found in the current repository",
                "No Worktrees"
            )
            return
        }
        
        val actionGroup = com.intellij.openapi.actionSystem.DefaultActionGroup()
        
        for (worktree in worktrees) {
            actionGroup.add(object : AnAction(
                "${worktree.getStatusIcon()} ${worktree.displayName}",
                worktree.path,
                null
            ) {
                override fun actionPerformed(e: AnActionEvent) {
                    switchToWorktree(project, worktree)
                }
            })
        }
        
        val popup = JBPopupFactory.getInstance()
            .createActionGroupPopup(
                "Select Worktree",
                actionGroup,
                e.dataContext,
                JBPopupFactory.ActionSelectionAid.SPEEDSEARCH,
                true
            )
        
        // Show popup at mouse location or center of screen
        val point = e.inputEvent?.let {
            if (it.component != null) {
                RelativePoint(it.component, Point(it.component.width / 2, it.component.height / 2))
            } else {
                RelativePoint.getCenterOf(e.inputEvent.component)
            }
        } ?: RelativePoint.getCenterOf(project.getProjectFilePath()?.let { File(it) }?.parentFile?.absolutePath?.let { File(it) } ?: File("."))
        
        popup.show(point)
    }
    
    private fun switchToWorktree(currentProject: Project, worktree: Worktree) {
        // Check if the worktree path exists
        val worktreePath = File(worktree.path)
        if (!worktreePath.exists()) {
            Messages.showErrorDialog(
                currentProject,
                "Worktree path does not exist: ${worktree.path}",
                "Invalid Worktree"
            )
            return
        }
        
        // Check if there's already a project open for this worktree
        val existingProject = ProjectManager.getInstance().openProjects.find { 
            it.basePath == worktree.path 
        }
        
        if (existingProject != null) {
            // Switch to existing project
            ProjectUtil.focusProjectWindow(existingProject, true)
            Messages.showInfoMessage(
                existingProject,
                "Switched to worktree: ${worktree.displayName}",
                "Worktree Switch"
            )
        } else {
            // Ask user whether to open in new window or current window
            val result = Messages.showYesNoCancelDialog(
                currentProject,
                "Open worktree '${worktree.displayName}' in a new window?",
                "Switch Worktree",
                "New Window",
                "Current Window",
                "Cancel",
                null
            )
            
            when (result) {
                Messages.YES -> {
                    // Open in new window
                    ApplicationManager.getApplication().invokeLater {
                        ProjectUtil.openOrImport(worktree.path, null, true)
                    }
                }
                Messages.NO -> {
                    // Open in current window (will close current project)
                    ApplicationManager.getApplication().invokeLater {
                        ProjectUtil.openOrImport(worktree.path, currentProject, false)
                    }
                }
                else -> {
                    // Cancelled
                }
            }
        }
    }
}