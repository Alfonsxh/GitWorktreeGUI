import React, { useState } from 'react';
import { Worktree } from '../../shared/types';
import BranchSelectDialog from './BranchSelectDialog';

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
  const [branchDialog, setBranchDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    branches: string[];
    defaultBranch?: string;
    onSelect: (branch: string | null) => void;
  } | null>(null);
  // Simple context menu implementation
  const showContextMenu = (e: React.MouseEvent, menuItems: any[]) => {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create context menu element
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.zIndex = '10000';

    // Build menu items
    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        menu.appendChild(separator);
      } else if (item.submenu) {
        const submenuItem = document.createElement('div');
        submenuItem.className = 'context-menu-item has-submenu';
        submenuItem.textContent = item.label;

        const submenu = document.createElement('div');
        submenu.className = 'context-submenu';

        item.submenu.forEach((subItem: any) => {
          if (subItem.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            submenu.appendChild(separator);
          } else {
            const subMenuItem = document.createElement('div');
            subMenuItem.className = 'context-menu-item';
            subMenuItem.textContent = subItem.label;
            subMenuItem.onclick = () => {
              menu.remove();
              subItem.click();
            };
            submenu.appendChild(subMenuItem);
          }
        });

        submenuItem.appendChild(submenu);
        menu.appendChild(submenuItem);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
          menu.remove();
          item.click();
        };
        menu.appendChild(menuItem);
      }
    });

    // Add click handler to close menu when clicking outside
    const closeMenu = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);

    document.body.appendChild(menu);
  };

  const handleContextMenu = async (e: React.MouseEvent, worktree: Worktree) => {
    e.preventDefault();
    e.stopPropagation();

    const menuItems = [];

    // Checkout to this branch
    menuItems.push({
      label: `Checkout to ${worktree.branch}`,
      click: async () => {
        try {
          await window.electronAPI.gitCheckout(worktree.path, worktree.branch);
          onSelect(worktree);
        } catch (error) {
          console.error('Failed to checkout:', error);
          alert(`Failed to checkout: ${error}`);
        }
      }
    });

    // Separator
    menuItems.push({ type: 'separator' });

    // Git operations
    menuItems.push({
      label: 'Git Operations',
      submenu: [
        {
          label: 'Pull Latest Changes',
          click: async () => {
            try {
              await window.electronAPI.gitPull(worktree.path);
              alert('Pull completed successfully');
            } catch (error) {
              console.error('Failed to pull:', error);
              alert(`Failed to pull: ${error}`);
            }
          }
        },
        {
          label: 'Push to Remote',
          click: async () => {
            try {
              await window.electronAPI.gitPush(worktree.path, worktree.branch);
              alert('Push completed successfully');
            } catch (error) {
              console.error('Failed to push:', error);
              alert(`Failed to push: ${error}`);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Merge from Branch...',
          click: async () => {
            const branches = await window.electronAPI.gitGetAllBranches();
            const targetBranch = prompt(`Merge which branch into ${worktree.branch}?\n\nAvailable branches:\n${branches.join('\n')}`);
            if (targetBranch) {
              try {
                await window.electronAPI.gitMerge(worktree.path, targetBranch);
                alert(`Successfully merged ${targetBranch} into ${worktree.branch}`);
              } catch (error) {
                console.error('Failed to merge:', error);
                alert(`Failed to merge: ${error}`);
              }
            }
          }
        },
        {
          label: 'Rebase onto Branch...',
          click: async () => {
            const branches = await window.electronAPI.gitGetAllBranches();
            const targetBranch = prompt(`Rebase ${worktree.branch} onto which branch?\n\nAvailable branches:\n${branches.join('\n')}`);
            if (targetBranch) {
              try {
                await window.electronAPI.gitRebase(worktree.path, targetBranch);
                alert(`Successfully rebased onto ${targetBranch}`);
              } catch (error) {
                console.error('Failed to rebase:', error);
                alert(`Failed to rebase: ${error}`);
              }
            }
          }
        }
      ]
    });

    // Create MR/PR
    menuItems.push({ type: 'separator' });
    menuItems.push({
      label: 'Create Merge/Pull Request',
      click: async () => {
        try {
          const remoteUrl = await window.electronAPI.gitGetRemoteUrl();
          if (remoteUrl) {
            const branches = await window.electronAPI.gitGetAllBranches();
            setBranchDialog({
              show: true,
              title: 'Create Merge/Pull Request',
              message: `Select target branch for MR/PR from ${worktree.branch}:`,
              branches: branches.filter(b => b !== worktree.branch),
              defaultBranch: 'main',
              onSelect: async (targetBranch) => {
                if (targetBranch) {
                  try {
                    await window.electronAPI.gitCreateMergeRequest(worktree.path, targetBranch);
                  } catch (error) {
                    console.error('Failed to create MR/PR:', error);
                    window.electronAPI.showMessageBox({
                      type: 'error',
                      title: 'Failed to create MR/PR',
                      message: `${error}`,
                      buttons: ['OK']
                    });
                  }
                }
              }
            });
          } else {
            window.electronAPI.showMessageBox({
              type: 'error',
              title: 'No Remote',
              message: 'No remote repository configured',
              buttons: ['OK']
            });
          }
        } catch (error) {
          console.error('Failed to create MR/PR:', error);
          window.electronAPI.showMessageBox({
            type: 'error',
            title: 'Failed to create MR/PR',
            message: `${error}`,
            buttons: ['OK']
          });
        }
      }
    });

    // Delete worktree (only for non-main branches)
    if (!worktree.isMain) {
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: `Delete Worktree "${worktree.branch}"`,
        click: async () => {
          const result = await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Delete Worktree',
            message: `Are you sure you want to delete worktree "${worktree.branch}"?`,
            buttons: ['Delete', 'Cancel'],
            defaultId: 1,
            cancelId: 1
          });
          if (result.response === 0) {
            onDelete(worktree);
          }
        }
      });
    }

    // Create simple HTML context menu
    showContextMenu(e, menuItems);
  };

  return (
    <>
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
              <span className={`status-indicator ${selectedWorktree?.path === worktree.path ? 'status-active' : 'status-inactive'}`} />
              {worktree.branch || 'main'}
              {worktree.isMain && ' 🏠'}
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
    </>
  );
};

export default WorktreeList;