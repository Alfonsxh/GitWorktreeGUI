import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { shell } from 'electron';
import { Worktree } from '../shared/types';

const execFileAsync = promisify(execFile);

interface GitCommandOptions {
  cwd?: string;
  maxBuffer?: number;
}

export class GitWorktreeManager {
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  private async runGit(
    args: string[],
    options: GitCommandOptions = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const { cwd = this.repoPath, maxBuffer = 10 * 1024 * 1024 } = options;

    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd,
        maxBuffer
      });
      return {
        stdout: stdout?.toString() ?? '',
        stderr: stderr?.toString() ?? ''
      };
    } catch (error: any) {
      const stderr = error?.stderr?.toString().trim();
      const stdout = error?.stdout?.toString().trim();
      const message = stderr || stdout || error.message || 'Unknown git error';
      throw new Error(message);
    }
  }

  async list(): Promise<Worktree[]> {
    try {
      const { stdout } = await this.runGit(['worktree', 'list', '--porcelain']);

      return this.parseWorktreeOutput(stdout);
    } catch (error) {
      console.error('Failed to list worktrees:', error);
      return [];
    }
  }

  async add(branch: string, newBranch: boolean = false): Promise<string> {
    try {
      const worktreePath = this.generateWorktreePath(branch);
      const args = newBranch
        ? ['worktree', 'add', '-b', branch, worktreePath, 'HEAD']
        : ['worktree', 'add', worktreePath, branch];

      await this.runGit(args);
      return worktreePath;
    } catch (error) {
      console.error('Failed to add worktree:', error);
      throw error;
    }
  }

  async remove(worktreePath: string, force: boolean = false): Promise<void> {
    try {
      // Get the branch name before removing the worktree
      const worktrees = await this.list();
      const worktree = worktrees.find(w => w.path === worktreePath);
      const branchToDelete = worktree?.branch;
      const isMainBranch = worktree?.isMain;

      // Remove the worktree
      const args = ['worktree', 'remove'];
      if (force) {
        args.push('--force');
      }
      args.push(worktreePath);

      await this.runGit(args);

      // If this was not the main worktree and has a branch, try to delete the branch
      if (!isMainBranch && branchToDelete) {
        try {
          // Check if the branch still exists and is not checked out anywhere else
          const remainingWorktrees = await this.list();
          const branchStillInUse = remainingWorktrees.some(w => w.branch === branchToDelete);

          if (!branchStillInUse) {
            // Try to delete the branch
            await this.runGit(['branch', '-d', branchToDelete]);
          }
        } catch (branchError: any) {
          // If branch deletion fails with "not fully merged" error, try force delete if force was specified
          if (force && branchError.message && branchError.message.includes('not fully merged')) {
            try {
              await this.runGit(['branch', '-D', branchToDelete]);
            } catch (forceBranchError) {
              // Silently ignore branch deletion errors as they're not critical
              // Could not delete branch with force
            }
          } else {
            // Silently ignore other branch deletion errors
            // Could not delete branch
          }
        }
      }
    } catch (error: any) {
      // If the error is about modified files, suggest using force
      if (error.message && error.message.includes('contains modified or untracked files')) {
        throw new Error('Worktree contains modified or untracked files. Use force option to delete.');
      }
      console.error('Failed to remove worktree:', error);
      throw error;
    }
  }

  private parseWorktreeOutput(output: string): Worktree[] {
    const worktrees: Worktree[] = [];
    const lines = output.split('\n');
    let current: Partial<Worktree> = {};
    const repoAbsolutePath = path.resolve(this.repoPath);

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.path) {
          worktrees.push(current as Worktree);
        }
        const worktreePath = line.substring(9);
        const resolvedPath = path.resolve(worktreePath);
        current = {
          path: worktreePath,
          head: '',
          branch: '',
          isMain: resolvedPath === repoAbsolutePath,
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

    return worktrees;
  }

  private generateWorktreePath(branch: string): string {
    const projectName = path.basename(this.repoPath);
    const parentDir = path.dirname(this.repoPath);

    // Clean branch name for directory
    const sanitized = (branch || 'worktree')
      .replace(/[\\\/]/g, '_')
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const cleanBranch = sanitized || 'worktree';
    const baseName = `.worktree_${projectName}_${cleanBranch}`;
    let candidate = path.join(parentDir, baseName);
    let suffix = 1;

    while (fs.existsSync(candidate)) {
      candidate = path.join(parentDir, `${baseName}_${suffix}`);
      suffix += 1;
    }

    return candidate;
  }

  // New Git operations for context menu
  async checkout(worktreePath: string, branch: string): Promise<void> {
    try {
      await this.runGit(['checkout', branch], { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      throw error;
    }
  }

  async merge(worktreePath: string, targetBranch: string): Promise<void> {
    try {
      await this.runGit(['merge', targetBranch], { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to merge branch:', error);
      throw error;
    }
  }

  async rebase(worktreePath: string, targetBranch: string): Promise<void> {
    try {
      await this.runGit(['rebase', targetBranch], { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to rebase branch:', error);
      throw error;
    }
  }

  async push(worktreePath: string, branch?: string): Promise<void> {
    try {
      const args = branch ? ['push', 'origin', branch] : ['push'];
      await this.runGit(args, { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to push branch:', error);
      throw error;
    }
  }

  async pull(worktreePath: string): Promise<void> {
    try {
      await this.runGit(['pull'], { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to pull branch:', error);
      throw error;
    }
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const { stdout } = await this.runGit(['remote', 'get-url', 'origin']);
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get remote URL:', error);
      return null;
    }
  }

  async getCurrentBranch(worktreePath: string): Promise<string> {
    try {
      const { stdout } = await this.runGit(['branch', '--show-current'], {
        cwd: worktreePath
      });
      return stdout.trim() || 'main';
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return 'main';
    }
  }

  async getAllBranches(): Promise<string[]> {
    try {
      const { stdout } = await this.runGit(['branch', '-a']);
      return stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('*'))
        .map(line => line.replace(/^remotes\/origin\//, ''));
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  async switchBranch(worktreePath: string, branch: string): Promise<void> {
    try {
      // Check if there are uncommitted changes
      const { stdout: statusOutput } = await this.runGit(['status', '--porcelain'], {
        cwd: worktreePath
      });

      if (statusOutput.trim()) {
        throw new Error('Cannot switch branch: You have uncommitted changes. Please commit or stash them first.');
      }

      // Switch to the branch
      await this.runGit(['checkout', branch], {
        cwd: worktreePath
      });
    } catch (error: any) {
      if (error.message && error.message.includes('did not match any file(s) known to git')) {
        // Try to checkout as a remote branch
        try {
          await this.runGit(['checkout', '-b', branch, `origin/${branch}`], {
            cwd: worktreePath
          });
        } catch (innerError) {
          console.error('Failed to switch branch:', innerError);
          throw new Error(`Failed to switch to branch "${branch}". The branch may not exist.`);
        }
      } else {
        console.error('Failed to switch branch:', error);
        throw error;
      }
    }
  }

  async createMergeRequest(worktreePath: string, targetBranch: string = 'main'): Promise<string | null> {
    try {
      // Get current branch
      const sourceBranch = await this.getCurrentBranch(worktreePath);

      // Get remote URL
      const remoteUrl = await this.getRemoteUrl();
      if (!remoteUrl) {
        throw new Error('No remote URL found');
      }

      // Parse remote URL to determine platform
      const platform = this.parseGitRemoteUrl(remoteUrl);
      if (!platform) {
        throw new Error('Unsupported platform');
      }

      // Generate MR/PR URL based on platform
      const mrUrl = this.generateMergeRequestUrl(platform, sourceBranch, targetBranch);

      // Open URL in default browser
      if (mrUrl) {
        shell.openExternal(mrUrl);
      }

      return mrUrl;
    } catch (error) {
      console.error('Failed to create merge request:', error);
      throw error;
    }
  }

  private parseGitRemoteUrl(remoteUrl: string): any {
    if (!remoteUrl) return null;

    // Remove trailing .git if present
    remoteUrl = remoteUrl.replace(/\.git$/, '');

    let match: RegExpMatchArray | null;
    let domain: string;
    let owner: string;
    let repo: string;

    // SSH format: git@github.com:owner/repo
    match = remoteUrl.match(/git@([^:]+):([^/]+)\/(.+)/);
    if (match) {
      domain = match[1];
      owner = match[2];
      repo = match[3];
    }
    // HTTPS format: https://github.com/owner/repo
    else if ((match = remoteUrl.match(/https?:\/\/([^/]+)\/([^/]+)\/(.+)/))) {
      domain = match[1];
      owner = match[2];
      repo = match[3];
    } else {
      return null;
    }

    // Determine platform type
    let type = 'unknown';
    if (domain.includes('github.com')) {
      type = 'github';
    } else if (domain.includes('gitlab')) {
      type = 'gitlab';
    } else if (domain.includes('gitee.com')) {
      type = 'gitee';
    } else if (domain.includes('bitbucket')) {
      type = 'bitbucket';
    } else {
      // Check if it might be a self-hosted GitLab by common patterns
      if (domain.includes('git') || domain.includes('code')) {
        type = 'gitlab'; // Default to GitLab for self-hosted
      }
    }

    return { type, domain, owner, repo };
  }

  private generateMergeRequestUrl(
    platform: any,
    sourceBranch: string,
    targetBranch: string = 'main'
  ): string | null {
    const encodedSource = encodeURIComponent(sourceBranch);
    const encodedTarget = encodeURIComponent(targetBranch);

    switch (platform.type) {
      case 'github':
        return `https://${platform.domain}/${platform.owner}/${platform.repo}/compare/${encodedTarget}...${encodedSource}?expand=1`;

      case 'gitlab':
        // GitLab URL format for creating a new merge request
        return `https://${platform.domain}/${platform.owner}/${platform.repo}/-/merge_requests/new?merge_request[source_branch]=${encodedSource}&merge_request[target_branch]=${encodedTarget}`;

      case 'gitee':
        return `https://${platform.domain}/${platform.owner}/${platform.repo}/compare/${encodedTarget}...${encodedSource}`;

      case 'bitbucket':
        return `https://${platform.domain}/${platform.owner}/${platform.repo}/pull-requests/new?source=${encodedSource}&dest=${encodedTarget}`;

      default:
        // For unknown platforms, try GitLab format as a fallback
        return `https://${platform.domain}/${platform.owner}/${platform.repo}/-/merge_requests/new?merge_request[source_branch]=${encodedSource}&merge_request[target_branch]=${encodedTarget}`;
    }
  }
}
