import React, { useState } from 'react';

interface CreateWorktreeModalProps {
  onClose: () => void;
  onCreate: (branch: string, newBranch: boolean) => void;
}

const CreateWorktreeModal: React.FC<CreateWorktreeModalProps> = ({ onClose, onCreate }) => {
  const [branchName, setBranchName] = useState('');
  const [isNewBranch, setIsNewBranch] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branchName.trim()) {
      onCreate(branchName.trim(), isNewBranch);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create New Worktree</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <input
                type="radio"
                checked={isNewBranch}
                onChange={() => setIsNewBranch(true)}
                style={{ marginRight: '8px' }}
              />
              Create new branch
            </label>
            <label className="form-label" style={{ marginLeft: '20px' }}>
              <input
                type="radio"
                checked={!isNewBranch}
                onChange={() => setIsNewBranch(false)}
                style={{ marginRight: '8px' }}
              />
              Use existing branch
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isNewBranch ? 'New branch name:' : 'Existing branch name:'}
            </label>
            <input
              type="text"
              className="form-input"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder={isNewBranch ? "feature/my-feature" : "origin/existing-branch"}
              autoFocus
              required
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Worktree will be created at: .worktree_project_{branchName.replace(/[^a-zA-Z0-9]/g, '_')}
          </div>

          <div className="modal-actions">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorktreeModal;