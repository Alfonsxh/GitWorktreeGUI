import React, { useState, useEffect } from 'react';
import WorktreeList from './components/WorktreeList';
import Terminal from './components/Terminal';
import FileTree from './components/FileTree';
import CreateWorktreeModal from './components/CreateWorktreeModal';
import TabManager, { Tab } from './components/TabManager';
import FileEditor from './components/FileEditor';
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
      gitStatus: (worktreePath: string) => Promise<{ [key: string]: string }>;
      readFile: (filePath: string) => Promise<string>;
      writeFile: (filePath: string, content: string) => Promise<boolean>;
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
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());

  const loadWorktrees = async () => {
    if (projectPath) {
      const list = await window.electronAPI.listWorktrees();
      setWorktrees(list);
      if (list.length > 0 && !selectedWorktree) {
        const worktree = list[0];
        setSelectedWorktree(worktree);
        // Create initial terminal tab
        const terminalTab: Tab = {
          id: `terminal-${worktree.path}`,
          title: 'Terminal',
          type: 'terminal',
          content: worktree.path,
          isClosable: false
        };
        setTabs([terminalTab]);
        setActiveTabId(terminalTab.id);
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

  const handleFileSelect = async (filePath: string) => {
    console.log('handleFileSelect called with:', filePath);
    console.log('Current tabs:', tabs);

    // Check if file is already open
    const existingTab = tabs.find(tab => tab.content === filePath && tab.type === 'editor');
    if (existingTab) {
      console.log('File already open, switching to tab:', existingTab);
      setActiveTabId(existingTab.id);
      return;
    }

    // Load file content
    try {
      console.log('Loading file content...');
      const content = await window.electronAPI.readFile(filePath);
      console.log('File content loaded, length:', content.length);
      setFileContents(prev => new Map(prev).set(filePath, content));

      // Create new tab
      const fileName = filePath.split('/').pop() || 'Untitled';
      const newTab: Tab = {
        id: `editor-${Date.now()}`,
        title: fileName,
        type: 'editor',
        content: filePath,
        isDirty: false,
        isClosable: true
      };
      console.log('Creating new tab:', newTab);

      setTabs(prev => {
        const newTabs = [...prev, newTab];
        console.log('Updated tabs:', newTabs);
        return newTabs;
      });
      setActiveTabId(newTab.id);
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open file: ' + error);
    }
  };

  const handleTabClose = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDirty) {
      if (!confirm(`File has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id);
      }
    }
  };

  const handleFileChange = (filePath: string, content: string) => {
    setFileContents(prev => new Map(prev).set(filePath, content));
    setTabs(prev => prev.map(tab => {
      if (tab.content === filePath && tab.type === 'editor') {
        return { ...tab, isDirty: true };
      }
      return tab;
    }));
  };

  const handleFileSave = async (filePath: string, content: string) => {
    try {
      await window.electronAPI.writeFile(filePath, content);
      setTabs(prev => prev.map(tab => {
        if (tab.content === filePath && tab.type === 'editor') {
          return { ...tab, isDirty: false };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + error);
    }
  };

  const handleWorktreeSelect = (worktree: Worktree) => {
    setSelectedWorktree(worktree);
    // Update or create terminal tab for this worktree
    const terminalTabId = `terminal-${worktree.path}`;
    const existingTab = tabs.find(tab => tab.id === terminalTabId);

    if (!existingTab) {
      const terminalTab: Tab = {
        id: terminalTabId,
        title: 'Terminal',
        type: 'terminal',
        content: worktree.path,
        isClosable: false
      };
      setTabs(prev => {
        // Remove other terminal tabs and add new one
        const nonTerminalTabs = prev.filter(t => t.type !== 'terminal');
        return [terminalTab, ...nonTerminalTabs];
      });
      setActiveTabId(terminalTabId);
    }
  };

  useEffect(() => {
    loadWorktrees();
  }, [projectPath]);

  useEffect(() => {
    console.log('Tabs state changed:', tabs);
    console.log('Active tab ID:', activeTabId);
  }, [tabs, activeTabId]);

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
            onSelect={handleWorktreeSelect}
            onDelete={handleDeleteWorktree}
          />
        </div>

        <div className="main-area">
          {selectedWorktree ? (
            <div style={{ display: 'flex', height: '100%' }}>
              {showFileTree && (
                <div className="file-tree-panel">
                  <FileTree
                    rootPath={selectedWorktree.path}
                    onFileSelect={handleFileSelect}
                  />
                </div>
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {tabs.length > 0 && (
                  <TabManager
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={handleTabClose}
                  />
                )}
                <div className="tab-content">
                  {tabs.map(tab => {
                    const isActive = tab.id === activeTabId;

                    if (tab.type === 'terminal') {
                      const worktree = worktrees.find(w => w.path === tab.content);
                      if (!worktree) return null;

                      return (
                        <div
                          key={tab.id}
                          style={{
                            flex: 1,
                            display: isActive ? 'flex' : 'none',
                            flexDirection: 'column',
                            minHeight: 0
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
                      );
                    } else if (tab.type === 'editor') {
                      const content = fileContents.get(tab.content) || '';

                      return (
                        <div
                          key={tab.id}
                          style={{
                            flex: 1,
                            display: isActive ? 'flex' : 'none',
                            flexDirection: 'column',
                            minHeight: 0
                          }}
                        >
                          <FileEditor
                            filePath={tab.content}
                            content={content}
                            onChange={(value) => handleFileChange(tab.content, value)}
                            onSave={(value) => handleFileSave(tab.content, value)}
                          />
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
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