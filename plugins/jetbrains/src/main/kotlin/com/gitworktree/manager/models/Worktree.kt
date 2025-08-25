package com.gitworktree.manager.models

data class Worktree(
    val path: String,
    val head: String,
    val branch: String?,
    val isMainWorktree: Boolean = false,
    val locked: Boolean = false,
    val lockedReason: String? = null,
    val prunable: Boolean = false,
    val prunableReason: String? = null
) {
    val displayName: String
        get() = branch ?: "detached HEAD"
    
    val shortHead: String
        get() = if (head.length > 10) head.substring(0, 10) else head
    
    fun getStatusIcon(): String {
        return when {
            isMainWorktree -> "⭐"
            locked -> "🔒"
            prunable -> "⚠️"
            else -> "📁"
        }
    }
}

data class WorktreeCreationRequest(
    val branch: String,
    val path: String,
    val createNewBranch: Boolean = false,
    val baseBranch: String? = null
)