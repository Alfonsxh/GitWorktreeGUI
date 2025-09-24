package com.alfons.worktree.plugin.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.Logger

/**
 * 应用级设置，负责工作树路径模板与自动操作策略。
 */
@State(name = "WorktreeSettings", storages = [Storage("worktree-settings.xml")])
class WorktreeSettingsService : PersistentStateComponent<WorktreeSettingsState> {
    private val log = Logger.getInstance(WorktreeSettingsService::class.java)

    private var state = WorktreeSettingsState()

    override fun getState(): WorktreeSettingsState = state

    override fun loadState(state: WorktreeSettingsState) {
        log.debug("Loading worktree settings: $state")
        this.state = state
    }

    companion object {
        fun getInstance(): WorktreeSettingsService = service()
    }

    val currentState: WorktreeSettingsState
        get() = state
}

data class WorktreeSettingsState(
    var pathTemplate: String = "../.worktree_\$REPO_\$BRANCH",
    var autoOpenTerminal: Boolean = true,
    var autoOpenProject: Boolean = false,
    var confirmDangerousOperations: Boolean = true,
    var pruneThresholdDays: Int = 30,
    var terminalCommandTemplate: String = ""
)
