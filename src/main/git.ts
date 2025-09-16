import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { shell } from 'electron';
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

  async remove(worktreePath: string, force: boolean = false): Promise<void> {
    try {
      const forceFlag = force ? '--force' : '';
      await execAsync(`git worktree remove ${forceFlag} "${worktreePath}"`, {
        cwd: this.repoPath
      });
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

  // New Git operations for context menu
  async checkout(worktreePath: string, branch: string): Promise<void> {
    try {
      await execAsync(`git checkout ${branch}`, { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      throw error;
    }
  }

  async merge(worktreePath: string, targetBranch: string): Promise<void> {
    try {
      await execAsync(`git merge ${targetBranch}`, { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to merge branch:', error);
      throw error;
    }
  }

  async rebase(worktreePath: string, targetBranch: string): Promise<void> {
    try {
      await execAsync(`git rebase ${targetBranch}`, { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to rebase branch:', error);
      throw error;
    }
  }

  async push(worktreePath: string, branch?: string): Promise<void> {
    try {
      const command = branch ? `git push origin ${branch}` : 'git push';
      await execAsync(command, { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to push branch:', error);
      throw error;
    }
  }

  async pull(worktreePath: string): Promise<void> {
    try {
      await execAsync('git pull', { cwd: worktreePath });
    } catch (error) {
      console.error('Failed to pull branch:', error);
      throw error;
    }
  }

  async getRemoteUrl(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git remote get-url origin', {
        cwd: this.repoPath
      });
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get remote URL:', error);
      return null;
    }
  }

  async getCurrentBranch(worktreePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', {
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
      const { stdout } = await execAsync('git branch -a', {
        cwd: this.repoPath
      });
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