import React, { useState, useEffect } from 'react';
import WorktreeList from './components/WorktreeList';
import Terminal from './components/Terminal';
import FileTree from './components/FileTree';
import CreateWorktreeModal from './components/CreateWorktreeModal';
import { Worktree } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      openProject: () => Promise<string | null>;
      listWorktrees: () => Promise<Worktree[]>;
      addWorktree: (branch: string, newBranch: boolean) => Promise<string>;
      removeWorktree: (worktreePath: string) => Promise<void>;
      createTerminal: (workdir: string) => Promise<{ id: string; pid: number }>;
      terminalInput: (sessionId: string, data: string) => void;
      terminalResize: (sessionId: string, cols: number, rows: number) => void;
      terminalClose: (sessionId: string) => void;
      terminalGetBuffer: (sessionId: string) => Promise<string[]>;
      onTerminalOutput: (sessionId: string, callback: (data: string) => void) => () => void;
      onTerminalClosed: (sessionId: string, callback: () => void) => () => void;
      readDirectory: (dirPath: string) => Promise<any[]>;
    };
  }
}

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState<Map<string, string>>(new Map()); // worktreePath -> sessionId
  const [showFileTree, setShowFileTree] = useState(true);

  const loadWorktrees = async () => {
    if (projectPath) {
      const list = await window.electronAPI.listWorktrees();
      setWorktrees(list);
      if (list.length > 0 && !selectedWorktree) {
        setSelectedWorktree(list[0]);
      }
    }
  };

  const handleOpenProject = async () => {
    const path = await window.electronAPI.openProject();
    if (path) {
      setProjectPath(path);
    }
  };

  const handleCreateWorktree = async (branch: string, newBranch: boolean) => {
    try {
      await window.electronAPI.addWorktree(branch, newBranch);
      await loadWorktrees();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create worktree:', error);
      alert('Failed to create worktree: ' + error);
    }
  };

  const handleDeleteWorktree = async (worktree: Worktree) => {
    if (worktree.isMain) {
      alert('Cannot delete main worktree');
      return;
    }

    if (confirm(`Delete worktree "${worktree.branch}"?`)) {
      try {
        await window.electronAPI.removeWorktree(worktree.path);
        await loadWorktrees();
      } catch (error) {
        console.error('Failed to delete worktree:', error);
        alert('Failed to delete worktree: ' + error);
      }
    }
  };

  useEffect(() => {
    loadWorktrees();
  }, [projectPath]);

  return (
    <div className="app">
      <div className="header">
        <button className="button button-secondary" onClick={handleOpenProject}>
          🗂 Open Project
        </button>
        <button
          className="button button-secondary"
          onClick={() => setShowCreateModal(true)}
          disabled={!projectPath}
        >
          ➕ New Worktree
        </button>
        <button
          className="button button-secondary"
          onClick={loadWorktrees}
          disabled={!projectPath}
        >
          🔄 Refresh
        </button>
        <button
          className="button button-secondary"
          onClick={() => setShowFileTree(!showFileTree)}
          disabled={!projectPath}
        >
          📁 {showFileTree ? 'Hide' : 'Show'} Files
        </button>
        {projectPath && (
          <div style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {projectPath}
          </div>
        )}
      </div>

      <div className="content">
        <div className="sidebar">
          <WorktreeList
            worktrees={worktrees}
            selectedWorktree={selectedWorktree}
            onSelect={setSelectedWorktree}
            onDelete={handleDeleteWorktree}
          />
        </div>

        <div className="main-area">
          {selectedWorktree ? (
            <div style={{ display: 'flex', height: '100%' }}>
              {showFileTree && (
                <div className="file-tree-panel">
                  <FileTree rootPath={selectedWorktree.path} />
                </div>
              )}
              <div style={{ flex: 1, position: 'relative' }}>
                {/* Render all terminals but only show the selected one */}
                {worktrees.map(worktree => (
                  <div
                    key={worktree.path}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: selectedWorktree.path === worktree.path ? 'block' : 'none'
                    }}
                  >
                    <Terminal
                      workdir={worktree.path}
                      sessionId={terminalSessions.get(worktree.path) || null}
                      onSessionCreated={(sessionId) => {
                        setTerminalSessions(prev => new Map(prev).set(worktree.path, sessionId));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-secondary)'
            }}>
              {projectPath ? 'Select a worktree' : 'Open a Git repository to get started'}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateWorktreeModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWorktree}
        />
      )}
    </div>
  );
}

export default App;