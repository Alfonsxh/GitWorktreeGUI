import * as vscode from 'vscode';
import * as path from 'path';
import { WorktreeManager, Worktree } from '@git-worktree/core';

export class WorktreeStatusBar implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];

    constructor(private manager: WorktreeManager) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        
        this.statusBarItem.command = 'gitWorktree.switch';
        this.disposables.push(this.statusBarItem);

        // Check if status bar is enabled
        const config = vscode.workspace.getConfiguration('gitWorktree');
        if (config.get<boolean>('showInStatusBar')) {
            this.update();
            this.statusBarItem.show();
        }

        // Listen to configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('gitWorktree.showInStatusBar')) {
                    const show = vscode.workspace.getConfiguration('gitWorktree')
                        .get<boolean>('showInStatusBar');
                    if (show) {
                        this.update();
                        this.statusBarItem.show();
                    } else {
                        this.statusBarItem.hide();
                    }
                }
            })
        );

        // Update when workspace changes
        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(() => this.update())
        );
    }

    private async update(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this.statusBarItem.hide();
                return;
            }

            const worktrees = await this.manager.listWorktrees();
            const currentPath = workspaceFolder.uri.fsPath;
            
            // Find the current worktree
            const currentWorktree = worktrees.find(w => 
                this.pathsMatch(w.path, currentPath)
            );

            if (currentWorktree) {
                const icon = currentWorktree.isMainWorktree ? '⭐' : '$(git-branch)';
                const label = currentWorktree.branch || 'detached';
                const lockIcon = currentWorktree.locked ? ' 🔒' : '';
                
                this.statusBarItem.text = `${icon} ${label}${lockIcon}`;
                this.statusBarItem.tooltip = this.createTooltip(currentWorktree, worktrees);
                this.statusBarItem.show();
            } else {
                this.statusBarItem.text = '$(git-branch) No worktree';
                this.statusBarItem.tooltip = 'Not in a Git worktree';
                this.statusBarItem.show();
            }
        } catch (error) {
            console.error('Failed to update worktree status bar:', error);
            this.statusBarItem.hide();
        }
    }

    private pathsMatch(path1: string, path2: string): boolean {
        // Normalize paths for comparison
        const normalized1 = path.resolve(path1);
        const normalized2 = path.resolve(path2);
        
        // Check if one path is a parent of the other
        return normalized1 === normalized2 || 
               normalized2.startsWith(normalized1 + path.sep) ||
               normalized1.startsWith(normalized2 + path.sep);
    }

    private createTooltip(current: Worktree, all: Worktree[]): string {
        const lines = [
            `Current Worktree: ${current.branch || 'detached HEAD'}`,
            `Path: ${current.path}`,
            `HEAD: ${current.head.substring(0, 10)}...`,
            ''
        ];

        if (current.locked) {
            lines.push(`Status: Locked${current.lockedReason ? ` - ${current.lockedReason}` : ''}`);
            lines.push('');
        }

        lines.push(`Total Worktrees: ${all.length}`);
        lines.push('Click to switch worktree');

        return lines.join('\\n');
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}