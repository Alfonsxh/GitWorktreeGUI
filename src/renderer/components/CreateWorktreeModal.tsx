import React, { useState, useEffect } from 'react';

interface CreateWorktreeModalProps {
  onClose: () => void;
  onCreate: (branch: string, newBranch: boolean) => void;
  projectPath?: string;
}

const CreateWorktreeModal: React.FC<CreateWorktreeModalProps> = ({ onClose, onCreate, projectPath }) => {
  const [branchName, setBranchName] = useState('');
  const [isNewBranch, setIsNewBranch] = useState(true);
  const [worktreePath, setWorktreePath] = useState('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<string[]>([]);
  const [showBranchList, setShowBranchList] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load available branches
  useEffect(() => {
    const loadBranches = async () => {
      if (projectPath) {
        try {
          const branches = await window.electronAPI.gitGetAllBranches();
          setAvailableBranches(branches);
        } catch (error) {
          console.error('Failed to load branches:', error);
        }
      }
    };
    loadBranches();
  }, [projectPath]);

  // Filter branches based on input
  useEffect(() => {
    if (!isNewBranch) {
      if (branchName) {
        const filtered = availableBranches.filter(branch =>
          branch.toLowerCase().includes(branchName.toLowerCase())
        );
        setFilteredBranches(filtered);
      } else {
        // Show all branches if no filter text
        setFilteredBranches(availableBranches);
      }
      setSelectedIndex(0);
    } else {
      setFilteredBranches([]);
    }
  }, [branchName, availableBranches, isNewBranch]);

  // Generate worktree path based on branch name
  useEffect(() => {
    if (projectPath && branchName) {
      const parts = projectPath.split(/[\\/]/);
      const projectName = parts[parts.length - 1];
      const parentDir = parts.slice(0, -1).join('/');

      // Clean branch name for directory
      const sanitized = branchName
        .replace(/[\\/]/g, '_')
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const cleanBranch = sanitized || 'worktree';
      const baseName = `.worktree_${projectName}_${cleanBranch}`;

      setWorktreePath(baseName);
    } else {
      setWorktreePath('');
    }
  }, [projectPath, branchName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branchName.trim()) {
      onCreate(branchName.trim(), isNewBranch);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isNewBranch && showBranchList && filteredBranches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredBranches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredBranches[selectedIndex]) {
          setBranchName(filteredBranches[selectedIndex]);
          setShowBranchList(false);
        }
      } else if (e.key === 'Escape') {
        setShowBranchList(false);
      }
    }
  };

  const selectBranch = (branch: string) => {
    setBranchName(branch);
    setShowBranchList(false);
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
              {isNewBranch ? 'New branch name:' : 'Select existing branch:'}
            </label>
            {isNewBranch ? (
              <input
                type="text"
                className="form-input"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="feature/my-feature"
                autoFocus
                required
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={branchName}
                  onChange={(e) => {
                    setBranchName(e.target.value);
                    setShowBranchList(true);
                  }}
                  onFocus={() => setShowBranchList(true)}
                  onBlur={() => setTimeout(() => setShowBranchList(false), 200)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to filter branches..."
                  autoFocus
                  required
                />
                {showBranchList && filteredBranches.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '4px',
                    boxShadow: 'var(--shadow-sm)',
                    zIndex: 10
                  }}>
                    {filteredBranches.map((branch, index) => (
                      <div
                        key={branch}
                        onClick={() => selectBranch(branch)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          background: index === selectedIndex ? 'var(--color-accent-soft)' : 'transparent',
                          color: index === selectedIndex ? 'var(--color-accent)' : 'var(--color-text-primary)',
                          fontSize: '13px'
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {branch}
                      </div>
                    ))}
                  </div>
                )}
                {!isNewBranch && availableBranches.length === 0 && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '4px'
                  }}>
                    Loading branches...
                  </div>
                )}
              </div>
            )}
          </div>

          {worktreePath && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Worktree will be created at: {worktreePath}
            </div>
          )}

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