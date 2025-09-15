import React, { useState, useEffect } from 'react';
import * as path from 'path';

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  expanded?: boolean;
}

interface FileTreeProps {
  rootPath: string;
}

const FileTree: React.FC<FileTreeProps> = ({ rootPath }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDirectory(rootPath);
  }, [rootPath]);

  const loadDirectory = async (dirPath: string) => {
    try {
      const files = await window.electronAPI.readDirectory(dirPath);
      setTree(files);
    } catch (error) {
      console.error('Failed to load directory:', error);
    }
  };

  const toggleExpanded = async (node: FileNode) => {
    if (!node.isDirectory) return;

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
              return { ...n, children };
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
      <div className="file-tree-header">Files</div>
      <div className="file-tree-content">
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default FileTree;