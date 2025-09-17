import React, { useEffect, useRef, useState } from 'react';
import './styles/vscode-theme.css';
import WorktreeList from './components/WorktreeList';
import Terminal from './components/Terminal';
import FileTree from './components/FileTree';
import CreateWorktreeModal from './components/CreateWorktreeModal';
import TabManager, { Tab } from './components/TabManager';
import FileEditor from './components/FileEditor';
import SourceControl from './components/SourceControl';
import {
  IconFiles,
  IconFolderOpen,
  IconGitBranch,
  IconLayoutSidebar,
  IconPlus,
  IconRefresh,
  IconSourceControl,
  IconTerminal,
  IconWindow
} from './components/icons';
import { AppStateProvider } from './state/AppStateContext';
import { Worktree } from '../shared/types';

type UtilityPanel = 'files' | 'source-control';

const UTILITY_OPTIONS: Array<{ id: UtilityPanel; label: string; icon: React.FC<any> }> = [
  { id: 'files', label: 'Files', icon: IconFiles },
  { id: 'source-control', label: 'Source Control', icon: IconSourceControl }
];

const SIDEBAR_STORAGE_KEY = 'gwg.sidebarWidth';
const PANEL_STORAGE_KEY = 'gwg.panelWidth';
const PANEL_VIEW_STORAGE_KEY = 'gwg.panelView';
const PANEL_COLLAPSED_STORAGE_KEY = 'gwg.panelCollapsed';
const SIDEBAR_DEFAULT_WIDTH = 320;
const PANEL_DEFAULT_WIDTH = 280;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 520;
const PANEL_MIN_WIDTH = 240;
const PANEL_MAX_WIDTH = 440;

const formatRepoName = (projectPath: string | null) => {
  if (!projectPath) return 'No repository selected';
  const parts = projectPath.split(/[\\/]/).filter(Boolean);
  const name = parts[parts.length - 1] ?? projectPath;
  return `${name}`;
};

const formatRepoPath = (projectPath: string | null) => {
  if (!projectPath) return '';
  return projectPath.replace(/\//g, ' › ');
};

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState<Map<string, string>>(new Map());
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [panelView, setPanelView] = useState<UtilityPanel>(() => {
    if (typeof window === 'undefined') return 'files';
    const stored = window.localStorage.getItem(PANEL_VIEW_STORAGE_KEY) as UtilityPanel | null;
    return stored === 'source-control' ? 'source-control' : 'files';
  });
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY);
    return stored === 'true';
  });
  const [worktreeSummaries, setWorktreeSummaries] = useState<Record<string, { dirty: number }>>({});
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return PANEL_DEFAULT_WIDTH;
    const stored = window.localStorage.getItem(PANEL_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : PANEL_DEFAULT_WIDTH;
  });
  const resizeState = useRef<{ zone: 'sidebar' | 'panel'; startX: number; startWidth: number } | null>(null);
  const [activeResizer, setActiveResizer] = useState<'sidebar' | 'panel' | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const state = resizeState.current;
      if (!state) return;

      const delta = event.clientX - state.startX;

      if (state.zone === 'sidebar') {
        const nextWidth = Math.min(
          SIDEBAR_MAX_WIDTH,
          Math.max(SIDEBAR_MIN_WIDTH, state.startWidth + delta)
        );
        setSidebarWidth(nextWidth);
      } else {
        const nextWidth = Math.min(
          PANEL_MAX_WIDTH,
          Math.max(PANEL_MIN_WIDTH, state.startWidth + delta)
        );
        setPanelWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      if (resizeState.current) {
        resizeState.current = null;
        setActiveResizer(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(Math.round(sidebarWidth)));
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PANEL_STORAGE_KEY, String(Math.round(panelWidth)));
    }
  }, [panelWidth]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PANEL_VIEW_STORAGE_KEY, panelView);
    }
  }, [panelView]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PANEL_COLLAPSED_STORAGE_KEY, panelCollapsed ? 'true' : 'false');
    }
  }, [panelCollapsed]);

  const beginResize = (zone: 'sidebar' | 'panel', event: React.MouseEvent<HTMLDivElement>) => {
    resizeState.current = {
      zone,
      startX: event.clientX,
      startWidth: zone === 'sidebar' ? sidebarWidth : panelWidth
    };
    setActiveResizer(zone);
  };

  const loadWorktrees = async () => {
    if (!projectPath) {
      setWorktrees([]);
      setSelectedWorktree(null);
      return;
    }

    const list = await window.electronAPI.listWorktrees();
    setWorktrees(list);
    await refreshWorktreeSummaries(list);

    if (list.length === 0) {
      setSelectedWorktree(null);
      return;
    }

    if (!selectedWorktree || !list.find(w => w.path === selectedWorktree.path)) {
      const primary = list[0];
      setSelectedWorktree(primary);
      ensureTerminalTab(primary);
    }
  };

  const ensureTerminalTab = (worktree: Worktree) => {
    setTabs(prev => {
      const existingTerminal = prev.find(
        tab =>
          tab.type === 'terminal' &&
          tab.meta?.kind === 'primary' &&
          tab.meta?.worktreePath === worktree.path
      );

      if (existingTerminal) {
        setActiveTabId(existingTerminal.id);
        return prev;
      }

      const terminalTab: Tab = {
        id: `terminal-${Date.now()}`,
        title: `Terminal · ${worktree.branch || 'main'}`,
        type: 'terminal',
        content: worktree.path,
        isClosable: true,
        meta: {
          worktreePath: worktree.path,
          kind: 'primary'
        }
      };

      setActiveTabId(terminalTab.id);
      return [terminalTab, ...prev];
    });
  };

  const refreshWorktreeSummaries = async (list: Worktree[]) => {
    if (!list.length) {
      setWorktreeSummaries({});
      return;
    }

    const summaries = await Promise.all(
      list.map(async worktree => {
        try {
          const status = await window.electronAPI.gitStatus(worktree.path);
          const dirty = Object.keys(status).length;
          return [worktree.path, { dirty }];
        } catch (error) {
          console.error('Failed to load git status for', worktree.path, error);
          return [worktree.path, { dirty: 0 }];
        }
      })
    );

    setWorktreeSummaries(Object.fromEntries(summaries));
  };

  const handleOpenProject = async () => {
    const path = await window.electronAPI.openProject();
    if (path) {
      setProjectPath(path);
      setPanelCollapsed(false);
      setTabs([]);
      setActiveTabId('');
      setFileContents(new Map());
      setTerminalSessions(new Map());
    }
  };

  const handleOpenProjectNewWindow = async () => {
    await window.electronAPI.openProjectNewWindow();
  };

  const handleCreateWorktree = async (branch: string, newBranch: boolean) => {
    try {
      await window.electronAPI.addWorktree(branch, newBranch);
      await loadWorktrees();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create worktree:', error);
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Failed to create worktree',
        message: `${error}`,
        buttons: ['OK']
      });
    }
  };

  const handleDeleteWorktree = async (worktree: Worktree) => {
    if (worktree.isMain) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Cannot delete',
        message: 'Primary worktree cannot be removed.',
        buttons: ['OK']
      });
      return;
    }

    try {
      // Always use force delete to avoid additional prompts
      // The confirmation has already been done in the dialog
      await window.electronAPI.removeWorktree(worktree.path, true);
      await loadWorktrees();
    } catch (error: any) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Delete failed',
        message: `${error}`,
        buttons: ['OK']
      });
    }
  };

  const handleWorktreeSelect = (worktree: Worktree) => {
    setSelectedWorktree(worktree);
    ensureTerminalTab(worktree);
    setPanelCollapsed(false);
  };

  const handleFileSelect = async (filePath: string) => {
    const existingTab = tabs.find(tab => tab.content === filePath && tab.type === 'editor');
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    try {
      const content = await window.electronAPI.readFile(filePath);
      setFileContents(prev => new Map(prev).set(filePath, content));

      const fileName = filePath.split('/').pop() || 'Untitled';
      const newTab: Tab = {
        id: `editor-${Date.now()}`,
        title: fileName,
        type: 'editor',
        content: filePath,
        isDirty: false,
        isClosable: true
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Open file failed',
        message: `${error}`,
        buttons: ['OK']
      });
    }
  };

  const handleTabClose = (tabId: string) => {
    const closingTab = tabs.find(t => t.id === tabId);
    if (closingTab?.isDirty) {
      if (!window.confirm('File has unsaved changes. Close anyway?')) {
        return;
      }
    }

    const nextTabs = tabs.filter(t => t.id !== tabId);
    setTabs(nextTabs);

    if (closingTab?.type === 'terminal') {
      setTerminalSessions(prev => {
        const next = new Map(prev);
        next.delete(tabId);
        return next;
      });
    }

    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0]?.id ?? '');
    }
  };

  const markFileDirty = (filePath: string, content: string) => {
    setFileContents(prev => new Map(prev).set(filePath, content));
    setTabs(prev =>
      prev.map(tab => {
        if (tab.content === filePath && tab.type === 'editor') {
          return { ...tab, isDirty: true };
        }
        return tab;
      })
    );
  };

  const handleFileSave = async (filePath: string, content: string) => {
    try {
      await window.electronAPI.writeFile(filePath, content);
      setFileContents(prev => new Map(prev).set(filePath, content));
      setTabs(prev =>
        prev.map(tab => {
          if (tab.content === filePath && tab.type === 'editor') {
            return { ...tab, isDirty: false };
          }
          return tab;
        })
      );
    } catch (error) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Save file failed',
        message: `${error}`,
        buttons: ['OK']
      });
    }
  };

  const handleSourceControlAction = (filePath: string, action: 'edit' | 'diff') => {
    // Just open the file - diff is shown via git decorations in the editor
    handleFileSelect(filePath);
  };

  const handleTabAdd = () => {
    if (!selectedWorktree) return;

    const existingTerminalCount = tabs.filter(
      tab => tab.type === 'terminal' && tab.meta?.worktreePath === selectedWorktree.path
    ).length;

    const newTab: Tab = {
      id: `terminal-${Date.now()}`,
      title: `Terminal ${existingTerminalCount + 1}`,
      type: 'terminal',
      content: selectedWorktree.path,
      isClosable: true,
      meta: {
        worktreePath: selectedWorktree.path,
        kind: 'secondary'
      }
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const clearHistory = async () => {
    await window.electronAPI.clearLastProject();
    setProjectPath(null);
    setWorktrees([]);
    setSelectedWorktree(null);
    setTabs([]);
    setActiveTabId('');
    setPanelCollapsed(true);
    setWorktreeSummaries({});
    setTerminalSessions(new Map());
  };

  useEffect(() => {
    const loadLastProject = async () => {
      const lastProject = await window.electronAPI.getLastProject();
      if (lastProject) {
        const loaded = await window.electronAPI.loadProjectPath(lastProject);
        if (loaded) {
          setProjectPath(loaded);
        }
      }
    };

    loadLastProject();

    window.electronAPI.onLoadProject((incomingPath: string) => {
      window.electronAPI.loadProjectPath(incomingPath).then(loaded => {
        if (loaded) {
          setProjectPath(loaded);
          setPanelCollapsed(false);
        }
      });
    });
  }, []);

  useEffect(() => {
    loadWorktrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath]);

  useEffect(() => {
    const dispose = window.electronAPI.onGitStatusSummary(({ worktreePath, summary }) => {
      setWorktreeSummaries(prev => ({ ...prev, [worktreePath]: summary }));
    });

    return () => {
      dispose();
    };
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const showUtilityPanel = !panelCollapsed && Boolean(selectedWorktree);
  const activeSummary = selectedWorktree ? worktreeSummaries[selectedWorktree.path] : undefined;
  const statusIndicatorClass = selectedWorktree
    ? `status-indicator ${activeSummary?.dirty ? 'status-indicator--dirty' : 'status-indicator--clean'}`
    : 'status-indicator';
  const utilityLabel = panelCollapsed
    ? 'Hidden'
    : UTILITY_OPTIONS.find(option => option.id === panelView)?.label || 'Files';

  return (
    <AppStateProvider worktreeSummaries={worktreeSummaries}>
      <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <div className="app__header-group">
            <button className="button button--primary" onClick={handleOpenProject}>
              <IconFolderOpen size={16} />
              Open Repository
            </button>
            <button
              className="button button--ghost"
              onClick={() => setShowCreateModal(true)}
              disabled={!projectPath}
            >
              <IconPlus size={16} />
              New Worktree
            </button>
          </div>
          <div className="app__header-group">
            <button className="button button--ghost" onClick={handleOpenProjectNewWindow}>
              <IconWindow size={16} />
              Open in New Window
            </button>
            <button
              className="button button--ghost"
              onClick={loadWorktrees}
              disabled={!projectPath}
            >
              <IconRefresh size={16} />
              Refresh
            </button>
            <button
              className="button button--muted"
              onClick={() => setPanelCollapsed(previous => !previous)}
              disabled={!selectedWorktree}
            >
              <IconLayoutSidebar size={16} />
              {panelCollapsed ? 'Show Utility Panel' : 'Hide Utility Panel'}
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="sidebar__header">
            <span>Worktrees</span>
            <button
              className="button button--muted button--icon"
              title="New worktree"
              onClick={() => setShowCreateModal(true)}
              disabled={!projectPath}
            >
              <IconPlus size={16} />
            </button>
          </div>
          <div className="sidebar__list">
            <WorktreeList
              worktrees={worktrees}
              selectedWorktree={selectedWorktree}
              onSelect={handleWorktreeSelect}
              onDelete={handleDeleteWorktree}
            />
          </div>
        </aside>

        <div
          className={`resizer ${activeResizer === 'sidebar' ? 'resizer--active' : ''}`}
          onMouseDown={event => beginResize('sidebar', event)}
        />

        {showUtilityPanel && (
          <>
            <section className="panel" style={{ width: `${panelWidth}px` }}>
              <div className="panel__switch">
                {UTILITY_OPTIONS.map(option => {
                  const Icon = option.icon;
                  const isActive = panelView === option.id;
                  return (
                    <button
                      key={option.id}
                      className={`panel__switch-button ${isActive ? 'panel__switch-button--active' : ''}`}
                      onClick={() => {
                        setPanelView(option.id);
                        setPanelCollapsed(false);
                      }}
                    >
                      <Icon size={14} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="panel__body">
                <div className="panel__content">
                  {panelView === 'files' && selectedWorktree && (
                    <FileTree
                      rootPath={selectedWorktree.path}
                      onFileSelect={handleFileSelect}
                    />
                  )}
                  {panelView === 'source-control' && selectedWorktree && (
                    <SourceControl
                      worktreePath={selectedWorktree.path}
                      onFileSelect={handleSourceControlAction}
                    />
                  )}
                </div>
              </div>
            </section>
            <div
              className={`resizer ${activeResizer === 'panel' ? 'resizer--active' : ''}`}
              onMouseDown={event => beginResize('panel', event)}
            />
          </>
        )}

        <section className="main-area">
          <TabManager
            tabs={tabs}
            activeTabId={activeTabId}
            onTabChange={setActiveTabId}
            onTabClose={handleTabClose}
            onTabAdd={handleTabAdd}
          />
          <div className="terminal-container">
            {activeTab ? (
              activeTab.type === 'terminal' ? (
                <div className="terminal-card">
                  <div className="terminal-card__header">
                    <div className="terminal-card__title">
                      <IconTerminal size={14} />
                      <span>{activeTab.title}</span>
                    </div>
                    <div className="terminal-card__path" title={activeTab.content}>
                      {activeTab.content}
                    </div>
                  </div>
                  <div className="terminal-card__body">
                    <Terminal
                      workdir={activeTab.content}
                      sessionId={terminalSessions.get(activeTab.id) || null}
                      onSessionCreated={sessionId => {
                        setTerminalSessions(prev => new Map(prev).set(activeTab.id, sessionId));
                      }}
                    />
                  </div>
                </div>
              ) : activeTab.type === 'editor' ? (
                <FileEditor
                  filePath={activeTab.content}
                  content={fileContents.get(activeTab.content) || ''}
                  worktreePath={selectedWorktree?.path}
                  onChange={value => markFileDirty(activeTab.content, value)}
                  onSave={value => handleFileSave(activeTab.content, value)}
                />
              ) : null
            ) : (
              <div className="empty-state">
                {projectPath ? 'Select a worktree or open a file to begin.' : 'Open a Git repository to get started.'}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="status-bar">
        <div className="status-bar__group">
          <span className={statusIndicatorClass} />
          {selectedWorktree ? (
            <>
              <strong>{selectedWorktree.branch || 'main'}</strong>
              <span>{selectedWorktree.path}</span>
              <span>{activeSummary?.dirty ? `${activeSummary.dirty} dirty` : 'Clean'}</span>
            </>
          ) : (
            <span>No worktree selected</span>
          )}
        </div>
        <div className="status-bar__group">
          <span>Utility Panel: {utilityLabel}</span>
          <span>{tabs.length} tabs</span>
        </div>
      </footer>

        {showCreateModal && (
          <CreateWorktreeModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateWorktree}
            projectPath={projectPath || undefined}
          />
        )}
      </div>
    </AppStateProvider>
  );
}

export default App;
