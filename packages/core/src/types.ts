export interface Worktree {
  path: string;
  head: string;
  branch?: string;
  locked: boolean;
  lockedReason?: string;
  isMainWorktree: boolean;
  isDetached?: boolean;
}

export interface WorktreeStatus {
  dirty: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
}

export interface CreateWorktreeOptions {
  path: string;
  branch?: string;
  newBranch?: string;
  detach?: boolean;
}

export interface GitCommandOptions {
  cwd?: string;
  timeout?: number;
}