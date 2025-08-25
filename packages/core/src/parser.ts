import { Worktree } from './types';

export class WorktreeParser {
  /**
   * Parse the output of `git worktree list --porcelain`
   */
  parseWorktreeList(output: string): Worktree[] {
    if (!output.trim()) {
      return [];
    }

    const worktrees: Worktree[] = [];
    const blocks = output.trim().split(/\\n\\n/);

    for (const block of blocks) {
      const worktree = this.parseWorktreeBlock(block);
      if (worktree) {
        worktrees.push(worktree);
      }
    }

    // Mark the first worktree as the main worktree
    if (worktrees.length > 0) {
      worktrees[0].isMainWorktree = true;
    }

    return worktrees;
  }

  private parseWorktreeBlock(block: string): Worktree | null {
    const lines = block.trim().split('\\n');
    if (lines.length === 0) {
      return null;
    }

    const worktree: Partial<Worktree> = {
      locked: false,
      isMainWorktree: false,
    };

    for (const line of lines) {
      const [key, ...valueParts] = line.split(' ');
      const value = valueParts.join(' ');

      switch (key) {
        case 'worktree':
          worktree.path = value;
          break;
        case 'HEAD':
          worktree.head = value;
          break;
        case 'branch':
          // Extract branch name from refs/heads/branchname
          worktree.branch = value.replace('refs/heads/', '');
          break;
        case 'detached':
          worktree.isDetached = true;
          break;
        case 'locked':
          worktree.locked = true;
          if (value) {
            worktree.lockedReason = value;
          }
          break;
      }
    }

    // Validate required fields
    if (!worktree.path || !worktree.head) {
      return null;
    }

    return worktree as Worktree;
  }

  /**
   * Parse the output of `git status --porcelain -b`
   */
  parseStatus(output: string): {
    branch: string;
    ahead: number;
    behind: number;
    files: { staged: number; modified: number; untracked: number };
  } {
    const lines = output.trim().split('\\n');
    const result = {
      branch: '',
      ahead: 0,
      behind: 0,
      files: { staged: 0, modified: 0, untracked: 0 },
    };

    if (lines.length === 0) {
      return result;
    }

    // First line contains branch information
    const branchLine = lines[0];
    const branchMatch = branchLine.match(/^## (.+?)(?:\\.\\.\\.(.+?))?$/);
    if (branchMatch) {
      result.branch = branchMatch[1];
      
      // Check for ahead/behind
      const aheadMatch = branchLine.match(/ahead (\\d+)/);
      const behindMatch = branchLine.match(/behind (\\d+)/);
      
      if (aheadMatch) {
        result.ahead = parseInt(aheadMatch[1], 10);
      }
      if (behindMatch) {
        result.behind = parseInt(behindMatch[1], 10);
      }
    }

    // Parse file statuses
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 2) continue;

      const x = line[0]; // Index status
      const y = line[1]; // Working tree status

      if (x !== ' ' && x !== '?') {
        result.files.staged++;
      }
      if (y !== ' ' && y !== '?') {
        result.files.modified++;
      }
      if (x === '?' && y === '?') {
        result.files.untracked++;
      }
    }

    return result;
  }
}