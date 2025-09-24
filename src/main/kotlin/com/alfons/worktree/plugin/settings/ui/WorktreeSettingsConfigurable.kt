package com.alfons.worktree.plugin.settings.ui

import com.alfons.worktree.plugin.settings.WorktreeSettingsService
import com.alfons.worktree.plugin.settings.WorktreeSettingsState
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.Configurable.NoScroll
import javax.swing.JComponent

class WorktreeSettingsConfigurable : Configurable, NoScroll {
    private val service = WorktreeSettingsService.getInstance()
    private var component: WorktreeSettingsComponent? = null
    private var stateSnapshot: WorktreeSettingsState = service.currentState.copy()

    override fun getDisplayName(): String = "Worktree"

    override fun createComponent(): JComponent {
        val comp = WorktreeSettingsComponent()
        comp.setState(stateSnapshot)
        component = comp
        return comp.getPanel()
    }

    override fun getPreferredFocusedComponent(): JComponent? = component?.getPreferredFocusedComponent()

    override fun isModified(): Boolean {
        val comp = component ?: return false
        val newState = comp.toState(stateSnapshot)
        return newState != stateSnapshot
    }

    override fun apply() {
        val comp = component ?: return
        val newState = comp.toState(stateSnapshot)
        stateSnapshot = newState
        service.loadState(newState)
    }

    override fun reset() {
        stateSnapshot = service.currentState.copy()
        component?.setState(stateSnapshot)
    }

    override fun disposeUIResources() {
        component = null
    }
}
