package com.gitworktree.manager.ui

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JSpinner
import javax.swing.SpinnerNumberModel

class WorktreeSettingsConfigurable(private val project: Project) : Configurable {
    
    private var settingsPanel: WorktreeSettingsPanel? = null
    
    override fun getDisplayName(): String = "Git Worktree Manager"
    
    override fun createComponent(): JComponent? {
        settingsPanel = WorktreeSettingsPanel()
        return settingsPanel?.createPanel()
    }
    
    override fun isModified(): Boolean {
        return settingsPanel?.isModified() ?: false
    }
    
    override fun apply() {
        settingsPanel?.apply()
    }
    
    override fun reset() {
        settingsPanel?.reset()
    }
    
    override fun disposeUIResources() {
        settingsPanel = null
    }
    
    private class WorktreeSettingsPanel {
        private val autoRefreshCheckBox = JBCheckBox("Enable auto-refresh")
        private val refreshIntervalSpinner = JSpinner(SpinnerNumberModel(30, 10, 300, 10))
        private val showInStatusBarCheckBox = JBCheckBox("Show current worktree in status bar")
        private val showMainWorktreeIconCheckBox = JBCheckBox("Show special icon for main worktree")
        private val confirmRemoveCheckBox = JBCheckBox("Confirm before removing worktrees")
        private val openInNewWindowCheckBox = JBCheckBox("Open worktrees in new window by default")
        private val defaultWorktreePathField = JBTextField()
        
        // Store original values for comparison
        private var originalValues: Map<String, Any> = emptyMap()
        
        init {
            loadSettings()
        }
        
        fun createPanel(): JPanel {
            return FormBuilder.createFormBuilder()
                .addComponent(autoRefreshCheckBox)
                .addLabeledComponent("Refresh interval (seconds):", refreshIntervalSpinner)
                .addSeparator()
                .addComponent(showInStatusBarCheckBox)
                .addComponent(showMainWorktreeIconCheckBox)
                .addSeparator()
                .addComponent(confirmRemoveCheckBox)
                .addComponent(openInNewWindowCheckBox)
                .addSeparator()
                .addLabeledComponent("Default worktree parent path:", defaultWorktreePathField)
                .addComponentFillVertically(JPanel(), 0)
                .panel
        }
        
        fun isModified(): Boolean {
            return originalValues["autoRefresh"] != autoRefreshCheckBox.isSelected ||
                   originalValues["refreshInterval"] != refreshIntervalSpinner.value ||
                   originalValues["showInStatusBar"] != showInStatusBarCheckBox.isSelected ||
                   originalValues["showMainWorktreeIcon"] != showMainWorktreeIconCheckBox.isSelected ||
                   originalValues["confirmRemove"] != confirmRemoveCheckBox.isSelected ||
                   originalValues["openInNewWindow"] != openInNewWindowCheckBox.isSelected ||
                   originalValues["defaultWorktreePath"] != defaultWorktreePathField.text
        }
        
        fun apply() {
            val settings = WorktreeSettings.getInstance()
            settings.autoRefresh = autoRefreshCheckBox.isSelected
            settings.refreshInterval = refreshIntervalSpinner.value as Int
            settings.showInStatusBar = showInStatusBarCheckBox.isSelected
            settings.showMainWorktreeIcon = showMainWorktreeIconCheckBox.isSelected
            settings.confirmRemove = confirmRemoveCheckBox.isSelected
            settings.openInNewWindow = openInNewWindowCheckBox.isSelected
            settings.defaultWorktreePath = defaultWorktreePathField.text
            
            // Update original values after saving
            storeOriginalValues()
        }
        
        fun reset() {
            loadSettings()
        }
        
        private fun loadSettings() {
            val settings = WorktreeSettings.getInstance()
            autoRefreshCheckBox.isSelected = settings.autoRefresh
            refreshIntervalSpinner.value = settings.refreshInterval
            showInStatusBarCheckBox.isSelected = settings.showInStatusBar
            showMainWorktreeIconCheckBox.isSelected = settings.showMainWorktreeIcon
            confirmRemoveCheckBox.isSelected = settings.confirmRemove
            openInNewWindowCheckBox.isSelected = settings.openInNewWindow
            defaultWorktreePathField.text = settings.defaultWorktreePath
            
            storeOriginalValues()
        }
        
        private fun storeOriginalValues() {
            originalValues = mapOf(
                "autoRefresh" to autoRefreshCheckBox.isSelected,
                "refreshInterval" to refreshIntervalSpinner.value,
                "showInStatusBar" to showInStatusBarCheckBox.isSelected,
                "showMainWorktreeIcon" to showMainWorktreeIconCheckBox.isSelected,
                "confirmRemove" to confirmRemoveCheckBox.isSelected,
                "openInNewWindow" to openInNewWindowCheckBox.isSelected,
                "defaultWorktreePath" to defaultWorktreePathField.text
            )
        }
    }
}

// Settings storage class
object WorktreeSettings {
    private const val SETTINGS_KEY = "GitWorktreeManager"
    
    var autoRefresh: Boolean = true
    var refreshInterval: Int = 30
    var showInStatusBar: Boolean = true
    var showMainWorktreeIcon: Boolean = true
    var confirmRemove: Boolean = true
    var openInNewWindow: Boolean = true
    var defaultWorktreePath: String = ""
    
    fun getInstance(): WorktreeSettings = this
    
    // In a real implementation, these values would be persisted using
    // PropertiesComponent or PersistentStateComponent
}