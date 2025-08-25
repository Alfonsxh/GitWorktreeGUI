package com.gitworktree.manager.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.terminal.TerminalTabState
import com.intellij.terminal.TerminalToolWindowManager
import com.gitworktree.manager.ui.WorktreePanel
import java.io.File

class OpenInTerminalAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        
        val selectedWorktree = panel?.getSelectedWorktree()
        if (selectedWorktree == null) {
            Messages.showWarningDialog(
                project,
                "Please select a worktree to open in terminal",
                "No Selection"
            )
            return
        }
        
        try {
            // Try to use IDE's built-in terminal if available
            val terminalManager = TerminalToolWindowManager.getInstance(project)
            if (terminalManager != null) {
                val state = TerminalTabState().apply {
                    myWorkingDirectory = selectedWorktree.path
                    myTabName = "Worktree: ${selectedWorktree.displayName}"
                }
                terminalManager.createNewSession(state)
                
                // Show the terminal tool window
                val terminalToolWindow = ToolWindowManager.getInstance(project).getToolWindow("Terminal")
                terminalToolWindow?.show()
            } else {
                // Fallback to system terminal
                openSystemTerminal(selectedWorktree.path)
            }
        } catch (e: Exception) {
            // Fallback to system terminal if IDE terminal fails
            try {
                openSystemTerminal(selectedWorktree.path)
            } catch (ex: Exception) {
                Messages.showErrorDialog(
                    project,
                    "Failed to open terminal: ${ex.message}",
                    "Error"
                )
            }
        }
    }
    
    private fun openSystemTerminal(path: String) {
        val os = System.getProperty("os.name").toLowerCase()
        val command = when {
            os.contains("win") -> {
                arrayOf("cmd", "/c", "start", "cmd", "/k", "cd", "/d", path)
            }
            os.contains("mac") -> {
                arrayOf("open", "-a", "Terminal", path)
            }
            else -> {
                // Linux
                when {
                    File("/usr/bin/gnome-terminal").exists() -> {
                        arrayOf("gnome-terminal", "--working-directory=$path")
                    }
                    File("/usr/bin/konsole").exists() -> {
                        arrayOf("konsole", "--workdir", path)
                    }
                    File("/usr/bin/xterm").exists() -> {
                        arrayOf("xterm", "-e", "cd $path && bash")
                    }
                    else -> {
                        arrayOf("x-terminal-emulator", "-e", "cd $path && bash")
                    }
                }
            }
        }
        
        Runtime.getRuntime().exec(command)
    }
}