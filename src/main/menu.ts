import { app, Menu, MenuItem, shell, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import appStore from './store';
import windowManager from './windowManager';

function buildRecentProjectsSubmenu(): any[] {
  const recentProjects = appStore.getRecentProjects();

  if (recentProjects.length === 0) {
    return [{
      label: 'No Recent Projects',
      enabled: false
    }];
  }

  const items: any[] = recentProjects.map((projectPath, index) => {
    const projectName = path.basename(projectPath);
    return {
      label: `${index + 1}. ${projectName}`,
      click: () => {
        // Check if project is already open
        const existingWindow = windowManager.findWindowByProject(projectPath);
        if (existingWindow) {
          existingWindow.focus();
        } else {
          // Create new window with this project
          windowManager.createWindow(projectPath);
        }
      }
    };
  });

  // Add separator and clear option
  items.push(
    { type: 'separator' },
    {
      label: 'Clear Menu',
      click: () => {
        appStore.clearRecentProjects();
        updateRecentProjectsMenu();
      }
    }
  );

  return items;
}

export function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: any[] = [
    // App Menu (Mac only)
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog({
              properties: ['openDirectory'],
              title: 'Select Git Repository'
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const projectPath = result.filePaths[0];

              // Check if project is already open
              const existingWindow = windowManager.findWindowByProject(projectPath);
              if (existingWindow) {
                existingWindow.focus();
              } else {
                // Create new window with this project
                windowManager.createWindow(projectPath);
              }
            }
          }
        },
        {
          label: 'Open Recent',
          submenu: buildRecentProjectsSubmenu()
        },
        { type: 'separator' },
        {
          label: 'Clear Recent Projects',
          click: () => {
            appStore.clearRecentProjects();
            updateRecentProjectsMenu();
          }
        },
        { type: 'separator' },
        ...(isMac ? [
          { role: 'close' }
        ] : [
          { role: 'quit' }
        ])
      ]
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: (item: any, focusedWindow: any) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

export function updateRecentProjectsMenu(): void {
  // Rebuild the entire menu to properly update the submenu
  createApplicationMenu();
}