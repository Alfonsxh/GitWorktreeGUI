import * as vscode from 'vscode';
import { WorktreeProvider } from './providers/worktree-provider';
import { WorktreeCommands } from './commands';
import { WorktreeStatusBar } from './statusbar';
import { WorktreeManager } from '@git-worktree/core';

export function activate(context: vscode.ExtensionContext) {
    console.log('Git Worktree Manager is now active!');

    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder found. Please open a folder with a Git repository.');
        return;
    }

    // Initialize the worktree manager
    const manager = new WorktreeManager(workspaceFolder.uri.fsPath);

    // Create and register the tree data provider
    const provider = new WorktreeProvider(manager);
    const treeView = vscode.window.createTreeView('worktreesView', {
        treeDataProvider: provider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register commands
    const commands = new WorktreeCommands(manager, provider);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('gitWorktree.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('gitWorktree.add', () => commands.addWorktree()),
        vscode.commands.registerCommand('gitWorktree.remove', (item) => commands.removeWorktree(item)),
        vscode.commands.registerCommand('gitWorktree.switch', (item) => commands.switchWorktree(item)),
        vscode.commands.registerCommand('gitWorktree.openTerminal', (item) => commands.openTerminal(item)),
        vscode.commands.registerCommand('gitWorktree.openExplorer', (item) => commands.openExplorer(item)),
        vscode.commands.registerCommand('gitWorktree.lock', (item) => commands.lockWorktree(item)),
        vscode.commands.registerCommand('gitWorktree.unlock', (item) => commands.unlockWorktree(item))
    );

    // Initialize status bar
    const statusBar = new WorktreeStatusBar(manager);
    context.subscriptions.push(statusBar);

    // Auto-refresh if enabled
    const config = vscode.workspace.getConfiguration('gitWorktree');
    if (config.get<boolean>('autoRefresh')) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/.git/worktrees/**');
        watcher.onDidChange(() => provider.refresh());
        watcher.onDidCreate(() => provider.refresh());
        watcher.onDidDelete(() => provider.refresh());
        context.subscriptions.push(watcher);
    }

    // Initial refresh
    provider.refresh();
}

export function deactivate() {
    console.log('Git Worktree Manager is now deactivated');
}