import React, { useState, useEffect } from 'react';

interface BranchSelectDialogProps {
  title: string;
  message: string;
  branches: string[];
  defaultBranch?: string;
  onSelect: (branch: string | null) => void;
  onClose: () => void;
}

const BranchSelectDialog: React.FC<BranchSelectDialogProps> = ({
  title,
  message,
  branches,
  defaultBranch = 'main',
  onSelect,
  onClose
}) => {
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [filter, setFilter] = useState('');

  const filteredBranches = branches.filter(branch =>
    branch.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = () => {
    onSelect(selectedBranch);
    onClose();
  };

  const handleCancel = () => {
    onSelect(null);
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBranch]);

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal branch-select-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>

        <div className="form-group">
          <label className="form-label">Filter branches:</label>
          <input
            type="text"
            className="form-input"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Type to filter..."
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Select branch:</label>
          <div className="branch-list">
            {filteredBranches.map(branch => (
              <div
                key={branch}
                className={`branch-item ${selectedBranch === branch ? 'selected' : ''}`}
                onClick={() => setSelectedBranch(branch)}
              >
                <input
                  type="radio"
                  id={`branch-${branch}`}
                  name="branch"
                  value={branch}
                  checked={selectedBranch === branch}
                  onChange={() => setSelectedBranch(branch)}
                />
                <label htmlFor={`branch-${branch}`}>{branch}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="button button-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="button" onClick={handleSubmit}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchSelectDialog;