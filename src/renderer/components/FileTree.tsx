import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Load git status first, then directory
    const loadData = async () => {
      await loadGitStatus();
      await loadDirectory(rootPath);
    };
    loadData();

    // Start file system watcher
    window.electronAPI.startFileWatcher(rootPath);

    // Debounced file change handler
    let debounceTimer: NodeJS.Timeout | null = null;
    const handleFileChange = (data: any) => {
      console.log('File system changed:', data);

      // Clear existing timer
      if (debounceTimer) clearTimeout(debounceTimer);

      // Debounce rapid changes (e.g., during save operations)
      debounceTimer = setTimeout(async () => {
        // Reload git status first, then update directory
        await loadGitStatus();
        await loadDirectory(rootPath);
      }, 300); // Wait 300ms after last change
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
    const interval = setInterval(loadGitStatus, 30000); // Refresh git status every 30 seconds as backup
    return () => clearInterval(interval);
  }, [rootPath]);

  const loadDirectory = async (dirPath: string) => {
    try {
      const files = await window.electronAPI.readDirectory(dirPath);
      // Add git status to files immediately
      const filesWithStatus = files.map((file: FileNode) => ({
        ...file,
        status: gitStatus[file.path]
      }));
      setTree(filesWithStatus);
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const loadGitStatus = async () => {
    try {
      const status = await window.electronAPI.gitStatus(rootPath);
      console.log('Git status loaded for rootPath:', rootPath);
      console.log('Git status object:', status);
      console.log('Git status keys:', Object.keys(status));
      setGitStatus(status);
      // Update tree with new status
      setTree(prevTree => addGitStatusToNodes(prevTree, status));
    } catch (error) {
      console.error('Failed to load git status:', error);
    }
  };

  const addGitStatusToNodes = (nodes: FileNode[], status?: { [key: string]: string }): FileNode[] => {
    const currentStatus = status || gitStatus;
    return nodes.map(node => {
      const nodeStatus = currentStatus[node.path];
      if (node.path && Object.keys(currentStatus).length > 0 && !node.isDirectory) {
        console.log('Checking status for:', node.path, '-> status:', nodeStatus);
      }
      return {
        ...node,
        status: nodeStatus,
        children: node.children ? addGitStatusToNodes(node.children, currentStatus) : undefined
      };
    });
  };


  const toggleExpanded = async (node: FileNode) => {
    console.log('toggleExpanded called for node:', node);
    if (!node.isDirectory) {
      console.log('Node is a file, calling onFileSelect with path:', node.path);
      if (onFileSelect) {
        onFileSelect(node.path);
      } else {
        console.warn('onFileSelect is not defined!');
      }
      return;
    }
    console.log('Node is a directory, expanding/collapsing');

    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(node.path)) {
      newExpanded.delete(node.path);
    } else {
      newExpanded.add(node.path);
      // Load children if not loaded
      if (!node.children) {
        const children = await window.electronAPI.readDirectory(node.path);
        // Update tree with children
        const updateNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(n => {
            if (n.path === node.path) {
              return { ...n, children: addGitStatusToNodes(children) };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
        };
        setTree(updateNode(tree));
      }
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
        await loadDirectory(rootPath);
        await loadGitStatus();
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

          {node.isDirectory && (
            <span className="file-tree-chevron">
              {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
            </span>
          )}

          <span className="file-tree-icon">
            {node.isDirectory ? (
              <i className={`codicon ${getVSCodeFolderIcon(node.name, isExpanded).icon}`} style={{ fontSize: '16px' }} />
            ) : (
              <i className={`codicon ${getVSCodeFileIcon(node.name).icon}`} style={{ fontSize: '16px' }} />
            )}
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
            onClick={loadGitStatus}
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