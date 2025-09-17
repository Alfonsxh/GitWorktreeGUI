/// <reference types="electron" />

interface Window {
  electronAPI: {
    openProject: () => Promise<string | null>;
    openProjectNewWindow: () => Promise<string | null>;
    getLastProject: () => Promise<string | undefined>;
    clearLastProject: () => Promise<void>;
    loadProjectPath: (projectPath: string) => Promise<string | null>;
    onLoadProject: (callback: (projectPath: string) => void) => void;
    onSwitchProject: (handler: () => void) => () => void;
    onNewProjectOpened: (handler: (projectPath: string) => void) => () => void;
    onWorktreesChanged: (handler: (worktrees: any[]) => void) => () => void;
    onGitStatusChanged: (handler: (status: any) => void) => () => void;
    onGitStatusSummary: (
      callback: (payload: { worktreePath: string; summary: { dirty: number } }) => void
    ) => () => void;
    listWorktrees: () => Promise<any[]>;
    addWorktree: (branch: string, newBranch: boolean) => Promise<string>;
    removeWorktree: (worktreePath: string, force?: boolean) => Promise<void>;

    // File system API
    readDirectory: (dirPath: string) => Promise<any[]>;
    deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    startFileWatcher: (dirPath: string) => Promise<{ success: boolean }>;
    stopFileWatcher: (dirPath: string) => Promise<{ success: boolean }>;
    onFileSystemChanged: (handler: (data: any) => void) => () => void;
    gitStatus: (worktreePath: string, options?: { force?: boolean }) => Promise<any>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;

    // Terminal API
    createTerminal: (workdir: string) => Promise<{ id: string; pid: number }>;
    terminalInput: (sessionId: string, data: string) => void;
    terminalResize: (sessionId: string, cols: number, rows: number) => void;
    terminalClose: (sessionId: string) => void;
    terminalGetBuffer: (sessionId: string) => Promise<string[]>;
    onTerminalOutput: (sessionId: string, callback: (data: string) => void) => () => void;
    onTerminalClosed: (sessionId: string, callback: () => void) => () => void;
    terminalSendData: (sessionId: string, data: string) => void;
    terminalKill: (sessionId: string) => void;
    terminalCreate: (cwd: string) => Promise<string>;
    onTerminalData: (handler: (sessionId: string, data: string) => void) => () => void;

    // Git API
    gitGetWorktrees: () => Promise<any[]>;
    gitGetCurrentWorktree: () => Promise<any>;
    gitCreateWorktree: (branch: string, path: string, baseBranch?: string) => Promise<void>;
    gitDeleteWorktree: (path: string, force?: boolean) => Promise<void>;
    gitDiffView: (filePath: string) => Promise<any>;
    gitShowFile: (worktreePath: string, filePath: string) => Promise<string | null>;
    gitDiff: (worktreePath: string, filePath: string) => Promise<string | null>;
    gitDiscard: (worktreePath: string, filePath: string) => Promise<boolean>;
    gitStage: (worktreePath: string, filePath: string) => Promise<boolean>;
    gitUnstage: (worktreePath: string, filePath: string) => Promise<boolean>;
    gitLogFile: (worktreePath: string, filePath: string) => Promise<any[]>;
    gitBlame: (worktreePath: string, filePath: string) => Promise<string | null>;
    gitDiffStat: (worktreePath: string, filePath: string) => Promise<{ additions: number; deletions: number }>;
    gitSwitchBranch: (worktreePath: string, branch: string) => Promise<void>;
    gitCheckout: (worktreePath: string, branch: string) => Promise<void>;
    gitCommit: (worktreePath: string, message: string, files?: string[]) => Promise<void>;
    gitMerge: (worktreePath: string, targetBranch: string) => Promise<void>;
    gitRebase: (worktreePath: string, targetBranch: string) => Promise<void>;
    gitPush: (worktreePath: string, branch?: string) => Promise<void>;
    gitPull: (worktreePath: string) => Promise<void>;
    gitGetRemoteUrl: () => Promise<string | undefined>;
    gitGetCurrentBranch: (worktreePath: string) => Promise<string>;
    gitGetAllBranches: () => Promise<string[]>;
    gitCreateMergeRequest: (worktreePath: string, targetBranch?: string) => Promise<void>;

    // Dialog API
    showMessageBox: (options: any) => Promise<any>;
    showPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>;
  };
}
