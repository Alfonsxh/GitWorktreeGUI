package com.alfons.worktree.plugin.utils

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import java.nio.file.Files
import java.nio.file.Path

class WorktreePathPlannerTest {

    @Test
    fun `resolve replaces tokens and normalizes`() {
        val repoRoot = Files.createTempDirectory("repo-root")
        val branch = "feature/login"
        val template = "../.worktree_\$REPO_\$BRANCH"

        val result = WorktreePathPlanner.resolve(repoRoot, branch, template)

        assertTrue(result.toString().contains(".worktree_${repoRoot.fileName}_feature_login"))
        assertTrue(result.isAbsolute)
    }

    @Test
    fun `resolve adds numeric suffix when directory exists`() {
        val repoRoot = Files.createTempDirectory("repo-root")
        val template = "../.worktree_\$REPO_\$BRANCH"
        val first = WorktreePathPlanner.resolve(repoRoot, "master", template)
        Files.createDirectories(first)

        val second = WorktreePathPlanner.resolve(repoRoot, "master", template)

        assertTrue(second != first)
        assertTrue(second.fileName.toString().endsWith("_master_1"))
        assertTrue(!Files.exists(second))
    }
}
