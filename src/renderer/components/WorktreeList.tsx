import React from 'react';
import { Worktree } from '../../shared/types';

interface WorktreeListProps {
  worktrees: Worktree[];
  selectedWorktree: Worktree | null;
  onSelect: (worktree: Worktree) => void;
  onDelete: (worktree: Worktree) => void;
}

const WorktreeList: React.FC<WorktreeListProps> = ({
  worktrees,
  selectedWorktree,
  onSelect,
  onDelete
}) => {
  const handleContextMenu = (e: React.MouseEvent, worktree: Worktree) => {
    e.preventDefault();
    // Simple context menu - in production, use a proper context menu library
    if (!worktree.isMain && confirm(`Delete worktree "${worktree.branch}"?`)) {
      onDelete(worktree);
    }
  };

  return (
    <div className="worktree-list">
      <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        WORKTREES
      </div>
      {worktrees.map((worktree) => (
        <div
          key={worktree.path}
          className={`worktree-item ${selectedWorktree?.path === worktree.path ? 'active' : ''}`}
          onClick={() => onSelect(worktree)}
          onContextMenu={(e) => handleContextMenu(e, worktree)}
        >
          <div className="worktree-name">
            <span className={`status-indicator ${worktree.isMain ? 'status-active' : 'status-inactive'}`} />
            {worktree.branch || 'main'}
            {worktree.isLocked && ' 🔒'}
          </div>
          <div className="worktree-path" title={worktree.path}>
            {worktree.path.split('/').pop() || worktree.path}
          </div>
          {worktree.isPrunable && (
            <div className="worktree-status">Prunable</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorktreeList;