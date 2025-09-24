package com.alfons.worktree.plugin.utils

import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter

/**
 * 根据模板生成工作树目录，并在需要时追加计数后缀以避免冲突。
 */
object WorktreePathPlanner {

    fun resolve(repositoryRoot: Path, branch: String, template: String): Path {
        val repoName = repositoryRoot.fileName?.toString().orEmpty()
        val sanitizedBranch = sanitize(branch)
        val replacements = mapOf(
            "\$REPO" to repoName,
            "\$BRANCH" to sanitizedBranch,
            "\$DATE" to LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE),
            "\$TIME" to LocalTime.now().format(DateTimeFormatter.ofPattern("HHmmss"))
        )

        var relative = template.ifBlank { ".worktree_\$BRANCH" }
        replacements.forEach { (token, value) ->
            relative = relative.replace(token, value)
        }

        val candidate = repositoryRoot.resolve(relative).normalize()
        return ensureUnique(candidate)
    }

    private fun sanitize(raw: String): String = raw.replace(Regex("[^A-Za-z0-9._-]"), "_")

    private fun ensureUnique(base: Path): Path {
        var candidate = base
        var counter = 1
        while (Files.exists(candidate)) {
            val parent = candidate.parent ?: candidate
            val name = candidate.fileName?.toString() ?: "worktree"
            val newName = "${name}_$counter"
            candidate = parent.resolve(newName)
            counter++
        }
        return candidate
    }
}
