import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { Worktree } from '../shared/types';

const execAsync = promisify(exec);

export class GitWorktreeManager {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  async list(): Promise<Worktree[]> {
    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: this.repoPath
      });

      return this.parseWorktreeOutput(stdout);
    } catch (error) {
      console.error('Failed to list worktrees:', error);
      return [];
    }
  }

  async add(branch: string, newBranch: boolean = false): Promise<string> {
    const worktreePath = this.generateWorktreePath(branch);
    const command = newBranch
      ? `git worktree add -b "${branch}" "${worktreePath}" HEAD`
      : `git worktree add "${worktreePath}" "${branch}"`;

    try {
      await execAsync(command, { cwd: this.repoPath });
      return worktreePath;
    } catch (error) {
      console.error('Failed to add worktree:', error);
      throw error;
    }
  }

  async remove(worktreePath: string): Promise<void> {
    try {
      await execAsync(`git worktree remove "${worktreePath}"`, {
        cwd: this.repoPath
      });
    } catch (error) {
      console.error('Failed to remove worktree:', error);
      throw error;
    }
  }

  private parseWorktreeOutput(output: string): Worktree[] {
    const worktrees: Worktree[] = [];
    const lines = output.split('\n');
    let current: Partial<Worktree> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current as Worktree);
        }
        current = {
          path: line.substring(9),
          isMain: false,
          isLocked: false,
          isPrunable: false
        };
      } else if (line.startsWith('HEAD ')) {
        current.head = line.substring(5);
      } else if (line.startsWith('branch ')) {
        current.branch = line.substring(7).replace('refs/heads/', '');
      } else if (line === 'bare') {
        current.isMain = true;
      } else if (line === 'locked') {
        current.isLocked = true;
      } else if (line === 'prunable') {
        current.isPrunable = true;
      }
    }

    if (current.path) {
      worktrees.push(current as Worktree);
    }

    // Mark main worktree
    if (worktrees.length > 0 && !worktrees[0].branch) {
      worktrees[0].isMain = true;
    }

    return worktrees;
  }

  private generateWorktreePath(branch: string): string {
    const projectName = path.basename(this.repoPath);
    const parentDir = path.dirname(this.repoPath);

    // Clean branch name for directory
    const cleanBranch = branch
      .replace(/\//g, '_')
      .replace(/-/g, '_')
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    return path.join(parentDir, `.worktree_${projectName}_${cleanBranch}`);
  }
}