import { GitExecutor } from './git-executor';
import { WorktreeParser } from './parser';
import { Worktree, WorktreeStatus, CreateWorktreeOptions } from './types';

export class WorktreeManager {
  private readonly executor: GitExecutor;
  private readonly parser: WorktreeParser;

  constructor(private readonly repoPath?: string) {
    this.executor = new GitExecutor();
    this.parser = new WorktreeParser();
  }

  async listWorktrees(): Promise<Worktree[]> {
    const output = await this.executor.execute(
      ['worktree', 'list', '--porcelain'],
      { cwd: this.repoPath }
    );
    return this.parser.parseWorktreeList(output);
  }

  async createWorktree(options: CreateWorktreeOptions): Promise<void> {
    const args = ['worktree', 'add'];

    if (options.detach) {
      args.push('--detach');
    }

    if (options.newBranch) {
      args.push('-b', options.newBranch);
    }

    args.push(options.path);

    if (options.branch && !options.newBranch) {
      args.push(options.branch);
    }

    await this.executor.execute(args, { cwd: this.repoPath });
  }

  async removeWorktree(path: string, force = false): Promise<void> {
    const args = ['worktree', 'remove'];
    
    if (force) {
      args.push('--force');
    }
    
    args.push(path);
    
    await this.executor.execute(args, { cwd: this.repoPath });
  }

  async lockWorktree(path: string, reason?: string): Promise<void> {
    const args = ['worktree', 'lock'];
    
    if (reason) {
      args.push('--reason', reason);
    }
    
    args.push(path);
    
    await this.executor.execute(args, { cwd: this.repoPath });
  }

  async unlockWorktree(path: string): Promise<void> {
    await this.executor.execute(
      ['worktree', 'unlock', path],
      { cwd: this.repoPath }
    );
  }

  async getWorktreeStatus(worktreePath: string): Promise<WorktreeStatus> {
    const output = await this.executor.execute(
      ['status', '--porcelain', '-b'],
      { cwd: worktreePath }
    );

    const status = this.parser.parseStatus(output);
    
    return {
      dirty: status.files.staged > 0 || status.files.modified > 0 || status.files.untracked > 0,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.files.staged,
      modified: status.files.modified,
      untracked: status.files.untracked,
    };
  }

  async pruneWorktrees(dryRun = false): Promise<string[]> {
    const args = ['worktree', 'prune'];
    
    if (dryRun) {
      args.push('--dry-run');
    }
    
    const output = await this.executor.execute(args, { cwd: this.repoPath });
    
    // Parse the output to get list of pruned worktrees
    const lines = output.split('\\n').filter(line => line.trim());
    return lines;
  }

  async getGitVersion(): Promise<string> {
    return this.executor.checkVersion();
  }
}