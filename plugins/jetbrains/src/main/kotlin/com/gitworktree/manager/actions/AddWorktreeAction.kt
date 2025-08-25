package com.gitworktree.manager.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.components.JBTextField
import com.intellij.ui.components.JBCheckBox
import com.intellij.util.ui.FormBuilder
import com.gitworktree.manager.models.WorktreeCreationRequest
import com.gitworktree.manager.services.WorktreeService
import com.gitworktree.manager.ui.WorktreePanel
import javax.swing.JComponent
import javax.swing.JPanel
import java.io.File

class AddWorktreeAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        
        val dialog = AddWorktreeDialog(project)
        if (dialog.showAndGet()) {
            val request = dialog.getRequest()
            
            ApplicationManager.getApplication().executeOnPooledThread {
                val service = project.getService(WorktreeService::class.java)
                val success = service.addWorktree(request)
                
                ApplicationManager.getApplication().invokeLater {
                    if (success) {
                        Messages.showInfoMessage(
                            project,
                            "Worktree created successfully at ${request.path}",
                            "Success"
                        )
                        refreshWorktreePanel(project)
                    } else {
                        Messages.showErrorDialog(
                            project,
                            "Failed to create worktree. Check the IDE log for details.",
                            "Error"
                        )
                    }
                }
            }
        }
    }
    
    private fun refreshWorktreePanel(project: Project) {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Git Worktree")
        val content = toolWindow?.contentManager?.getContent(0)
        val panel = content?.component as? WorktreePanel
        panel?.refreshWorktrees()
    }
    
    private class AddWorktreeDialog(private val project: Project) : DialogWrapper(project) {
        private val branchField = JBTextField()
        private val pathField = TextFieldWithBrowseButton()
        private val createNewBranchCheckBox = JBCheckBox("Create new branch")
        private val baseBranchField = JBTextField()
        
        init {
            title = "Add Git Worktree"
            init()
            
            setupPathField()
            setupBranchFields()
        }
        
        private fun setupPathField() {
            pathField.addBrowseFolderListener(
                "Select Worktree Directory",
                "Choose where to create the worktree",
                project,
                FileChooserDescriptorFactory.createSingleFolderDescriptor()
            )
            
            // Set default path
            project.basePath?.let { basePath ->
                val parentDir = File(basePath).parent
                pathField.text = parentDir
            }
        }
        
        private fun setupBranchFields() {
            createNewBranchCheckBox.addActionListener {
                baseBranchField.isEnabled = createNewBranchCheckBox.isSelected
            }
            baseBranchField.isEnabled = false
            baseBranchField.text = "HEAD"
        }
        
        override fun createCenterPanel(): JComponent {
            return FormBuilder.createFormBuilder()
                .addLabeledComponent("Branch name:", branchField)
                .addComponent(createNewBranchCheckBox)
                .addLabeledComponent("Base branch:", baseBranchField)
                .addLabeledComponent("Worktree path:", pathField)
                .panel
        }
        
        override fun doValidate(): ValidationInfo? {
            if (branchField.text.isBlank()) {
                return ValidationInfo("Branch name is required", branchField)
            }
            
            if (pathField.text.isBlank()) {
                return ValidationInfo("Worktree path is required", pathField)
            }
            
            val path = File(pathField.text)
            if (path.exists() && path.listFiles()?.isNotEmpty() == true) {
                return ValidationInfo("Directory must be empty", pathField)
            }
            
            return null
        }
        
        fun getRequest(): WorktreeCreationRequest {
            val branchName = branchField.text
            val fullPath = if (createNewBranchCheckBox.isSelected) {
                File(pathField.text, branchName).absolutePath
            } else {
                File(pathField.text, branchName).absolutePath
            }
            
            return WorktreeCreationRequest(
                branch = branchName,
                path = fullPath,
                createNewBranch = createNewBranchCheckBox.isSelected,
                baseBranch = if (createNewBranchCheckBox.isSelected) baseBranchField.text else null
            )
        }
    }
}