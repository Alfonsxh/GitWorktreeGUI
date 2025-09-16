import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openProject: () => ipcRenderer.invoke('open-project'),
  openProjectNewWindow: () => ipcRenderer.invoke('open-project-new-window'),
  getLastProject: () => ipcRenderer.invoke('get-last-project'),
  clearLastProject: () => ipcRenderer.invoke('clear-last-project'),
  loadProjectPath: (projectPath: string) => ipcRenderer.invoke('load-project-path', projectPath),
  onLoadProject: (callback: (projectPath: string) => void) => {
    ipcRenderer.on('load-project', (_, projectPath) => callback(projectPath));
  },
  listWorktrees: () => ipcRenderer.invoke('list-worktrees'),
  addWorktree: (branch: string, newBranch: boolean) =>
    ipcRenderer.invoke('add-worktree', branch, newBranch),
  removeWorktree: (worktreePath: string, force?: boolean) =>
    ipcRenderer.invoke('remove-worktree', worktreePath, force),

  // Terminal API
  createTerminal: (workdir: string) =>
    ipcRenderer.invoke('create-terminal', workdir),
  terminalInput: (sessionId: string, data: string) =>
    ipcRenderer.send('terminal-input', sessionId, data),
  terminalResize: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal-resize', sessionId, cols, rows),
  terminalClose: (sessionId: string) =>
    ipcRenderer.invoke('terminal-close', sessionId),
  terminalGetBuffer: (sessionId: string) =>
    ipcRenderer.invoke('terminal-get-buffer', sessionId),

  onTerminalOutput: (sessionId: string, callback: (data: string) => void) => {
    const channel = `terminal-output-${sessionId}`;
    const handler = (_: any, data: string) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onTerminalClosed: (sessionId: string, callback: () => void) => {
    const channel = `terminal-closed-${sessionId}`;
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // File system API
  readDirectory: (dirPath: string) =>
    ipcRenderer.invoke('read-directory', dirPath),
  gitStatus: (worktreePath: string) =>
    ipcRenderer.invoke('git-status', worktreePath),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', filePath, content),

  // Git diff API
  gitShowFile: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-show-file', worktreePath, filePath),
  gitDiff: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-diff', worktreePath, filePath),

  // Git operations API
  gitDiscard: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-discard', worktreePath, filePath),
  gitStage: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-stage', worktreePath, filePath),
  gitUnstage: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-unstage', worktreePath, filePath),
  gitLogFile: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-log-file', worktreePath, filePath),
  gitBlame: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-blame', worktreePath, filePath),
  gitDiffStat: (worktreePath: string, filePath: string) =>
    ipcRenderer.invoke('git-diff-stat', worktreePath, filePath),

  // Git operations for context menu
  gitCheckout: (worktreePath: string, branch: string) =>
    ipcRenderer.invoke('git-checkout', worktreePath, branch),
  gitMerge: (worktreePath: string, targetBranch: string) =>
    ipcRenderer.invoke('git-merge', worktreePath, targetBranch),
  gitRebase: (worktreePath: string, targetBranch: string) =>
    ipcRenderer.invoke('git-rebase', worktreePath, targetBranch),
  gitPush: (worktreePath: string, branch?: string) =>
    ipcRenderer.invoke('git-push', worktreePath, branch),
  gitPull: (worktreePath: string) =>
    ipcRenderer.invoke('git-pull', worktreePath),
  gitGetRemoteUrl: () =>
    ipcRenderer.invoke('git-get-remote-url'),
  gitGetCurrentBranch: (worktreePath: string) =>
    ipcRenderer.invoke('git-get-current-branch', worktreePath),
  gitGetAllBranches: () =>
    ipcRenderer.invoke('git-get-all-branches'),
  gitCreateMergeRequest: (worktreePath: string, targetBranch?: string) =>
    ipcRenderer.invoke('git-create-merge-request', worktreePath, targetBranch),

  // Dialog API
  showMessageBox: (options: any) =>
    ipcRenderer.invoke('show-message-box', options),
  showPrompt: (title: string, message: string, defaultValue?: string) =>
    ipcRenderer.invoke('show-prompt', title, message, defaultValue)
});