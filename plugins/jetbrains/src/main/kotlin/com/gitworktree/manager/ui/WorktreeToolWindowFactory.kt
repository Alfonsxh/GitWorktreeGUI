package com.gitworktree.manager.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class WorktreeToolWindowFactory : ToolWindowFactory {
    
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val contentFactory = ContentFactory.getInstance()
        val worktreePanel = WorktreePanel(project)
        val content = contentFactory.createContent(worktreePanel, "", false)
        toolWindow.contentManager.addContent(content)
    }
    
    override fun shouldBeAvailable(project: Project): Boolean {
        // Only show the tool window if the project is a Git repository
        return try {
            val gitDir = project.basePath?.let { java.io.File(it, ".git") }
            gitDir?.exists() ?: false
        } catch (e: Exception) {
            false
        }
    }
}