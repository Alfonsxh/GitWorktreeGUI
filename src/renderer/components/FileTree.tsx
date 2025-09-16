import React, { useState, useEffect } from 'react';
import * as path from 'path';

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
  onDiffView?: (filePath: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ rootPath, onFileSelect, onDiffView }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [gitStatus, setGitStatus] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadDirectory(rootPath);
    loadGitStatus();
  }, [rootPath]);

  useEffect(() => {
    const interval = setInterval(loadGitStatus, 5000); // Refresh git status every 5 seconds
    return () => clearInterval(interval);
  }, [rootPath]);

  const loadDirectory = async (dirPath: string) => {
    try {
      const files = await window.electronAPI.readDirectory(dirPath);
      setTree(addGitStatusToNodes(files));
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const loadGitStatus = async () => {
    try {
      const status = await window.electronAPI.gitStatus(rootPath);
      setGitStatus(status);
      // Update tree with new status
      setTree(prevTree => addGitStatusToNodes(prevTree));
    } catch (error) {
      console.error('Failed to load git status:', error);
    }
  };

  const addGitStatusToNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.map(node => ({
      ...node,
      status: gitStatus[node.path],
      children: node.children ? addGitStatusToNodes(node.children) : undefined
    }));
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
    switch (status) {
      case 'M': return <span className="file-status modified">M</span>;
      case 'A': return <span className="file-status added">A</span>;
      case 'D': return <span className="file-status deleted">D</span>;
      case '?': return <span className="file-status untracked">?</span>;
      default: return null;
    }
  };

  const handleDiffClick = (e: React.MouseEvent, node: FileNode) => {
    e.stopPropagation();
    if (onDiffView && node.status === 'M') {
      onDiffView(node.path);
    }
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactElement => {
    const isExpanded = expandedPaths.has(node.path);
    const indent = level * 16;

    return (
      <div key={node.path}>
        <div
          className="file-tree-node"
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => toggleExpanded(node)}
        >
          {node.isDirectory ? (
            <span className="file-tree-icon">{isExpanded ? '📂' : '📁'}</span>
          ) : (
            <span className="file-tree-icon">📄</span>
          )}
          <span className="file-tree-name">{node.name}</span>
          {getStatusIndicator(node.status)}
          {!node.isDirectory && node.status === 'M' && onDiffView && (
            <button
              className="file-tree-diff-btn"
              onClick={(e) => handleDiffClick(e, node)}
              title="View Diff"
            >
              ⊕
            </button>
          )}
        </div>
        {node.isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
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
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default FileTree;