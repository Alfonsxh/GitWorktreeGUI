package com.alfons.worktree.plugin.utils

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.util.ExecUtil
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import git4idea.config.GitExecutableManager
import java.nio.file.Path

object GitWorktreeCommands {
    private val log = Logger.getInstance(GitWorktreeCommands::class.java)

    fun lock(project: Project, repoRoot: Path, worktree: Path, reason: String?): Result<Unit> = runGit(
        project,
        repoRoot,
        buildList {
            add("worktree")
            add("lock")
            if (!reason.isNullOrBlank()) {
                add("--reason")
                add(reason)
            }
            add(worktree.toString())
        }
    )

    fun unlock(project: Project, repoRoot: Path, worktree: Path): Result<Unit> = runGit(
        project,
        repoRoot,
        listOf("worktree", "unlock", worktree.toString())
    )

    fun remove(project: Project, repoRoot: Path, worktree: Path, force: Boolean): Result<Unit> = runGit(
        project,
        repoRoot,
        buildList {
            add("worktree")
            add("remove")
            if (force) add("--force")
            add(worktree.toString())
        }
    )

    fun prune(project: Project, repoRoot: Path, dryRun: Boolean): Result<String> = runGitWithOutput(
        project,
        repoRoot,
        buildList {
            add("worktree")
            add("prune")
            if (dryRun) add("--dry-run")
        }
    )

    private fun runGit(project: Project, repoRoot: Path, args: List<String>): Result<Unit> =
        runGitWithOutput(project, repoRoot, args).map { }

    private fun runGitWithOutput(project: Project, repoRoot: Path, args: List<String>): Result<String> = runCatching {
        val gitPath = GitExecutableManager.getInstance().getPathToGit(project)
        val command = GeneralCommandLine(listOf(gitPath) + args).withWorkDirectory(repoRoot.toString())
        val output = ExecUtil.execAndGetOutput(command)
        if (output.exitCode != 0) {
            log.warn("git ${args.joinToString(" ")} failed: ${output.stderr}")
            throw RuntimeException(output.stderr.ifBlank { output.stdout })
        }
        output.stdout
    }
}
