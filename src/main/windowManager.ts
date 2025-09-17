import { BrowserWindow } from 'electron';
import * as path from 'path';
import appStore from './store';
import { TerminalManager } from './terminal';
import { GitWorktreeManager } from './git';

interface WindowInfo {
  window: BrowserWindow;
  projectPath: string | null;
  gitManager: GitWorktreeManager | null;
  terminalManager: TerminalManager;
}

class WindowManager {
  private windows: Map<number, WindowInfo> = new Map();
  private windowIdCounter = 0;

  createWindow(projectPath?: string): BrowserWindow {
    const bounds = projectPath ? undefined : appStore.getWindowBounds();

    const newWindow = new BrowserWindow({
      width: bounds?.width || 1200,
      height: bounds?.height || 800,
      x: bounds?.x ? bounds.x + 30 : undefined, // Offset new windows
      y: bounds?.y ? bounds.y + 30 : undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 10, y: 10 },
      show: false,
      backgroundColor: '#1e1e1e'
    });

    const windowId = newWindow.id;
    const terminalManager = new TerminalManager();

    // Store window info
    const windowInfo: WindowInfo = {
      window: newWindow,
      projectPath: projectPath || null,
      gitManager: projectPath ? new GitWorktreeManager(projectPath) : null,
      terminalManager
    };

    this.windows.set(windowId, windowInfo);

    // Load HTML
    newWindow.loadFile(path.join(__dirname, 'index.html'));

    // Save window bounds on move or resize (only for the first/main window)
    if (this.windows.size === 1) {
      newWindow.on('moved', () => {
        if (!newWindow.isDestroyed()) {
          appStore.setWindowBounds(newWindow.getBounds());
        }
      });

      newWindow.on('resized', () => {
        if (!newWindow.isDestroyed()) {
          appStore.setWindowBounds(newWindow.getBounds());
        }
      });
    }

    // Handle window close
    newWindow.on('closed', () => {
      const info = this.windows.get(windowId);
      if (info) {
        // Clean up terminal manager sessions tied to this window
        info.terminalManager.closeAllSessions();
      }
      this.windows.delete(windowId);
    });

    // Send project path to renderer after window loads
    newWindow.webContents.once('did-finish-load', () => {
      if (projectPath && !newWindow.isDestroyed()) {
        newWindow.webContents.send('load-project', projectPath);
      }
    });

    // Show window when ready to prevent white flash
    newWindow.once('ready-to-show', () => {
      newWindow.show();
    });

    // Update window title
    if (projectPath) {
      const projectName = path.basename(projectPath);
      newWindow.setTitle(`Git Worktree Manager - ${projectName}`);
    }

    return newWindow;
  }

  getWindowInfo(windowId: number): WindowInfo | undefined {
    return this.windows.get(windowId);
  }

  getWindowByWebContentsId(webContentsId: number): WindowInfo | undefined {
    for (const [id, info] of this.windows) {
      if (info.window.webContents.id === webContentsId) {
        return info;
      }
    }
    return undefined;
  }

  setProjectForWindow(windowId: number, projectPath: string): void {
    const info = this.windows.get(windowId);
    if (info) {
      info.projectPath = projectPath;
      info.gitManager = new GitWorktreeManager(projectPath);

      // Update window title
      const projectName = path.basename(projectPath);
      info.window.setTitle(`Git Worktree Manager - ${projectName}`);

      // Save to recent projects
      appStore.setLastProjectPath(projectPath);
    }
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).map(info => info.window);
  }

  closeAllWindows(): void {
    for (const info of this.windows.values()) {
      info.window.close();
    }
  }

  getWindowCount(): number {
    return this.windows.size;
  }

  focusWindow(windowId: number): void {
    const info = this.windows.get(windowId);
    if (info && !info.window.isDestroyed()) {
      info.window.focus();
    }
  }

  // Check if a project is already open in any window
  findWindowByProject(projectPath: string): BrowserWindow | null {
    for (const info of this.windows.values()) {
      if (info.projectPath === projectPath) {
        return info.window;
      }
    }
    return null;
  }
}

export default new WindowManager();
