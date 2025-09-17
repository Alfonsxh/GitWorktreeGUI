import React, { useState, useEffect } from 'react';
import { Worktree } from '../../shared/types';

interface DeleteConfirmDialogProps {
  worktree: Worktree;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  worktree,
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = useState('');
  const branchName = worktree.branch || 'main';
  const isValid = inputValue === branchName;

  const handleSubmit = () => {
    if (isValid) {
      onConfirm();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && isValid) {
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isValid]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Delete Worktree</div>

        <div className="modal-warning">
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 500 }}>
            ⚠️ Delete worktree "{branchName}"?
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 8 }}>
            This action cannot be undone. This will permanently delete the worktree at:
          </div>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            marginBottom: 16,
            wordBreak: 'break-all'
          }}>
            {worktree.path}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: 13 }}>
            To confirm, type <strong style={{ color: 'var(--color-danger)' }}>{branchName}</strong> in the box below:
          </label>
          <input
            type="text"
            className="form-input"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={`Type ${branchName} to confirm`}
            autoFocus
            style={{
              borderColor: inputValue && !isValid ? 'var(--color-danger)' : undefined
            }}
          />
        </div>

        <div className="modal-actions">
          <button className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button ${isValid ? 'button-danger' : ''}`}
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              opacity: isValid ? 1 : 0.5,
              cursor: isValid ? 'pointer' : 'not-allowed'
            }}
          >
            Delete Worktree
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;