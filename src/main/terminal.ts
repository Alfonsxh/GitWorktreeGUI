import * as pty from 'node-pty';
import { webContents } from 'electron';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  pid: number;
  outputBuffer: string[]; // Store output history
  webContentsId: number;
}

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private nextId = 1;

  createSession(workdir: string, webContentsId: number): TerminalSession {
    const id = `terminal-${this.nextId++}`;

    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: workdir,
      env: process.env as any
    });

    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      pid: ptyProcess.pid,
      outputBuffer: [],
      webContentsId
    };

    this.sessions.set(id, session);

    // Forward terminal output to renderer and save to buffer
    ptyProcess.onData((data) => {
      // Store output in buffer (limit size to avoid memory issues)
      session.outputBuffer.push(data);
      if (session.outputBuffer.length > 1000) {
        session.outputBuffer.shift(); // Remove oldest entries
      }

      const target = webContents.fromId(session.webContentsId);
      if (target && !target.isDestroyed()) {
        target.send(`terminal-output-${id}`, data);
      }
    });

    ptyProcess.onExit(() => {
      this.sessions.delete(id);
      const target = webContents.fromId(session.webContentsId);
      if (target && !target.isDestroyed()) {
        target.send(`terminal-closed-${id}`);
      }
    });

    return session;
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(sessionId);
    }
  }

  closeAllSessions(): void {
    this.sessions.forEach(session => {
      session.pty.kill();
    });
    this.sessions.clear();
  }

  getSessionBuffer(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? session.outputBuffer : [];
  }
}
