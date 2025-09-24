package com.alfons.worktree.plugin.utils

import com.intellij.openapi.project.Project
import java.nio.file.Path

object TerminalLauncher {
    fun open(project: Project, path: Path): Result<Unit> = runCatching {
        val clazz = Class.forName("com.intellij.terminal.TerminalView")
        val getInstance = clazz.getMethod("getInstance", Project::class.java)
        val view = getInstance.invoke(null, project)
        val createWidget = clazz.getMethod("createLocalShellWidget", String::class.java, String::class.java)
        val widget = createWidget.invoke(view, path.toString(), path.fileName.toString())
        val execute = widget.javaClass.getMethod("executeCommand", String::class.java)
        execute.invoke(widget, "cd ${path.toAbsolutePath()}")
    }
}
