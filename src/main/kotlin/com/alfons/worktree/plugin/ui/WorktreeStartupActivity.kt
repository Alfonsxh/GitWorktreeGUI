package com.alfons.worktree.plugin.ui

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.openapi.wm.ex.ToolWindowManagerListener
import com.intellij.ui.content.ContentFactory
import com.intellij.openapi.wm.ToolWindowId

class WorktreeStartupActivity : StartupActivity, DumbAware {
    override fun runActivity(project: Project) {
        val log = Logger.getInstance(WorktreeStartupActivity::class.java)
        log.info("WorktreeStartupActivity run for project ${project.name}")
        val manager = ToolWindowManager.getInstance(project)
        log.info("Registered toolwindow ids at startup: ${manager.toolWindowIds.joinToString()}")
        val existing = manager.getToolWindow(TARGET_TOOLWINDOW_ID)
        if (existing != null) {
            log.info("Git toolwindow available immediately, injecting Worktree tab")
            inject(project, existing)
            return
        }
        log.info("Git toolwindow not found, listening for registration")
        val connection = project.messageBus.connect()
        connection.subscribe(ToolWindowManagerListener.TOPIC, object : ToolWindowManagerListener {
            override fun toolWindowRegistered(id: String) {
                if (id == TARGET_TOOLWINDOW_ID) {
                    manager.getToolWindow(TARGET_TOOLWINDOW_ID)?.let {
                        log.info("Git toolwindow registered, injecting Worktree tab")
                        inject(project, it)
                        connection.disconnect()
                    }
                }
            }
        })
    }

    companion object {
        private const val TAB_NAME = "Worktree"
        private const val TARGET_TOOLWINDOW_ID = ToolWindowId.VCS

        private fun inject(project: Project, toolWindow: com.intellij.openapi.wm.ToolWindow) {
            if (project.isDisposed) return
            val log = Logger.getInstance(WorktreeStartupActivity::class.java)
            val runnable = Runnable {
                val contentManager = toolWindow.contentManager
                val already = contentManager.contents.any { it.displayName == TAB_NAME }
                if (already) {
                    log.info("Worktree tab already present, skipping")
                    return@Runnable
                }
                val panel = WorktreeToolWindowPanel(project)
                val content = ContentFactory.getInstance().createContent(panel.component, TAB_NAME, false)
                content.isCloseable = false
                contentManager.addContent(content)
                log.info("Worktree tab injected into Git toolwindow")
            }
            ApplicationManager.getApplication().invokeLater(runnable)
        }
    }
}
