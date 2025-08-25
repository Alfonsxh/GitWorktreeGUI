package com.gitworktree.manager.services

import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.VcsException
import git4idea.commands.*
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryManager
import com.gitworktree.manager.models.Worktree
import com.gitworktree.manager.models.WorktreeCreationRequest
import java.io.File

@Service(Service.Level.PROJECT)
class WorktreeService(private val project: Project) {
    
    companion object {
        private val LOG = Logger.getInstance(WorktreeService::class.java)
    }
    
    private val repositoryManager: GitRepositoryManager
        get() = GitRepositoryManager.getInstance(project)
    
    fun listWorktrees(): List<Worktree> {
        val repository = getRepository() ?: return emptyList()
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("list", "--porcelain")
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                parseWorktreeOutput(result.output)
            } else {
                LOG.error("Failed to list worktrees: ${result.errorOutputAsJoinedString}")
                emptyList()
            }
        } catch (e: VcsException) {
            LOG.error("Error listing worktrees", e)
            emptyList()
        }
    }
    
    fun addWorktree(request: WorktreeCreationRequest): Boolean {
        val repository = getRepository() ?: return false
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("add")
            
            if (request.createNewBranch) {
                handler.addParameters("-b", request.branch)
                if (request.baseBranch != null) {
                    handler.addParameters(request.path, request.baseBranch)
                } else {
                    handler.addParameters(request.path)
                }
            } else {
                handler.addParameters(request.path, request.branch)
            }
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                LOG.info("Successfully created worktree at ${request.path}")
                true
            } else {
                LOG.error("Failed to create worktree: ${result.errorOutputAsJoinedString}")
                false
            }
        } catch (e: VcsException) {
            LOG.error("Error creating worktree", e)
            false
        }
    }
    
    fun removeWorktree(worktree: Worktree, force: Boolean = false): Boolean {
        val repository = getRepository() ?: return false
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("remove")
            
            if (force) {
                handler.addParameters("--force")
            }
            
            handler.addParameters(worktree.path)
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                LOG.info("Successfully removed worktree at ${worktree.path}")
                true
            } else {
                LOG.error("Failed to remove worktree: ${result.errorOutputAsJoinedString}")
                false
            }
        } catch (e: VcsException) {
            LOG.error("Error removing worktree", e)
            false
        }
    }
    
    fun lockWorktree(worktree: Worktree, reason: String? = null): Boolean {
        val repository = getRepository() ?: return false
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("lock")
            
            if (reason != null) {
                handler.addParameters("--reason", reason)
            }
            
            handler.addParameters(worktree.path)
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                LOG.info("Successfully locked worktree at ${worktree.path}")
                true
            } else {
                LOG.error("Failed to lock worktree: ${result.errorOutputAsJoinedString}")
                false
            }
        } catch (e: VcsException) {
            LOG.error("Error locking worktree", e)
            false
        }
    }
    
    fun unlockWorktree(worktree: Worktree): Boolean {
        val repository = getRepository() ?: return false
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("unlock", worktree.path)
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                LOG.info("Successfully unlocked worktree at ${worktree.path}")
                true
            } else {
                LOG.error("Failed to unlock worktree: ${result.errorOutputAsJoinedString}")
                false
            }
        } catch (e: VcsException) {
            LOG.error("Error unlocking worktree", e)
            false
        }
    }
    
    fun pruneWorktrees(dryRun: Boolean = false): Boolean {
        val repository = getRepository() ?: return false
        
        return try {
            val command = GitCommand("worktree")
            val handler = GitLineHandler(project, repository.root, command)
            handler.addParameters("prune")
            
            if (dryRun) {
                handler.addParameters("--dry-run")
            }
            
            val result = Git.getInstance().runCommand(handler)
            if (result.success()) {
                LOG.info("Successfully pruned worktrees")
                true
            } else {
                LOG.error("Failed to prune worktrees: ${result.errorOutputAsJoinedString}")
                false
            }
        } catch (e: VcsException) {
            LOG.error("Error pruning worktrees", e)
            false
        }
    }
    
    private fun getRepository(): GitRepository? {
        val repositories = repositoryManager.repositories
        return repositories.firstOrNull()
    }
    
    private fun parseWorktreeOutput(lines: List<String>): List<Worktree> {
        val worktrees = mutableListOf<Worktree>()
        var currentWorktree: MutableMap<String, String>? = null
        
        for (line in lines) {
            when {
                line.startsWith("worktree ") -> {
                    currentWorktree?.let { worktrees.add(createWorktree(it)) }
                    currentWorktree = mutableMapOf("path" to line.substring(9))
                }
                line.startsWith("HEAD ") -> {
                    currentWorktree?.put("head", line.substring(5))
                }
                line.startsWith("branch ") -> {
                    currentWorktree?.put("branch", line.substring(7))
                }
                line.startsWith("detached") -> {
                    currentWorktree?.put("detached", "true")
                }
                line.startsWith("locked") -> {
                    val parts = line.split(" ", limit = 2)
                    currentWorktree?.put("locked", "true")
                    if (parts.size > 1) {
                        currentWorktree?.put("lockedReason", parts[1])
                    }
                }
                line.startsWith("prunable") -> {
                    val parts = line.split(" ", limit = 2)
                    currentWorktree?.put("prunable", "true")
                    if (parts.size > 1) {
                        currentWorktree?.put("prunableReason", parts[1])
                    }
                }
                line.isEmpty() -> {
                    currentWorktree?.let { worktrees.add(createWorktree(it)) }
                    currentWorktree = null
                }
            }
        }
        
        // Add the last worktree if exists
        currentWorktree?.let { worktrees.add(createWorktree(it)) }
        
        // Mark the first worktree as main if it exists
        if (worktrees.isNotEmpty()) {
            worktrees[0] = worktrees[0].copy(isMainWorktree = true)
        }
        
        return worktrees
    }
    
    private fun createWorktree(data: Map<String, String>): Worktree {
        return Worktree(
            path = data["path"] ?: "",
            head = data["head"] ?: "",
            branch = if (data["detached"] == "true") null else data["branch"],
            locked = data["locked"] == "true",
            lockedReason = data["lockedReason"],
            prunable = data["prunable"] == "true",
            prunableReason = data["prunableReason"]
        )
    }
}