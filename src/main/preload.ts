import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openProject: () => ipcRenderer.invoke('open-project'),
  listWorktrees: () => ipcRenderer.invoke('list-worktrees'),
  addWorktree: (branch: string, newBranch: boolean) =>
    ipcRenderer.invoke('add-worktree', branch, newBranch),
  removeWorktree: (worktreePath: string) =>
    ipcRenderer.invoke('remove-worktree', worktreePath),

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
    ipcRenderer.invoke('write-file', filePath, content)
});