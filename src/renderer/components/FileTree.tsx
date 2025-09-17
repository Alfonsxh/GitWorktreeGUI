import React, { useState, useEffect, useRef } from 'react';
import { IconChevronRight, IconChevronDown, IconTrash } from './icons';
import { getVSCodeFileIcon, getVSCodeFolderIcon, getGitStatusIcon, getGitStatusColor } from '../utils/vscodeIcons';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  expanded?: boolean;
  status?: string; // Git status: M, A, D, ?
}

interface FileTreeProps {
  rootPath: string;
  onFileSelect?: (filePath: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileSelect }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [gitStatus, setGitStatus] = useState<{ [key: string]: string }>({});
  const expandedPathsRef = useRef(expandedPaths);
  const gitStatusRef = useRef(gitStatus);

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    gitStatusRef.current = gitStatus;
  }, [gitStatus]);

  useEffect(() => {
    // Load git status first, then directory
    const loadData = async () => {
      const status = await loadGitStatus(true);
      await loadDirectory(rootPath, status);
    };
    loadData();

    // Start file system watcher
    window.electronAPI.startFileWatcher(rootPath);

    // Debounced file change handler
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleFileChange = (_data: any) => {
      // Clear existing timer
      if (debounceTimer) clearTimeout(debounceTimer);

      // Debounce rapid changes (e.g., during save operations)
      debounceTimer = setTimeout(async () => {
        // Reload git status first, then update directory
        const status = await loadGitStatus(true);
        await loadDirectory(rootPath, status, new Set(expandedPathsRef.current));
      }, 200); // Wait briefly after last change
    };

    // Listen for file system changes
    const unsubscribe = window.electronAPI.onFileSystemChanged(handleFileChange);

    // Cleanup
    return () => {
      window.electronAPI.stopFileWatcher(rootPath);
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [rootPath]);

  useEffect(() => {
    // Less frequent polling since we have file watcher
    const interval = setInterval(() => {
      loadGitStatus();
    }, 30000); // Refresh git status every 30 seconds as backup
    return () => clearInterval(interval);
  }, [rootPath]);
 
  const fetchDirectoryTree = async (dirPath: string, expanded: Set<string>): Promise<FileNode[]> => {
    const files = (await window.electronAPI.readDirectory(dirPath)) as FileNode[];
    return Promise.all(
      files.map(async file => {
        if (file.isDirectory && expanded.has(file.path)) {
          const children = await fetchDirectoryTree(file.path, expanded);
          return { ...file, children };
        }
        return { ...file };
      })
    );
  };

  const loadDirectory = async (
    dirPath: string,
    statusMap?: { [key: string]: string },
    expandedSet?: Set<string>
  ) => {
    try {
      const effectiveExpanded = expandedSet ?? expandedPathsRef.current;
      const files = await fetchDirectoryTree(dirPath, effectiveExpanded);
      const appliedStatus = addGitStatusToNodes(files, statusMap ?? gitStatusRef.current);
      setTree(appliedStatus);
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const loadGitStatus = async (force = false) => {
    try {
      const status = await window.electronAPI.gitStatus(rootPath, { force });
      setGitStatus(status);
      setTree(prevTree => addGitStatusToNodes(prevTree, status));
      return status;
    } catch (error) {
      console.error('Failed to load git status:', error);
      return gitStatusRef.current;
    }
  };

  const addGitStatusToNodes = (nodes: FileNode[], statusMap?: { [key: string]: string }): FileNode[] => {
    if (!statusMap) {
      return nodes.map(node => ({
        ...node,
        children: node.children ? addGitStatusToNodes(node.children, statusMap) : undefined
      }));
    }

    return nodes.map(node => {
      const nodeStatus = statusMap[node.path];
      return {
        ...node,
        status: nodeStatus,
        children: node.children ? addGitStatusToNodes(node.children, statusMap) : undefined
      };
    });
  };

  const renderIcon = (node: FileNode, isExpanded: boolean) => {
    const iconInfo = node.isDirectory
      ? getVSCodeFolderIcon(node.name, isExpanded)
      : getVSCodeFileIcon(node.name);

    if (iconInfo.type === 'codicon') {
      return (
        <i
          className={`codicon ${iconInfo.icon}`}
          style={{ fontSize: '16px', color: iconInfo.color }}
        />
      );
    }

    return (
      <span
        className="file-tree-icon-badge"
        style={{ backgroundColor: iconInfo.background, color: iconInfo.color }}
      >
        {iconInfo.label}
      </span>
    );
  };

  const handleManualRefresh = async () => {
    const status = await loadGitStatus(true);
    await loadDirectory(rootPath, status);
  };


  const toggleExpanded = async (node: FileNode) => {
    if (!node.isDirectory) {
      if (onFileSelect) {
        onFileSelect(node.path);
      } else {
        console.warn('onFileSelect is not defined!');
      }
      return;
    }

    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
    } else {
      newExpanded.add(node.path);
      // Load children for the expanded directory based on the latest expanded set
      const updatedExpanded = new Set(newExpanded);
      const children = await fetchDirectoryTree(node.path, updatedExpanded);
      setTree(prevTree => {
        const updateNode = (nodes: FileNode[]): FileNode[] =>
          nodes.map(n => {
            if (n.path === node.path) {
              return {
                ...n,
                children: addGitStatusToNodes(children, gitStatusRef.current)
              };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });

        return updateNode(prevTree);
      });
    }
    setExpandedPaths(newExpanded);
  };

  const getStatusIndicator = (status?: string) => {
    if (!status) return null;
    const statusIcon = getGitStatusIcon(status);
    const statusColor = getGitStatusColor(status);
    if (!statusIcon) return null;
    return (
      <span className="file-tree-status" style={{ marginLeft: '8px' }}>
        <i className={`codicon ${statusIcon}`} style={{ color: statusColor, fontSize: '14px' }} />
      </span>
    );
  };

  const handleDeleteClick = async (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation();

    const confirmMessage = node.isDirectory
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete file "${node.name}"?`;

    const confirmed = await window.electronAPI.showMessageBox({
      type: 'warning',
      title: 'Confirm Delete',
      message: confirmMessage,
      buttons: ['Cancel', 'Delete'],
      defaultId: 0,
      cancelId: 0
    });

    if (confirmed.response === 1) {
      const result = await window.electronAPI.deleteFile(node.path);
      if (result.success) {
        const status = await loadGitStatus(true);
        await loadDirectory(rootPath, status, new Set(expandedPathsRef.current));
      } else {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Delete Failed',
          message: `Failed to delete: ${result.error}`,
          buttons: ['OK']
        });
      }
    }
  };


  const renderNode = (node: FileNode, level: number = 0, isLast: boolean = false, parentLines: boolean[] = []): React.ReactElement => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.isDirectory && node.children && node.children.length > 0;

    return (
      <div key={node.path}>
        <div
          className="file-tree-node"
          onClick={() => toggleExpanded(node)}
        >
          <span className="file-tree-indent">
            {parentLines.map((hasLine, index) => (
              <span key={index} className="tree-line">
                {hasLine ? '│' : ' '}
              </span>
            ))}
            {level > 0 && (
              <span className="tree-line">
                {isLast ? '└─' : '├─'}
              </span>
            )}
          </span>

          <span
            className={`file-tree-chevron ${node.isDirectory ? '' : 'file-tree-chevron--spacer'}`}
          >
            {node.isDirectory
              ? (isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />)
              : null}
          </span>

          <span className="file-tree-icon">
            {renderIcon(node, isExpanded)}
          </span>

          <span className="file-tree-name">{node.name}</span>

          {getStatusIndicator(node.status)}

          <div className="file-tree-actions">
            <button
              className="file-tree-action-btn file-tree-delete-btn"
              onClick={(e) => handleDeleteClick(e, node)}
              title="Delete"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>

        {node.isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map((child, index) => {
              const isChildLast = index === node.children!.length - 1;
              const newParentLines = [...parentLines];
              if (level >= 0) {
                newParentLines.push(!isLast);
              }
              return renderNode(child, level + 1, isChildLast, newParentLines);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>Files</span>
        <div className="file-tree-controls">
          <button
            className="file-tree-refresh"
            onClick={handleManualRefresh}
            title="Refresh Git Status"
          >
            ↻
          </button>
        </div>
      </div>
      <div className="file-tree-content">
        {tree.map((node, index) => renderNode(node, 0, index === tree.length - 1, []))}
      </div>
    </div>
  );
};

export default FileTree;
