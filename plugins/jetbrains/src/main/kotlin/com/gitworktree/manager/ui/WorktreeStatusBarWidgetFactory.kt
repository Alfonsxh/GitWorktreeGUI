package com.gitworktree.manager.ui

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.wm.impl.status.widget.StatusBarWidgetsManager
import com.intellij.ui.ClickListener
import com.intellij.util.Consumer
import com.gitworktree.manager.services.WorktreeService
import java.awt.event.MouseEvent
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.Timer

class WorktreeStatusBarWidgetFactory : StatusBarWidgetFactory {
    
    override fun getId(): String = "GitWorktreeWidget"
    
    override fun getDisplayName(): String = "Git Worktree"
    
    override fun isAvailable(project: Project): Boolean {
        // Only show if the project is a Git repository
        return try {
            val gitDir = project.basePath?.let { java.io.File(it, ".git") }
            gitDir?.exists() ?: false
        } catch (e: Exception) {
            false
        }
    }
    
    override fun createWidget(project: Project): StatusBarWidget {
        return WorktreeStatusBarWidget(project)
    }
    
    override fun disposeWidget(widget: StatusBarWidget) {
        Disposer.dispose(widget)
    }
    
    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}

class WorktreeStatusBarWidget(private val project: Project) : StatusBarWidget {
    
    private val worktreeService = project.getService(WorktreeService::class.java)
    private var statusBar: StatusBar? = null
    private val label = JLabel()
    private var refreshTimer: Timer? = null
    
    override fun ID(): String = "GitWorktreeWidget"
    
    override fun getPresentation(): StatusBarWidget.WidgetPresentation {
        return object : StatusBarWidget.TextPresentation {
            override fun getText(): String {
                return getCurrentWorktreeText()
            }
            
            override fun getTooltipText(): String {
                return getCurrentWorktreeTooltip()
            }
            
            override fun getAlignment(): Float = 0f
            
            override fun getClickConsumer(): Consumer<MouseEvent>? {
                return Consumer { 
                    // Show worktree selection popup
                    com.intellij.openapi.actionSystem.ActionManager
                        .getInstance()
                        .getAction("GitWorktree.Switch")
                        ?.actionPerformed(
                            com.intellij.openapi.actionSystem.AnActionEvent.createFromDataContext(
                                "",
                                null,
                                com.intellij.openapi.actionSystem.DataContext.EMPTY_CONTEXT
                            )
                        )
                }
            }
        }
    }
    
    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
        startRefreshTimer()
        updateWidget()
    }
    
    override fun dispose() {
        refreshTimer?.stop()
        refreshTimer = null
        statusBar = null
    }
    
    private fun startRefreshTimer() {
        refreshTimer?.stop()
        refreshTimer = Timer(30000) { // Refresh every 30 seconds
            updateWidget()
        }
        refreshTimer?.start()
    }
    
    private fun updateWidget() {
        statusBar?.updateWidget(ID())
    }
    
    private fun getCurrentWorktreeText(): String {
        val worktrees = worktreeService.listWorktrees()
        val currentPath = project.basePath ?: return "No Worktree"
        
        val currentWorktree = worktrees.find { worktree ->
            val normalizedWorktreePath = java.io.File(worktree.path).canonicalPath
            val normalizedCurrentPath = java.io.File(currentPath).canonicalPath
            normalizedWorktreePath == normalizedCurrentPath ||
            normalizedCurrentPath.startsWith("$normalizedWorktreePath${java.io.File.separator}")
        }
        
        return if (currentWorktree != null) {
            val icon = when {
                currentWorktree.isMainWorktree -> "⭐"
                currentWorktree.locked -> "🔒"
                else -> "🌳"
            }
            "$icon ${currentWorktree.displayName}"
        } else {
            "📁 No Worktree"
        }
    }
    
    private fun getCurrentWorktreeTooltip(): String {
        val worktrees = worktreeService.listWorktrees()
        val currentPath = project.basePath ?: return "Not in a Git worktree"
        
        val currentWorktree = worktrees.find { worktree ->
            val normalizedWorktreePath = java.io.File(worktree.path).canonicalPath
            val normalizedCurrentPath = java.io.File(currentPath).canonicalPath
            normalizedWorktreePath == normalizedCurrentPath ||
            normalizedCurrentPath.startsWith("$normalizedWorktreePath${java.io.File.separator}")
        }
        
        return if (currentWorktree != null) {
            buildString {
                append("Current Worktree: ${currentWorktree.displayName}\n")
                append("Path: ${currentWorktree.path}\n")
                append("HEAD: ${currentWorktree.shortHead}\n")
                if (currentWorktree.locked) {
                    append("Status: Locked")
                    currentWorktree.lockedReason?.let {
                        append(" - $it")
                    }
                    append("\n")
                }
                append("\nTotal Worktrees: ${worktrees.size}\n")
                append("Click to switch worktree")
            }
        } else {
            "Not in a Git worktree\nClick to switch worktree"
        }
    }
}