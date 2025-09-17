import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { watch, FSWatcher } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import windowManager from './windowManager';
import { createApplicationMenu, updateRecentProjectsMenu } from './menu';
import appStore from './store';
import type { WebContents } from 'electron';

const execFileAsync = promisify(execFile);
const DEFAULT_GIT_BUFFER = 10 * 1024 * 1024;

type GitStatusMap = Record<string, string>;

async function runGitCommand(
  args: string[],
  cwd: string,
  options: { maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: options.maxBuffer ?? DEFAULT_GIT_BUFFER
    });
    return {
      stdout: stdout?.toString() ?? '',
      stderr: stderr?.toString() ?? ''
    };
  } catch (error: any) {
    const stderr = error?.stderr?.toString().trim();
    const stdout = error?.stdout?.toString().trim();
    const message = stderr || stdout || error.message || 'Unknown git error';
    throw new Error(message);
  }
}

const gitStatusCache = new Map<string, { timestamp: number; data: GitStatusMap }>();
const gitStatusInflight = new Map<string, Promise<GitStatusMap>>();
const GIT_STATUS_TTL_MS = 2000;

const resolveWorktreeKey = (worktreePath: string) => path.resolve(worktreePath);

const toGitRelativePath = (worktreePath: string, filePath: string) =>
  path.relative(worktreePath, filePath).split(path.sep).join('/');

const summariseGitStatus = (files: GitStatusMap) => ({
  dirty: Object.keys(files).length
});

// File system watchers for auto-refresh
const fileWatchers = new Map<string, FSWatcher>();

// Function to setup file system watcher
const setupFileWatcher = (dirPath: string, webContents: WebContents) => {
  // Clean up existing watcher if any
  if (fileWatchers.has(dirPath)) {
    fileWatchers.get(dirPath)?.close();
  }

  try {
    const watcher = watch(dirPath, { recursive: true }, (eventType, filename) => {
      // Ignore certain patterns
      if (!filename) return;
      if (filename.includes('.git/') && !filename.endsWith('.git/index')) return;
      if (filename.includes('node_modules/')) return;
      if (filename.startsWith('.')) return;

      // Debounce updates
      clearTimeout((watcher as any).timeout);
      (watcher as any).timeout = setTimeout(() => {
        invalidateGitStatus(dirPath);
        // Notify renderer of file system change
        webContents.send('file-system-changed', { path: dirPath, filename, eventType });
      }, 300);
    });

    fileWatchers.set(dirPath, watcher);
  } catch (error) {
    console.error('Failed to setup file watcher:', error);
  }
};

const emitGitStatusSummary = (target: WebContents, worktreePath: string, files: GitStatusMap) => {
  target.send('git-status-summary', {
    worktreePath,
    summary: summariseGitStatus(files)
  });
};

const refreshAndEmitGitStatusSummary = async (target: WebContents, worktreePath: string) => {
  const files = await loadGitStatus(worktreePath);
  emitGitStatusSummary(target, worktreePath, files);
};

async function loadGitStatus(
  worktreePath: string,
  options: { force?: boolean } = {}
): Promise<GitStatusMap> {
  const key = resolveWorktreeKey(worktreePath);
  const force = options.force ?? false;

  if (force) {
    gitStatusCache.delete(key);
    gitStatusInflight.delete(key);
  } else {
    const now = Date.now();
    const cached = gitStatusCache.get(key);

    if (cached && now - cached.timestamp < GIT_STATUS_TTL_MS) {
      return cached.data;
    }

    const existingPromise = gitStatusInflight.get(key);
    if (existingPromise) {
      return existingPromise;
    }
  }

  const statusPromise = (async () => {
    const { stdout } = await runGitCommand(['status', '--porcelain'], key);

    const files: GitStatusMap = {};
    stdout
      .split('\n')
      .filter(line => line.trim())
      .forEach(line => {
        const status = line.substring(0, 2).trim();
        const filePath = line.substring(3);
        // Use full path as key to match file system paths
        const fullPath = path.join(key, filePath);

        let fileStatus = '?';
        if (status === 'M' || status === 'MM') fileStatus = 'M';
        else if (status === 'A' || status === 'AM') fileStatus = 'A';
        else if (status === 'D') fileStatus = 'D';
        else if (status === '??') fileStatus = '?';
        else if (status.includes('M')) fileStatus = 'M';

        files[fullPath] = fileStatus;
      });

    return files;
  })();

  gitStatusInflight.set(key, statusPromise);

  try {
    const data = await statusPromise;
    gitStatusCache.set(key, { timestamp: Date.now(), data });
    return data;
  } catch (error) {
    gitStatusCache.delete(key);
    throw error;
  } finally {
    gitStatusInflight.delete(key);
  }
}

const invalidateGitStatus = (worktreePath: string) => {
  const key = resolveWorktreeKey(worktreePath);
  gitStatusCache.delete(key);
  gitStatusInflight.delete(key);
};

function createInitialWindow() {
  // Check for last opened project
  const lastProject = appStore.getLastProjectPath();

  // Create window with last project or empty
  windowManager.createWindow(lastProject || undefined);
}

app.whenReady().then(() => {
  createApplicationMenu();
  createInitialWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create a window when the dock icon is clicked
  if (windowManager.getWindowCount() === 0) {
    createInitialWindow();
  }
});

// Dialog handlers
ipcMain.handle('show-message-box', async (event, options: any) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo) return { response: 0 };

  return dialog.showMessageBox(windowInfo.window, options);
});

ipcMain.handle('show-prompt', async (event, title: string, message: string, defaultValue?: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo) return null;

  // Use a simple input dialog
  const result = await dialog.showMessageBox(windowInfo.window, {
    type: 'question',
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    title: title,
    message: message + (defaultValue ? `\n\nDefault: ${defaultValue}` : ''),
  });

  if (result.response === 0) {
    // For now, return the default value since Electron doesn't have a built-in prompt
    // In a real app, you'd create a custom dialog window
    return defaultValue || '';
  }

  return null;
});

// IPC Handlers
ipcMain.handle('open-project', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);

    if (windowInfo) {
      windowManager.setProjectForWindow(windowInfo.window.id, repoPath);
    }

    appStore.setLastProjectPath(repoPath); // Save to store
    updateRecentProjectsMenu(); // Update menu
    return repoPath;
  }
  return null;
});

// Handler for opening project in new window
ipcMain.handle('open-project-new-window', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];

    // Check if already open
    const existingWindow = windowManager.findWindowByProject(repoPath);
    if (existingWindow) {
      existingWindow.focus();
    } else {
      windowManager.createWindow(repoPath);
    }

    appStore.setLastProjectPath(repoPath);
    updateRecentProjectsMenu();
    return repoPath;
  }
  return null;
});

// Handler to get last project
ipcMain.handle('get-last-project', async () => {
  return appStore.getLastProjectPath();
});

// Handler to clear last project
ipcMain.handle('clear-last-project', async () => {
  appStore.clearLastProjectPath();
});

// Handler to load a specific project path
ipcMain.handle('load-project-path', async (event, projectPath: string) => {
  try {
    // Verify the path exists and is a git repository
    const stats = await fs.stat(projectPath);
    if (stats.isDirectory()) {
      const gitPath = path.join(projectPath, '.git');
      await fs.access(gitPath);

      const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
      if (windowInfo) {
        windowManager.setProjectForWindow(windowInfo.window.id, projectPath);
      }

      appStore.setLastProjectPath(projectPath);
      updateRecentProjectsMenu();
      return projectPath;
    }
  } catch (error) {
    console.error('Failed to load project:', error);
  }
  return null;
});

ipcMain.handle('list-worktrees', async (event) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return [];
  return await windowInfo.gitManager.list();
});

ipcMain.handle('add-worktree', async (event, branch: string, newBranch: boolean) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.add(branch, newBranch);
});

ipcMain.handle('remove-worktree', async (event, worktreePath: string, force: boolean = false) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.remove(worktreePath, force);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('create-terminal', async (event, workdir: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo) throw new Error('Window not found');

  const session = windowInfo.terminalManager.createSession(workdir, event.sender.id);
  return { id: session.id, pid: session.pid };
});

ipcMain.on('terminal-input', (event, sessionId: string, data: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (windowInfo) {
    windowInfo.terminalManager.write(sessionId, data);
  }
});

ipcMain.handle('terminal-resize', (event, sessionId: string, cols: number, rows: number) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (windowInfo) {
    windowInfo.terminalManager.resize(sessionId, cols, rows);
  }
});

ipcMain.handle('terminal-close', (event, sessionId: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (windowInfo) {
    windowInfo.terminalManager.closeSession(sessionId);
  }
});

ipcMain.handle('terminal-get-buffer', (event, sessionId: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo) return [];
  return windowInfo.terminalManager.getSessionBuffer(sessionId);
});

// Start file system watcher
ipcMain.handle('start-file-watcher', (event, dirPath: string) => {
  setupFileWatcher(dirPath, event.sender);
  return { success: true };
});

// Stop file system watcher
ipcMain.handle('stop-file-watcher', (_, dirPath: string) => {
  if (fileWatchers.has(dirPath)) {
    fileWatchers.get(dirPath)?.close();
    fileWatchers.delete(dirPath);
  }
  return { success: true };
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

// Git status handler
ipcMain.handle('git-status', async (event, worktreePath: string, options?: { force?: boolean }) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return {};

  try {
    const files = await loadGitStatus(worktreePath, options);
    emitGitStatusSummary(event.sender, worktreePath, files);
    return files;
  } catch (error) {
    console.error('Failed to get git status:', error);
    return {};
  }
});

// Delete file/directory handler
ipcMain.handle('delete-file', async (_, filePath: string) => {
  const { shell } = require('electron');
  try {
    // Use shell.trashItem for safer deletion (moves to recycle bin)
    await shell.trashItem(filePath);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete file/directory:', error);
    return { success: false, error: error.message };
  }
});

// File read/write handlers
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('[Main] Failed to read file:', filePath, error);
    throw error;
  }
});

ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
});

// Git diff handlers
ipcMain.handle('git-show-file', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return null;

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    const { stdout } = await runGitCommand(['show', `HEAD:${relativePath}`], worktreePath, {
      maxBuffer: 10 * 1024 * 1024
    });

    return stdout;
  } catch (error: any) {
    // If file doesn't exist in HEAD (new file), return null
    if (error.message.includes('does not exist') || error.message.includes('fatal:')) {
      return null;
    }
    console.error('Failed to get file from HEAD:', error);
    throw error;
  }
});

ipcMain.handle('git-diff', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) {
    return null;
  }

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);

    const { stdout } = await runGitCommand(['diff', 'HEAD', '--', relativePath], worktreePath, {
      maxBuffer: 10 * 1024 * 1024
    });

    return stdout;
  } catch (error) {
    console.error('[Main] Failed to get git diff:', error);
    throw error;
  }
});

// Git operations handlers
ipcMain.handle('git-discard', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return false;

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    await runGitCommand(['checkout', 'HEAD', '--', relativePath], worktreePath);

    invalidateGitStatus(worktreePath);
    await refreshAndEmitGitStatusSummary(event.sender, worktreePath);

    return true;
  } catch (error) {
    console.error('Failed to discard changes:', error);
    throw error;
  }
});

ipcMain.handle('git-stage', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return false;

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    await runGitCommand(['add', relativePath], worktreePath);

    invalidateGitStatus(worktreePath);
    await refreshAndEmitGitStatusSummary(event.sender, worktreePath);

    return true;
  } catch (error) {
    console.error('Failed to stage file:', error);
    throw error;
  }
});

ipcMain.handle('git-unstage', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return false;

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    await runGitCommand(['reset', 'HEAD', relativePath], worktreePath);

    invalidateGitStatus(worktreePath);
    await refreshAndEmitGitStatusSummary(event.sender, worktreePath);

    return true;
  } catch (error) {
    console.error('Failed to unstage file:', error);
    throw error;
  }
});

ipcMain.handle('git-log-file', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return [];

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    const { stdout } = await runGitCommand(['log', '--oneline', '-10', '--', relativePath], worktreePath);

    return stdout.split('\n').filter((line: string) => line.trim()).map((line: string) => {
      const [hash, ...messageParts] = line.split(' ');
      return {
        hash,
        message: messageParts.join(' ')
      };
    });
  } catch (error) {
    console.error('Failed to get file history:', error);
    return [];
  }
});

ipcMain.handle('git-blame', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return null;

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    const { stdout } = await runGitCommand(['blame', '--line-porcelain', relativePath], worktreePath, {
      maxBuffer: 10 * 1024 * 1024
    });

    // Parse blame output (simplified)
    return stdout;
  } catch (error) {
    console.error('Failed to get blame info:', error);
    return null;
  }
});

ipcMain.handle('git-diff-stat', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return { additions: 0, deletions: 0 };

  try {
    const relativePath = toGitRelativePath(worktreePath, filePath);
    const { stdout } = await runGitCommand(['diff', '--numstat', 'HEAD', '--', relativePath], worktreePath);

    if (stdout.trim()) {
      const [additions, deletions] = stdout.trim().split('\t').map((n: string) => parseInt(n) || 0);
      return { additions, deletions };
    }

    return { additions: 0, deletions: 0 };
  } catch (error) {
    console.error('Failed to get diff stats:', error);
    return { additions: 0, deletions: 0 };
  }
});

// Git operations for context menu
ipcMain.handle('git-checkout', async (event, worktreePath: string, branch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.checkout(worktreePath, branch);
  await refreshAndEmitGitStatusSummary(event.sender, worktreePath);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('git-switch-branch', async (event, worktreePath: string, branch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.switchBranch(worktreePath, branch);
  await refreshAndEmitGitStatusSummary(event.sender, worktreePath);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('git-merge', async (event, worktreePath: string, targetBranch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.merge(worktreePath, targetBranch);
  await refreshAndEmitGitStatusSummary(event.sender, worktreePath);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('git-rebase', async (event, worktreePath: string, targetBranch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.rebase(worktreePath, targetBranch);
  await refreshAndEmitGitStatusSummary(event.sender, worktreePath);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('git-push', async (event, worktreePath: string, branch?: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.push(worktreePath, branch);
  return;
});

ipcMain.handle('git-pull', async (event, worktreePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  await windowInfo.gitManager.pull(worktreePath);
  await refreshAndEmitGitStatusSummary(event.sender, worktreePath);
  invalidateGitStatus(worktreePath);
  return;
});

ipcMain.handle('git-get-remote-url', async (event) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.getRemoteUrl();
});

ipcMain.handle('git-get-current-branch', async (event, worktreePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.getCurrentBranch(worktreePath);
});

ipcMain.handle('git-get-all-branches', async (event) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.getAllBranches();
});

ipcMain.handle('git-create-merge-request', async (event, worktreePath: string, targetBranch?: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.createMergeRequest(worktreePath, targetBranch);
});
