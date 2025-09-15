import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GitWorktreeManager } from './git';
import { TerminalManager } from './terminal';

let mainWindow: BrowserWindow | null = null;
let gitManager: GitWorktreeManager | null = null;
let terminalManager: TerminalManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  terminalManager = new TerminalManager();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('open-project', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    gitManager = new GitWorktreeManager(repoPath);
    return repoPath;
  }
  return null;
});

ipcMain.handle('list-worktrees', async () => {
  if (!gitManager) return [];
  return await gitManager.list();
});

ipcMain.handle('add-worktree', async (_, branch: string, newBranch: boolean) => {
  if (!gitManager) throw new Error('No repository opened');
  return await gitManager.add(branch, newBranch);
});

ipcMain.handle('remove-worktree', async (_, worktreePath: string) => {
  if (!gitManager) throw new Error('No repository opened');
  return await gitManager.remove(worktreePath);
});

ipcMain.handle('create-terminal', async (_, workdir: string) => {
  const session = terminalManager.createSession(workdir);
  return { id: session.id, pid: session.pid };
});

ipcMain.on('terminal-input', (_, sessionId: string, data: string) => {
  terminalManager.write(sessionId, data);
});

ipcMain.handle('terminal-resize', (_, sessionId: string, cols: number, rows: number) => {
  terminalManager.resize(sessionId, cols, rows);
});

ipcMain.handle('terminal-close', (_, sessionId: string) => {
  terminalManager.closeSession(sessionId);
});

ipcMain.handle('terminal-get-buffer', (_, sessionId: string) => {
  return terminalManager.getSessionBuffer(sessionId);
});

// File system handlers
ipcMain.handle('read-directory', async (_, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter(entry => !entry.name.startsWith('.') && entry.name !== 'node_modules')
        .map(async entry => {
          const fullPath = path.join(dirPath, entry.name);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory()
          };
        })
    );

    // Sort: directories first, then files
    files.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

    return files;
  } catch (error) {
    console.error('Failed to read directory:', error);
    return [];
  }
});