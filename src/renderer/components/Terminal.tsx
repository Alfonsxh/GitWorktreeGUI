import React, { useEffect, useRef, useState } from 'react';
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const sessionIdRef = useRef<string | null>(existingSessionId);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const termRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: 10000,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#264f78',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      allowProposedApi: true
    });

    // Load all addons before opening terminal
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const unicode11Addon = new Unicode11Addon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(unicode11Addon);
    term.loadAddon(webLinksAddon);

    // Store search addon reference
    searchAddonRef.current = searchAddon;

    // Store refs for later use
    fitAddonRef.current = fitAddon;
    termRef.current = term;

    // Open terminal and fit to container
    term.open(terminalRef.current);

    // Initial fit
    fitAddon.fit();

    // Note: WebGL addon temporarily removed to ensure basic functionality
    // Will be re-added once basic terminal is working properly

    setTerminal(term);

    // Use existing session or create new one
    const initSession = async () => {
      let id = existingSessionId;

      if (!id) {
        // Create new terminal session
        const result = await window.electronAPI.createTerminal(workdir);
        id = result.id;
        setSessionId(id);
        sessionIdRef.current = id;  // Update ref
        onSessionCreated(id);
      } else {
        // Use existing session and restore buffer
        setSessionId(id);
        sessionIdRef.current = id;  // Update ref

        // Restore terminal buffer
        const buffer = await window.electronAPI.terminalGetBuffer(id);
        buffer.forEach(data => {
          term.write(data);
        });
      }

      // Handle input
      term.onData((data) => {
        window.electronAPI.terminalInput(id, data);
      });

      // Handle output
      const removeOutputListener = window.electronAPI.onTerminalOutput(id, (data) => {
        term.write(data);
      });

      // Handle terminal close
      const removeCloseListener = window.electronAPI.onTerminalClosed(id, () => {
        term.write('\r\n[Terminal session ended]\r\n');
        setSessionId(null);
      });

      // Cleanup function
      return () => {
        removeOutputListener();
        removeCloseListener();
      };
    };

    let cleanupFn: (() => void) | undefined;
    initSession().then(cleanup => {
      cleanupFn = cleanup;
    });

    // Simple resize handler without height calculation
    const handleResize = () => {
      if (!fitAddonRef.current || !termRef.current) return;

      fitAddonRef.current.fit();

      // Send resize to backend
      if (sessionIdRef.current) {
        window.electronAPI.terminalResize(sessionIdRef.current, termRef.current.cols, termRef.current.rows);
      }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchTerm = prompt('Search for:');
        if (searchTerm && searchAddonRef.current) {
          searchAddonRef.current.findNext(searchTerm, {
            regex: false,
            wholeWord: false,
            caseSensitive: false
          });
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchAddonRef.current) {
        searchAddonRef.current.clearDecorations();
      }
    };

    window.addEventListener('resize', handleResize);
    term.element?.addEventListener('keydown', handleKeyDown);

    // Add ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    // Observe the terminal container itself
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      term.element?.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      if (cleanupFn) {
        cleanupFn();
      }
      // Don't close the session when component unmounts (to keep it persistent)
      // Only dispose the terminal display
      term.dispose();
    };
  }, []); // Only run once on mount

  return (
    <div className="terminal-container">
      <div style={{
        marginBottom: '8px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Terminal: {workdir.split('/').pop()}</span>
      </div>
      <div
        ref={terminalRef}
        className="terminal"
      />
    </div>
  );
};

export default Terminal;