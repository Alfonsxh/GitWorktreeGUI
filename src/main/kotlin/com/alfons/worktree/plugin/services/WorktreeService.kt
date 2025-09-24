package com.alfons.worktree.plugin.services

import com.alfons.worktree.plugin.settings.WorktreeSettingsService
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.util.ExecUtil
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import com.intellij.util.messages.Topic
import git4idea.config.GitExecutableManager
import git4idea.repo.GitRepository
import git4idea.repo.GitRepository.GIT_REPO_CHANGE
import git4idea.repo.GitRepositoryChangeListener
import git4idea.repo.GitRepositoryManager
import java.nio.file.Path
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

/**
 * 项目级核心服务：
 *  - 抽取当前项目内所有 Git 仓库的 worktree 信息
 *  - 解析 `git worktree list --porcelain`
 *  - 提供订阅接口供 UI 组件使用
 */
@Service(Service.Level.PROJECT)
class WorktreeService(private val project: Project) {

    private val log = Logger.getInstance(WorktreeService::class.java)
    private val settings by lazy { WorktreeSettingsService.getInstance().state }
    private val repositoryManager = GitRepositoryManager.getInstance(project)

    private val descriptors = ConcurrentHashMap<String, WorktreeDescriptor>()
    private val cachedSorted = AtomicReference<List<WorktreeDescriptor>>(emptyList())

    init {
        scheduleRefresh(RefreshTrigger.Startup)
        project.messageBus.connect().subscribe(GIT_REPO_CHANGE, GitRepoListener { scheduleRefresh(RefreshTrigger.GitEvent) })
    }

    fun scheduleRefresh(trigger: RefreshTrigger) {
        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Refreshing worktrees", false) {
            override fun run(indicator: ProgressIndicator) {
                refresher(trigger, indicator)
            }
        })
    }

    fun currentSnapshot(): List<WorktreeDescriptor> = cachedSorted.get()

    private fun refresher(trigger: RefreshTrigger, indicator: ProgressIndicator) {
        indicator.text = "Enumerating worktrees"
        val allDescriptors = mutableListOf<WorktreeDescriptor>()
        for (repository in repositoryManager.repositories) {
            indicator.checkCanceled()
            allDescriptors += fetchRepositoryWorktrees(repository)
        }
        descriptors.clear()
        allDescriptors.forEach { descriptors[it.id] = it }
        publishUpdate(trigger)
    }

    private fun publishUpdate(trigger: RefreshTrigger) {
        val snapshot = descriptors.values.sortedBy { it.branchName }
        cachedSorted.set(snapshot)
        log.info("Worktree refresh [$trigger] -> ${snapshot.size} entries")
        project.messageBus.syncPublisher(TOPIC).stateUpdated(snapshot)
    }

    private fun fetchRepositoryWorktrees(repository: GitRepository): List<WorktreeDescriptor> {
        val gitPath = GitExecutableManager.getInstance().getPathToGit(repository.project)
        val command = GeneralCommandLine(gitPath, "worktree", "list", "--porcelain")
            .withWorkDirectory(repository.root.path)
        val output = ExecUtil.execAndGetOutput(command)
        if (output.exitCode != 0) {
            log.warn("Failed to list worktrees for ${repository.presentableUrl}: ${output.stderr}")
            return emptyList()
        }
        return parsePorcelain(repository, output.stdoutLines)
    }

    private fun parsePorcelain(repository: GitRepository, lines: List<String>): List<WorktreeDescriptor> {
        val repoRoot = repository.root.toNioPath()
        val descriptors = mutableListOf<WorktreeDescriptor>()
        var worktreePath: Path? = null
        var head: String? = null
        var branch: String? = null
        var locked = false
        var lockReason: String? = null
        var isMainWorktree = false
        for (raw in lines + "") {
            val line = raw.trimEnd()
            if (line.isEmpty()) {
                if (worktreePath != null && branch != null) {
                    val id = "${repoRoot}_${worktreePath}_${branch}"
                    descriptors += WorktreeDescriptor(
                        id = id,
                        repositoryRoot = repoRoot,
                        branchName = branch.substringAfterLast('/'),
                        worktreePath = worktreePath,
                        headRevision = head,
                        locked = locked,
                        lockReason = lockReason,
                        isMain = isMainWorktree
                    )
                }
                worktreePath = null
                head = null
                branch = null
                locked = false
                lockReason = null
                isMainWorktree = false
                continue
            }
            when {
                line.startsWith("worktree ") -> worktreePath = Path.of(line.removePrefix("worktree ")).normalize()
                line.startsWith("HEAD ") -> head = line.removePrefix("HEAD ")
                line.startsWith("branch ") -> branch = line.removePrefix("branch ")
                line.startsWith("bare") -> isMainWorktree = true
                line.startsWith("locked") -> {
                    locked = true
                    lockReason = line.substringAfter(' ', "").ifBlank { null }
                }
            }
        }
        return descriptors
    }

    fun register(descriptor: WorktreeDescriptor) {
        descriptors[descriptor.id] = descriptor
        publishUpdate(RefreshTrigger.ModelChange)
    }

    fun remove(id: String) {
        descriptors.remove(id)
        publishUpdate(RefreshTrigger.ModelChange)
    }

    data class WorktreeDescriptor(
        val id: String,
        val repositoryRoot: Path,
        val branchName: String,
        val worktreePath: Path,
        val headRevision: String? = null,
        val locked: Boolean = false,
        val lockReason: String? = null,
        val dirty: Boolean = false,
        val lastUsed: Instant? = null,
        val displayName: String? = null,
        val isMain: Boolean = false
    )

    enum class RefreshTrigger { Startup, Manual, ModelChange, GitEvent, FileSystem }

    interface WorktreeModelListener {
        fun stateUpdated(descriptors: List<WorktreeDescriptor>)
    }

    companion object {
        val TOPIC: Topic<WorktreeModelListener> = Topic.create("WorktreeModel", WorktreeModelListener::class.java)

        fun getInstance(project: Project): WorktreeService = project.service()
    }

    private class GitRepoListener(private val callback: () -> Unit) : GitRepositoryChangeListener {
        override fun repositoryChanged(repository: GitRepository) {
            callback()
        }
    }
}
