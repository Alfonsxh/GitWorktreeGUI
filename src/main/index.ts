import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GitWorktreeManager } from './git';
import windowManager from './windowManager';
import { createApplicationMenu, updateRecentProjectsMenu } from './menu';
import appStore from './store';

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
  return await windowInfo.gitManager.remove(worktreePath, force);
});

ipcMain.handle('create-terminal', async (event, workdir: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo) throw new Error('Window not found');

  const session = windowInfo.terminalManager.createSession(workdir);
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
ipcMain.handle('git-status', async (event, worktreePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return {};

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync('git status --porcelain', {
      cwd: worktreePath
    });

    const files: { [key: string]: string } = {};
    const lines = stdout.split('\n').filter((line: string) => line.trim());

    lines.forEach((line: string) => {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3);
      const fullPath = path.join(worktreePath, filePath);

      // Map git status codes to simple status
      let fileStatus = '?';
      if (status === 'M' || status === 'MM') fileStatus = 'M';
      else if (status === 'A' || status === 'AM') fileStatus = 'A';
      else if (status === 'D') fileStatus = 'D';
      else if (status === '??') fileStatus = '?';
      else if (status.includes('M')) fileStatus = 'M';

      files[fullPath] = fileStatus;
    });

    return files;
  } catch (error) {
    console.error('Failed to get git status:', error);
    return {};
  }
});

// File read/write handlers
ipcMain.handle('read-file', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Failed to read file:', error);
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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Get relative path from worktree root
    const relativePath = path.relative(worktreePath, filePath);

    // Get file content from HEAD
    const { stdout } = await execAsync(`git show HEAD:"${relativePath}"`, {
      cwd: worktreePath,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
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
  if (!windowInfo || !windowInfo.gitManager) return null;

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Get relative path from worktree root
    const relativePath = path.relative(worktreePath, filePath);

    // Get unified diff
    const { stdout } = await execAsync(`git diff HEAD -- "${relativePath}"`, {
      cwd: worktreePath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    return stdout;
  } catch (error) {
    console.error('Failed to get git diff:', error);
    throw error;
  }
});

// Git operations handlers
ipcMain.handle('git-discard', async (event, worktreePath: string, filePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) return false;

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    await execAsync(`git checkout HEAD -- "${relativePath}"`, {
      cwd: worktreePath
    });

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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    await execAsync(`git add "${relativePath}"`, {
      cwd: worktreePath
    });

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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    await execAsync(`git reset HEAD "${relativePath}"`, {
      cwd: worktreePath
    });

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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    const { stdout } = await execAsync(`git log --oneline -10 -- "${relativePath}"`, {
      cwd: worktreePath,
      encoding: 'utf-8'
    });

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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    const { stdout } = await execAsync(`git blame --line-porcelain "${relativePath}"`, {
      cwd: worktreePath,
      encoding: 'utf-8',
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
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const relativePath = path.relative(worktreePath, filePath);
    const { stdout } = await execAsync(`git diff --numstat HEAD -- "${relativePath}"`, {
      cwd: worktreePath,
      encoding: 'utf-8'
    });

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
  return await windowInfo.gitManager.checkout(worktreePath, branch);
});

ipcMain.handle('git-merge', async (event, worktreePath: string, targetBranch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.merge(worktreePath, targetBranch);
});

ipcMain.handle('git-rebase', async (event, worktreePath: string, targetBranch: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.rebase(worktreePath, targetBranch);
});

ipcMain.handle('git-push', async (event, worktreePath: string, branch?: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.push(worktreePath, branch);
});

ipcMain.handle('git-pull', async (event, worktreePath: string) => {
  const windowInfo = windowManager.getWindowByWebContentsId(event.sender.id);
  if (!windowInfo || !windowInfo.gitManager) throw new Error('No repository opened');
  return await windowInfo.gitManager.pull(worktreePath);
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