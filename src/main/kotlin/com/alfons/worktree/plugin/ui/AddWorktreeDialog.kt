package com.alfons.worktree.plugin.ui

import com.alfons.worktree.plugin.settings.WorktreeSettingsState
import com.alfons.worktree.plugin.utils.WorktreePathPlanner
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.ValidationInfo
import com.intellij.ui.CollectionComboBoxModel
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import git4idea.repo.GitRepository
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JComboBox
import javax.swing.event.DocumentEvent
import javax.swing.event.DocumentListener

class AddWorktreeDialog(
    project: Project,
    private val repository: GitRepository,
    private val settings: WorktreeSettingsState
) : DialogWrapper(project) {

    data class Result(
        val checkoutBranch: String,
        val baseBranch: String,
        val createNew: Boolean,
        val pathPreview: java.nio.file.Path,
        val openTerminal: Boolean,
        val openProject: Boolean
    )

    private val branches = repository.branches.localBranches.map { it.name }.sorted()
    private val branchModel = CollectionComboBoxModel(branches)
    private val baseBranchCombo = JComboBox(branchModel)
    private val newBranchField = JBTextField()
    private val pathLabel = JBLabel()
    private val autoOpenTerminalCheck = JBCheckBox("创建后打开终端", settings.autoOpenTerminal)
    private val autoOpenProjectCheck = JBCheckBox("创建后在 IDE 中打开", settings.autoOpenProject)

    private var computedResult: Result? = null

    init {
        title = "Add Worktree"
        baseBranchCombo.isEditable = false
        if (repository.currentBranchName != null) {
            baseBranchCombo.selectedItem = repository.currentBranchName
        }
        newBranchField.emptyText.text = "可选：新建分支名称"
        init()
        updatePreview()
    }

    override fun createCenterPanel(): JComponent {
        val panel: JPanel = FormBuilder.createFormBuilder()
            .addLabeledComponent("基准分支", baseBranchCombo, 1, false)
            .addLabeledComponent("新建分支", newBranchField, 1, false)
            .addComponent(JBLabel("目标目录："))
            .addComponent(pathLabel)
            .addComponent(autoOpenTerminalCheck)
            .addComponent(autoOpenProjectCheck)
            .panel

        baseBranchCombo.addActionListener { updatePreview() }
        newBranchField.document.addDocumentListener(object : DocumentListener {
            override fun insertUpdate(e: DocumentEvent) = updatePreview()
            override fun removeUpdate(e: DocumentEvent) = updatePreview()
            override fun changedUpdate(e: DocumentEvent) = updatePreview()
        })
        return panel
    }

    private fun effectiveBranch(): String {
        val newBranch = newBranchField.text.trim()
        return if (newBranch.isNotEmpty()) newBranch else (baseBranchCombo.selectedItem as? String ?: "")
    }

    private fun updatePreview() {
        val branch = effectiveBranch()
        if (branch.isBlank()) {
            pathLabel.text = "请先选择或输入分支"
            return
        }
        val path = WorktreePathPlanner.resolve(repository.root.toNioPath(), branch, settings.pathTemplate)
        pathLabel.text = path.toString()
    }

    override fun doValidate(): ValidationInfo? {
        val branch = effectiveBranch()
        if (branch.isBlank()) {
            return ValidationInfo("分支名称不能为空", newBranchField)
        }
        val newBranch = newBranchField.text.trim()
        if (newBranch.isNotEmpty()) {
            val exists = branches.contains(newBranch)
            if (exists) {
                return ValidationInfo("新建分支已存在", newBranchField)
            }
        }
        if (baseBranchCombo.selectedItem == null) {
            return ValidationInfo("请选择基准分支", baseBranchCombo)
        }
        return null
    }

    override fun doOKAction() {
        if (!okAction.isEnabled) return
        val validation = doValidate()
        if (validation != null) {
            validation.component?.requestFocus()
            return
        }
        val branch = effectiveBranch()
        val baseBranch = baseBranchCombo.selectedItem as? String ?: branch
        val path = WorktreePathPlanner.resolve(repository.root.toNioPath(), branch, settings.pathTemplate)
        computedResult = Result(
            checkoutBranch = branch,
            baseBranch = baseBranch,
            createNew = newBranchField.text.trim().isNotEmpty(),
            pathPreview = path,
            openTerminal = autoOpenTerminalCheck.isSelected,
            openProject = autoOpenProjectCheck.isSelected
        )
        super.doOKAction()
    }

    fun result(): Result? = computedResult
}
