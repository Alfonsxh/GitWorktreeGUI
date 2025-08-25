import * as vscode from 'vscode';
import * as path from 'path';
import { WorktreeManager, Worktree, WorktreeStatus } from '@git-worktree/core';

export class WorktreeProvider implements vscode.TreeDataProvider<WorktreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<WorktreeItem | undefined | null | void> = new vscode.EventEmitter<WorktreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WorktreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private worktrees: Worktree[] = [];

    constructor(private manager: WorktreeManager) {}

    refresh(): void {
        this.loadWorktrees();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: WorktreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: WorktreeItem): Promise<WorktreeItem[]> {
        if (!element) {
            await this.loadWorktrees();
            return this.worktrees.map(worktree => new WorktreeItem(worktree, this.manager));
        }
        return [];
    }

    private async loadWorktrees(): Promise<void> {
        try {
            this.worktrees = await this.manager.listWorktrees();
        } catch (error) {
            console.error('Failed to load worktrees:', error);
            vscode.window.showErrorMessage(`Failed to load worktrees: ${error}`);
            this.worktrees = [];
        }
    }
}

export class WorktreeItem extends vscode.TreeItem {
    constructor(
        public readonly worktree: Worktree,
        private manager: WorktreeManager
    ) {
        super(
            WorktreeItem.getLabel(worktree),
            vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = this.getTooltip();
        this.description = this.getDescription();
        this.contextValue = 'worktree';
        this.iconPath = this.getIcon();
        
        // Add command to switch on click
        this.command = {
            command: 'gitWorktree.switch',
            title: 'Switch to Worktree',
            arguments: [this]
        };
    }

    private static getLabel(worktree: Worktree): string {
        const label = worktree.branch || worktree.head.substring(0, 7);
        const prefix = worktree.isMainWorktree ? '⭐ ' : '';
        const suffix = worktree.locked ? ' 🔒' : '';
        return `${prefix}${label}${suffix}`;
    }

    private getTooltip(): string {
        const lines = [
            `Branch: ${this.worktree.branch || 'detached HEAD'}`,
            `Path: ${this.worktree.path}`,
            `HEAD: ${this.worktree.head.substring(0, 10)}...`
        ];
        
        if (this.worktree.locked) {
            lines.push(`Locked: ${this.worktree.lockedReason || 'Yes'}`);
        }
        
        return lines.join('\\n');
    }

    private getDescription(): string {
        const pathSegments = this.worktree.path.split(path.sep);
        return pathSegments[pathSegments.length - 1];
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.worktree.isMainWorktree) {
            return new vscode.ThemeIcon('home');
        }
        if (this.worktree.locked) {
            return new vscode.ThemeIcon('lock');
        }
        if (this.worktree.isDetached) {
            return new vscode.ThemeIcon('git-commit');
        }
        return new vscode.ThemeIcon('git-branch');
    }
}