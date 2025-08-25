import { execFile } from 'child_process';
import { promisify } from 'util';
import { GitCommandOptions } from './types';

const execFileAsync = promisify(execFile);

export class GitExecutor {
  private readonly defaultTimeout = 30000; // 30 seconds

  async execute(args: string[], options: GitCommandOptions = {}): Promise<string> {
    const { cwd = process.cwd(), timeout = this.defaultTimeout } = options;

    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd,
        encoding: 'utf8',
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        windowsHide: true,
      });
      
      return stdout.trim();
    } catch (error: any) {
      const command = `git ${args.join(' ')}`;
      throw new GitExecutorError(
        `Git command failed: ${error.message}`,
        command,
        error.code,
        error.stderr
      );
    }
  }

  async checkVersion(): Promise<string> {
    const output = await this.execute(['--version']);
    const match = output.match(/git version (\\d+\\.\\d+\\.\\d+)/);
    return match ? match[1] : 'unknown';
  }
}

export class GitExecutorError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly code?: string | number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GitExecutorError';
  }
}