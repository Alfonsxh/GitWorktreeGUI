import React, { useState, useEffect, useMemo } from 'react';
import Tree, { TreeNode } from 'rc-tree';
import 'rc-tree/assets/index.css';

interface SourceControlProps {
  worktreePath: string;
  onFileSelect?: (filePath: string, action: 'edit' | 'diff') => void;
}

interface FileChange {
  path: string;
  name: string;
  status: string;
  relativePath: string;
}

interface TreeData {
  key: string;
  title: React.ReactNode;
  isLeaf?: boolean;
  children?: TreeData[];
  checkable?: boolean;
  selectable?: boolean;
  data?: FileChange;
}

const SourceControl: React.FC<SourceControlProps> = ({ worktreePath, onFileSelect }) => {
  const [gitStatus, setGitStatus] = useState<{ [key: string]: string }>({});
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['changes', 'staged']);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  useEffect(() => {
    // Clear previous status when worktree changes
    setGitStatus({});
    loadGitStatus();
    const interval = setInterval(loadGitStatus, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [worktreePath]);

  const loadGitStatus = async () => {
    try {
      const status = await window.electronAPI.gitStatus(worktreePath);
      // Filter out files that don't belong to this worktree
      const filteredStatus: { [key: string]: string } = {};
      Object.entries(status).forEach(([filePath, fileStatus]) => {
        // Only include files that are actually under this worktree path
        if (filePath.startsWith(worktreePath)) {
          filteredStatus[filePath] = fileStatus as string;
        }
      });
      console.log('Git status for', worktreePath, ':', filteredStatus);
      setGitStatus(filteredStatus);
    } catch (error) {
      console.error('Failed to load git status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'M': return <span style={{ color: '#f39c12' }}>●</span>; // Modified
      case 'A': return <span style={{ color: '#27ae60' }}>+</span>; // Added
      case 'D': return <span style={{ color: '#e74c3c' }}>-</span>; // Deleted
      case '?': return <span style={{ color: '#95a5a6' }}>?</span>; // Untracked
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'M': return 'Modified';
      case 'A': return 'Added';
      case 'D': return 'Deleted';
      case '?': return 'Untracked';
      default: return 'Unknown';
    }
  };

  const treeData = useMemo<TreeData[]>(() => {
    const changes: FileChange[] = [];
    const staged: FileChange[] = [];

    Object.entries(gitStatus).forEach(([filePath, status]) => {
      const name = filePath.split('/').pop() || filePath;
      const relativePath = filePath.replace(worktreePath + '/', '');

      const fileChange: FileChange = {
        path: filePath,
        name,
        status,
        relativePath
      };

      // For now, all changes go to unstaged
      // TODO: Implement proper staged/unstaged detection
      changes.push(fileChange);
    });

    const createFileNode = (file: FileChange): TreeData => ({
      key: file.path,
      title: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '2px 0'
        }}>
          <span style={{ fontSize: '16px' }}>{getStatusIcon(file.status)}</span>
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {file.relativePath}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="source-control-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect?.(file.path, 'diff');
              }}
              title="View Diff"
              style={{
                padding: '2px 6px',
                fontSize: '12px',
                background: 'transparent',
                border: '1px solid #e1e4e8',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⊕
            </button>
            <button
              className="source-control-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect?.(file.path, 'edit');
              }}
              title="Open File"
              style={{
                padding: '2px 6px',
                fontSize: '12px',
                background: 'transparent',
                border: '1px solid #e1e4e8',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ✎
            </button>
          </div>
        </div>
      ),
      isLeaf: true,
      checkable: false,
      selectable: true,
      data: file
    });

    const result: TreeData[] = [];

    // Add staged changes section (if any)
    if (staged.length > 0) {
      result.push({
        key: 'staged',
        title: (
          <div style={{ fontWeight: 600, fontSize: '13px' }}>
            Staged Changes ({staged.length})
          </div>
        ),
        children: staged.map(createFileNode),
        checkable: false,
        selectable: false
      });
    }

    // Add unstaged changes section
    if (changes.length > 0) {
      result.push({
        key: 'changes',
        title: (
          <div style={{ fontWeight: 600, fontSize: '13px' }}>
            Changes ({changes.length})
          </div>
        ),
        children: changes.map(createFileNode),
        checkable: false,
        selectable: false
      });
    }

    return result;
  }, [gitStatus, worktreePath, onFileSelect]);

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys as string[]);
    setAutoExpandParent(false);
  };

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (key && key !== 'changes' && key !== 'staged') {
      // Single click on file opens diff view
      onFileSelect?.(key, 'diff');
    }
    setSelectedKeys(selectedKeys as string[]);
  };

  const onDoubleClick = (e: React.MouseEvent, node: any) => {
    if (node.key !== 'changes' && node.key !== 'staged' && node.data) {
      // Double click opens editor
      onFileSelect?.(node.data.path, 'edit');
    }
  };

  return (
    <div className="source-control">
      <div className="source-control-header">
        <span style={{ fontWeight: 600, fontSize: '14px' }}>Source Control</span>
        <button
          className="source-control-refresh"
          onClick={loadGitStatus}
          title="Refresh"
          style={{
            marginLeft: 'auto',
            padding: '2px 6px',
            background: 'transparent',
            border: '1px solid #e1e4e8',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ↻
        </button>
      </div>

      {treeData.length > 0 ? (
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          autoExpandParent={autoExpandParent}
          onExpand={onExpand}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
          showLine={false}
          showIcon={false}
          className="source-control-tree"
          style={{
            background: 'transparent',
            fontSize: '13px'
          }}
        />
      ) : (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6a737d',
          fontSize: '13px'
        }}>
          No changes detected
        </div>
      )}
    </div>
  );
};

export default SourceControl;