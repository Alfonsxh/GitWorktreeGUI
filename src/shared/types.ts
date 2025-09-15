export interface Worktree {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  isLocked: boolean;
  isPrunable: boolean;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: number;
  untracked: number;
}

export interface TerminalSession {
  id: string;
  workdir: string;
  pid: number;
}