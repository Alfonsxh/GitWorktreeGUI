package com.alfons.worktree.plugin.settings.ui

import com.alfons.worktree.plugin.settings.WorktreeSettingsState
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

class WorktreeSettingsComponent {
    private val pathTemplateField = JBTextField()
    private val autoOpenTerminal = JBCheckBox("创建工作树后自动打开终端")
    private val autoOpenProject = JBCheckBox("创建工作树后在 IDE 中打开")
    private val confirmDangerOps = JBCheckBox("危险操作前需要确认")

    private val panel: JPanel = FormBuilder.createFormBuilder()
        .addLabeledComponent("路径模板", pathTemplateField, 1, false)
        .addComponent(JBLabel("可用占位符：\$REPO, \$BRANCH, \$DATE, \$TIME"))
        .addComponent(autoOpenTerminal)
        .addComponent(autoOpenProject)
        .addComponent(confirmDangerOps)
        .panel

    fun getPanel(): JComponent = panel

    fun getPreferredFocusedComponent(): JComponent = pathTemplateField

    fun setState(state: WorktreeSettingsState) {
        pathTemplateField.text = state.pathTemplate
        autoOpenTerminal.isSelected = state.autoOpenTerminal
        autoOpenProject.isSelected = state.autoOpenProject
        confirmDangerOps.isSelected = state.confirmDangerousOperations
    }

    fun toState(original: WorktreeSettingsState): WorktreeSettingsState = original.copy(
        pathTemplate = pathTemplateField.text.trim(),
        autoOpenTerminal = autoOpenTerminal.isSelected,
        autoOpenProject = autoOpenProject.isSelected,
        confirmDangerousOperations = confirmDangerOps.isSelected
    )
}
