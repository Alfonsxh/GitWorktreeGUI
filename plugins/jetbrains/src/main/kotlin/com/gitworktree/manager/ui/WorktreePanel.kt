package com.gitworktree.manager.ui

import com.intellij.openapi.actionSystem.*
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.SimpleToolWindowPanel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.treeStructure.Tree
import com.gitworktree.manager.models.Worktree
import com.gitworktree.manager.services.WorktreeService
import java.awt.BorderLayout
import javax.swing.*
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeCellRenderer
import javax.swing.tree.DefaultTreeModel
import java.awt.Component
import java.util.Timer
import java.util.TimerTask

class WorktreePanel(private val project: Project) : SimpleToolWindowPanel(true, false) {
    
    private val worktreeService = project.getService(WorktreeService::class.java)
    private val tree: Tree
    private val treeModel: DefaultTreeModel
    private val rootNode = DefaultMutableTreeNode("Git Worktrees")
    private var refreshTimer: Timer? = null
    
    init {
        treeModel = DefaultTreeModel(rootNode)
        tree = Tree(treeModel).apply {
            isRootVisible = false
            cellRenderer = WorktreeCellRenderer()
        }
        
        setupUI()
        setupActions()
        setupAutoRefresh()
        refreshWorktrees()
    }
    
    private fun setupUI() {
        val scrollPane = JBScrollPane(tree)
        add(scrollPane, BorderLayout.CENTER)
        
        // Add toolbar
        val toolbar = createToolbar()
        setToolbar(toolbar.component)
    }
    
    private fun createToolbar(): ActionToolbar {
        val group = DefaultActionGroup().apply {
            add(ActionManager.getInstance().getAction("GitWorktree.Add"))
            add(ActionManager.getInstance().getAction("GitWorktree.Remove"))
            addSeparator()
            add(ActionManager.getInstance().getAction("GitWorktree.Switch"))
            add(ActionManager.getInstance().getAction("GitWorktree.Lock"))
            addSeparator()
            add(ActionManager.getInstance().getAction("GitWorktree.OpenInTerminal"))
            add(ActionManager.getInstance().getAction("GitWorktree.Refresh"))
        }
        
        return ActionManager.getInstance().createActionToolbar(
            "GitWorktreeToolbar",
            group,
            true
        )
    }
    
    private fun setupActions() {
        // Double-click to switch worktree
        tree.addMouseListener(object : java.awt.event.MouseAdapter() {
            override fun mouseClicked(e: java.awt.event.MouseEvent) {
                if (e.clickCount == 2) {
                    val selectedWorktree = getSelectedWorktree()
                    selectedWorktree?.let { switchToWorktree(it) }
                }
            }
        })
        
        // Context menu
        tree.componentPopupMenu = createContextMenu()
    }
    
    private fun createContextMenu(): JPopupMenu {
        return JPopupMenu().apply {
            add(JMenuItem("Switch to Worktree").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { switchToWorktree(it) }
                }
            })
            addSeparator()
            add(JMenuItem("Add Worktree").apply {
                addActionListener { showAddWorktreeDialog() }
            })
            add(JMenuItem("Remove Worktree").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { removeWorktree(it) }
                }
            })
            addSeparator()
            add(JMenuItem("Lock Worktree").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { lockWorktree(it) }
                }
            })
            add(JMenuItem("Unlock Worktree").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { unlockWorktree(it) }
                }
            })
            addSeparator()
            add(JMenuItem("Open in Terminal").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { openInTerminal(it) }
                }
            })
            add(JMenuItem("Open in File Manager").apply {
                addActionListener { 
                    getSelectedWorktree()?.let { openInFileManager(it) }
                }
            })
            addSeparator()
            add(JMenuItem("Refresh").apply {
                addActionListener { refreshWorktrees() }
            })
        }
    }
    
    private fun setupAutoRefresh() {
        refreshTimer?.cancel()
        refreshTimer = Timer()
        refreshTimer?.schedule(object : TimerTask() {
            override fun run() {
                ApplicationManager.getApplication().invokeLater {
                    refreshWorktrees()
                }
            }
        }, 30000, 30000) // Refresh every 30 seconds
    }
    
    fun refreshWorktrees() {
        ApplicationManager.getApplication().executeOnPooledThread {
            val worktrees = worktreeService.listWorktrees()
            
            ApplicationManager.getApplication().invokeLater {
                updateTree(worktrees)
            }
        }
    }
    
    private fun updateTree(worktrees: List<Worktree>) {
        rootNode.removeAllChildren()
        
        for (worktree in worktrees) {
            val node = DefaultMutableTreeNode(worktree)
            rootNode.add(node)
        }
        
        treeModel.reload()
        
        // Expand all nodes
        for (i in 0 until tree.rowCount) {
            tree.expandRow(i)
        }
    }
    
    fun getSelectedWorktree(): Worktree? {
        val selectedPath = tree.selectionPath
        val selectedNode = selectedPath?.lastPathComponent as? DefaultMutableTreeNode
        return selectedNode?.userObject as? Worktree
    }
    
    private fun switchToWorktree(worktree: Worktree) {
        // Implementation will be added in the action class
        ActionManager.getInstance().getAction("GitWorktree.Switch")
            ?.actionPerformed(AnActionEvent.createFromDataContext("", null, DataContext.EMPTY_CONTEXT))
    }
    
    private fun removeWorktree(worktree: Worktree) {
        val result = JOptionPane.showConfirmDialog(
            this,
            "Are you sure you want to remove worktree at ${worktree.path}?",
            "Confirm Remove",
            JOptionPane.YES_NO_OPTION
        )
        
        if (result == JOptionPane.YES_OPTION) {
            ApplicationManager.getApplication().executeOnPooledThread {
                val success = worktreeService.removeWorktree(worktree)
                if (success) {
                    refreshWorktrees()
                }
            }
        }
    }
    
    private fun lockWorktree(worktree: Worktree) {
        if (worktree.locked) {
            JOptionPane.showMessageDialog(this, "Worktree is already locked")
            return
        }
        
        val reason = JOptionPane.showInputDialog(
            this,
            "Enter lock reason (optional):",
            "Lock Worktree",
            JOptionPane.QUESTION_MESSAGE
        )
        
        ApplicationManager.getApplication().executeOnPooledThread {
            val success = worktreeService.lockWorktree(worktree, reason)
            if (success) {
                refreshWorktrees()
            }
        }
    }
    
    private fun unlockWorktree(worktree: Worktree) {
        if (!worktree.locked) {
            JOptionPane.showMessageDialog(this, "Worktree is not locked")
            return
        }
        
        ApplicationManager.getApplication().executeOnPooledThread {
            val success = worktreeService.unlockWorktree(worktree)
            if (success) {
                refreshWorktrees()
            }
        }
    }
    
    private fun openInTerminal(worktree: Worktree) {
        // Platform-specific terminal opening logic
        val os = System.getProperty("os.name").toLowerCase()
        val command = when {
            os.contains("win") -> arrayOf("cmd", "/c", "start", "cmd", "/k", "cd", "/d", worktree.path)
            os.contains("mac") -> arrayOf("open", "-a", "Terminal", worktree.path)
            else -> arrayOf("gnome-terminal", "--working-directory=${worktree.path}")
        }
        
        try {
            Runtime.getRuntime().exec(command)
        } catch (e: Exception) {
            JOptionPane.showMessageDialog(
                this,
                "Failed to open terminal: ${e.message}",
                "Error",
                JOptionPane.ERROR_MESSAGE
            )
        }
    }
    
    private fun openInFileManager(worktree: Worktree) {
        val desktop = java.awt.Desktop.getDesktop()
        try {
            desktop.open(java.io.File(worktree.path))
        } catch (e: Exception) {
            JOptionPane.showMessageDialog(
                this,
                "Failed to open file manager: ${e.message}",
                "Error",
                JOptionPane.ERROR_MESSAGE
            )
        }
    }
    
    private fun showAddWorktreeDialog() {
        // This will be implemented in the AddWorktreeAction
        ActionManager.getInstance().getAction("GitWorktree.Add")
            ?.actionPerformed(AnActionEvent.createFromDataContext("", null, DataContext.EMPTY_CONTEXT))
    }
    
    override fun dispose() {
        refreshTimer?.cancel()
        super.dispose()
    }
    
    private class WorktreeCellRenderer : DefaultTreeCellRenderer() {
        override fun getTreeCellRendererComponent(
            tree: JTree?,
            value: Any?,
            selected: Boolean,
            expanded: Boolean,
            leaf: Boolean,
            row: Int,
            hasFocus: Boolean
        ): Component {
            super.getTreeCellRendererComponent(tree, value, selected, expanded, leaf, row, hasFocus)
            
            val node = value as? DefaultMutableTreeNode
            val worktree = node?.userObject as? Worktree
            
            if (worktree != null) {
                text = buildString {
                    append(worktree.getStatusIcon())
                    append(" ")
                    append(worktree.displayName)
                    append(" (")
                    append(worktree.shortHead)
                    append(")")
                    if (worktree.locked) {
                        append(" [LOCKED]")
                    }
                }
                
                toolTipText = buildString {
                    append("<html>")
                    append("<b>Branch:</b> ${worktree.displayName}<br>")
                    append("<b>Path:</b> ${worktree.path}<br>")
                    append("<b>HEAD:</b> ${worktree.head}<br>")
                    if (worktree.locked) {
                        append("<b>Locked:</b> Yes<br>")
                        worktree.lockedReason?.let {
                            append("<b>Reason:</b> $it<br>")
                        }
                    }
                    append("</html>")
                }
            }
            
            return this
        }
    }
}