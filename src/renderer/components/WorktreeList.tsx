import React, { useEffect, useState } from 'react';
import { Worktree } from '../../shared/types';
import BranchSelectDialog from './BranchSelectDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { IconDotsVertical, IconGitBranch } from './icons';
import { useAppState } from '../state/AppStateContext';

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
  const { worktreeSummaries: summaries } = useAppState();
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [branchDialog, setBranchDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    branches: string[];
    defaultBranch?: string;
    onSelect: (branch: string | null) => void;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    show: boolean;
    worktree: Worktree;
  } | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branches = await window.electronAPI.gitGetAllBranches();
        setAvailableBranches(branches);
      } catch (error) {
        console.error('Failed to load branches:', error);
      }
    };

    if (worktrees.length > 0) {
      loadBranches();
    }
  }, [worktrees]);

  const handleBranchSwitch = async (worktree: Worktree, newBranch: string) => {
    if (!newBranch || newBranch === worktree.branch) return;

    try {
      await window.electronAPI.gitSwitchBranch(worktree.path, newBranch);
      onSelect(worktree);
    } catch (error: any) {
      await window.electronAPI.showMessageBox({
        type: 'error',
        title: 'Failed to switch branch',
        message: error.message || 'An error occurred while switching branch',
        buttons: ['OK']
      });
    }
  };

  const openContextMenu = (event: React.MouseEvent, worktree: Worktree) => {
    event.stopPropagation();
    event.preventDefault();

    const menuItems: Array<{ label?: string; type?: 'separator'; action?: () => void }> = [];

    menuItems.push({
      label: `Checkout ${worktree.branch || 'main'}`,
      action: async () => {
        try {
          await window.electronAPI.gitCheckout(worktree.path, worktree.branch || 'main');
          onSelect(worktree);
        } catch (error) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Checkout failed',
            message: `${error}`,
            buttons: ['OK']
          });
        }
      }
    });

    menuItems.push({ type: 'separator' });

    menuItems.push({
      label: 'Pull latest',
      action: async () => {
        try {
          await window.electronAPI.gitPull(worktree.path);
        } catch (error) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Pull failed',
            message: `${error}`,
            buttons: ['OK']
          });
        }
      }
    });

    menuItems.push({
      label: 'Push branch',
      action: async () => {
        try {
          await window.electronAPI.gitPush(worktree.path, worktree.branch);
        } catch (error) {
          await window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Push failed',
            message: `${error}`,
            buttons: ['OK']
          });
        }
      }
    });

    menuItems.push({ type: 'separator' });

    menuItems.push({
      label: 'Switch branch…',
      action: () => {
        setBranchDialog({
          show: true,
          title: 'Switch Branch',
          message: 'Choose a branch to check out in this worktree:',
          branches: availableBranches,
          defaultBranch: worktree.branch,
          onSelect: branch => {
            if (branch) {
              handleBranchSwitch(worktree, branch);
            }
          }
        });
      }
    });

    menuItems.push({
      label: 'Create Merge Request…',
      action: async () => {
        const targetBranch = await window.electronAPI.showPrompt(
          'Create Merge Request',
          'Target branch',
          'main'
        );
        if (targetBranch) {
          await window.electronAPI.gitCreateMergeRequest(worktree.path, targetBranch);
        }
      }
    });

    if (!worktree.isMain) {
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: `Delete worktree`,
        action: () => setDeleteDialog({ show: true, worktree })
      });
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.zIndex = '2000';
    menu.style.minWidth = '180px';
    menu.style.padding = '6px';
    menu.style.background = '#fff';
    menu.style.boxShadow = 'var(--shadow-sm)';
    menu.style.border = '1px solid var(--color-border)';
    menu.style.borderRadius = 'var(--radius-sm)';
    menu.style.top = `${event.clientY}px`;
    menu.style.left = `${event.clientX}px`;

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.margin = '6px 0';
        separator.style.background = 'var(--color-border)';
        menu.appendChild(separator);
        return;
      }

      const button = document.createElement('button');
      button.style.width = '100%';
      button.style.background = 'transparent';
      button.style.border = 'none';
      button.style.padding = '6px 8px';
      button.style.textAlign = 'left';
      button.style.cursor = 'pointer';
      button.style.fontSize = '13px';
      button.textContent = item.label ?? '';
      button.onmouseover = () => {
        button.style.background = 'var(--color-surface-alt)';
      };
      button.onmouseout = () => {
        button.style.background = 'transparent';
      };
      button.onclick = () => {
        menu.remove();
        item.action?.();
      };
      menu.appendChild(button);
    });

    const handleOutsideClick = (evt: MouseEvent) => {
      if (!menu.contains(evt.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    };

    document.body.appendChild(menu);
    requestAnimationFrame(() => document.addEventListener('mousedown', handleOutsideClick));
  };

  if (worktrees.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No worktrees yet.
      </div>
    );
  }

  return (
    <>
      {worktrees.map(worktree => {
        const isActive = selectedWorktree?.path === worktree.path;
        const summary = summaries[worktree.path];
        return (
          <div
            key={worktree.path}
            className={`worktree-card ${isActive ? 'worktree-card--active' : ''}`}
            onClick={() => onSelect(worktree)}
          >
            <div className="worktree-card__title">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconGitBranch size={14} />
                {worktree.branch || 'main'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {summary && summary.dirty > 0 && (
                  <span className="badge badge--warning">{summary.dirty} changes</span>
                )}
                {worktree.isMain && <span className="badge badge--main">Main</span>}
                {worktree.isLocked && <span className="badge">Locked</span>}
                {worktree.isPrunable && <span className="badge badge--warning">Prunable</span>}
                <button
                  className="button button--muted button--icon"
                  title="More actions"
                  onClick={event => openContextMenu(event, worktree)}
                >
                  <IconDotsVertical size={16} />
                </button>
              </div>
            </div>
            <div className="worktree-card__meta">
              <span className="worktree-card__path">{worktree.path}</span>
            </div>
          </div>
        );
      })}

      {branchDialog?.show && (
        <BranchSelectDialog
          title={branchDialog.title}
          message={branchDialog.message}
          branches={branchDialog.branches}
          defaultBranch={branchDialog.defaultBranch}
          onSelect={(branch) => {
            branchDialog.onSelect(branch);
            setBranchDialog(null);
          }}
          onClose={() => setBranchDialog(null)}
        />
      )}

      {deleteDialog?.show && (
        <DeleteConfirmDialog
          worktree={deleteDialog.worktree}
          onConfirm={() => {
            onDelete(deleteDialog.worktree);
            setDeleteDialog(null);
          }}
          onCancel={() => setDeleteDialog(null)}
        />
      )}
    </>
  );
};

export default WorktreeList;
