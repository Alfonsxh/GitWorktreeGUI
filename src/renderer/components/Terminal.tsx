import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  workdir: string;
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ workdir, sessionId: existingSessionId, onSessionCreated }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const sessionIdRef = useRef<string | null>(existingSessionId);
  const onSessionCreatedRef = useRef(onSessionCreated);

  useEffect(() => {
    onSessionCreatedRef.current = onSessionCreated;
  }, [onSessionCreated]);

  useEffect(() => {
    if (!hostRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily:
        '"MesloLGS NF", "Hack Nerd Font", "FiraCode Nerd Font", "Menlo for Powerline", Menlo, Monaco, "Courier New", monospace',
      scrollback: 10000,
      allowProposedApi: true,
      theme: {
        background: '#111827',
        foreground: '#d1d5db',
        cursor: '#f3f4f6',
        cursorAccent: '#111827',
        selectionBackground: 'rgba(59, 130, 246, 0.35)'
      }
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const unicodeAddon = new Unicode11Addon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(unicodeAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(hostRef.current);
    fitAddon.fit();

    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    let cleanupListeners: (() => void) | undefined;

    const initialiseSession = async () => {
      let sessionId = existingSessionId;

      if (!sessionId) {
        const session = await window.electronAPI.createTerminal(workdir);
        sessionId = session.id;
        onSessionCreatedRef.current(session.id);
      } else {
        const buffer = await window.electronAPI.terminalGetBuffer(sessionId);
        buffer.forEach(chunk => terminal.write(chunk));
      }

      sessionIdRef.current = sessionId;

      terminal.onData(data => {
        if (sessionIdRef.current) {
          window.electronAPI.terminalInput(sessionIdRef.current, data);
        }
      });

      const removeOutput = window.electronAPI.onTerminalOutput(sessionId, data => {
        terminal.write(data);
      });

      const removeClosed = window.electronAPI.onTerminalClosed(sessionId, () => {
        terminal.write('\r\n[Terminal session ended]\r\n');
        sessionIdRef.current = null;
      });

      cleanupListeners = () => {
        removeOutput();
        removeClosed();
      };
    };

    initialiseSession();

    const handleResize = () => {
      if (!fitAddonRef.current || !sessionIdRef.current) return;
      fitAddonRef.current.fit();
      const { cols, rows } = terminal;
      window.electronAPI.terminalResize(sessionIdRef.current, cols, rows);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(hostRef.current);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cleanupListeners?.();
      terminal.dispose();
    };
  }, [existingSessionId, workdir]);

  return (
    <div
      ref={hostRef}
      className="terminal"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default Terminal;
