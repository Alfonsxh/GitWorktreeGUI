import * as vscode from 'vscode';
import * as path from 'path';
import { WorktreeManager, CreateWorktreeOptions } from '@git-worktree/core';
import { WorktreeItem } from './providers/worktree-provider';

export class WorktreeCommands {
    constructor(
        private manager: WorktreeManager,
        private provider: any // WorktreeProvider type
    ) {}

    async addWorktree(): Promise<void> {
        try {
            // Step 1: Choose branch type
            const branchType = await vscode.window.showQuickPick(
                ['Create new branch', 'Use existing branch'],
                { placeHolder: 'How would you like to create the worktree?' }
            );
            
            if (!branchType) {
                return;
            }

            let branch: string | undefined;
            let newBranch: string | undefined;

            if (branchType === 'Create new branch') {
                newBranch = await vscode.window.showInputBox({
                    prompt: 'Enter new branch name',
                    placeHolder: 'feature/new-feature'
                });
                
                if (!newBranch) {
                    return;
                }
            } else {
                // Get list of branches
                const branches = await this.getBranches();
                branch = await vscode.window.showQuickPick(branches, {
                    placeHolder: 'Select a branch'
                });
                
                if (!branch) {
                    return;
                }
            }

            // Step 2: Choose worktree path
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const defaultPath = path.join(
                path.dirname(workspaceFolder.uri.fsPath),
                newBranch || branch || 'worktree'
            );

            const worktreePath = await vscode.window.showInputBox({
                prompt: 'Enter worktree path',
                value: defaultPath,
                placeHolder: defaultPath
            });

            if (!worktreePath) {
                return;
            }

            // Create the worktree
            const options: CreateWorktreeOptions = {
                path: worktreePath,
                branch,
                newBranch
            };

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Creating worktree...',
                cancellable: false
            }, async () => {
                await this.manager.createWorktree(options);
            });

            vscode.window.showInformationMessage(`Worktree created at ${worktreePath}`);
            this.provider.refresh();

            // Ask if user wants to open the worktree
            const action = await vscode.window.showInformationMessage(
                'Worktree created successfully',
                'Open in New Window',
                'Add to Workspace'
            );

            if (action === 'Open in New Window') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(worktreePath), true);
            } else if (action === 'Add to Workspace') {
                vscode.workspace.updateWorkspaceFolders(
                    vscode.workspace.workspaceFolders?.length || 0,
                    null,
                    { uri: vscode.Uri.file(worktreePath) }
                );
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create worktree: ${error}`);
        }
    }

    async removeWorktree(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        if (item.worktree.isMainWorktree) {
            vscode.window.showErrorMessage('Cannot remove the main worktree');
            return;
        }

        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to remove worktree '${item.worktree.branch || item.worktree.path}'?`,
            'Yes',
            'No'
        );

        if (confirmation !== 'Yes') {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Removing worktree...',
                cancellable: false
            }, async () => {
                await this.manager.removeWorktree(item.worktree.path);
            });

            vscode.window.showInformationMessage('Worktree removed successfully');
            this.provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove worktree: ${error}`);
        }
    }

    async switchWorktree(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        const action = await vscode.window.showQuickPick(
            ['Open in Current Window', 'Open in New Window', 'Add to Workspace'],
            { placeHolder: 'How would you like to open the worktree?' }
        );

        if (!action) {
            return;
        }

        const uri = vscode.Uri.file(item.worktree.path);

        switch (action) {
            case 'Open in Current Window':
                await vscode.commands.executeCommand('vscode.openFolder', uri, false);
                break;
            case 'Open in New Window':
                await vscode.commands.executeCommand('vscode.openFolder', uri, true);
                break;
            case 'Add to Workspace':
                vscode.workspace.updateWorkspaceFolders(
                    vscode.workspace.workspaceFolders?.length || 0,
                    null,
                    { uri }
                );
                break;
        }
    }

    async openTerminal(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        const terminal = vscode.window.createTerminal({
            name: `Worktree: ${item.worktree.branch || 'detached'}`,
            cwd: item.worktree.path
        });
        terminal.show();
    }

    async openExplorer(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        await vscode.env.openExternal(vscode.Uri.file(item.worktree.path));
    }

    async lockWorktree(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        const reason = await vscode.window.showInputBox({
            prompt: 'Enter lock reason (optional)',
            placeHolder: 'Maintenance in progress...'
        });

        try {
            await this.manager.lockWorktree(item.worktree.path, reason);
            vscode.window.showInformationMessage('Worktree locked successfully');
            this.provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to lock worktree: ${error}`);
        }
    }

    async unlockWorktree(item: WorktreeItem): Promise<void> {
        if (!item) {
            return;
        }

        try {
            await this.manager.unlockWorktree(item.worktree.path);
            vscode.window.showInformationMessage('Worktree unlocked successfully');
            this.provider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to unlock worktree: ${error}`);
        }
    }

    private async getBranches(): Promise<string[]> {
        // This is a simplified version - in production, you'd want to use git to get the actual branch list
        const worktrees = await this.manager.listWorktrees();
        const branches = worktrees
            .filter(w => w.branch)
            .map(w => w.branch as string);
        
        // Add some common branches if they're not in worktrees
        const commonBranches = ['main', 'master', 'develop'];
        for (const branch of commonBranches) {
            if (!branches.includes(branch)) {
                branches.push(branch);
            }
        }
        
        return branches;
    }
}