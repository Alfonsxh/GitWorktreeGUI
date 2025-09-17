import React from 'react';
import { IconDiff, IconFiles, IconTerminal } from './icons';

export interface Tab {
  id: string;
  title: string;
  type: 'terminal' | 'editor' | 'git-log';
  content?: any;
  isDirty?: boolean;
  isClosable?: boolean;
  meta?: Record<string, any>;
}

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd?: () => void;
}

const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabAdd
}) => {
  const renderIcon = (type: Tab['type']) => {
    switch (type) {
      case 'terminal':
        return <IconTerminal size={14} />;
      case 'git-log':
        return <IconDiff size={14} />;
      case 'editor':
      default:
        return <IconFiles size={14} />;
    }
  };

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{renderIcon(tab.type)}</span>
            <span className="tab-title">
              {tab.isDirty ? '● ' : ''}
              {tab.title}
            </span>
            {tab.isClosable !== false && (
              <button
                className="tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {onTabAdd && (
          <button className="tab-add" onClick={onTabAdd}>
            +
          </button>
        )}
      </div>
    </div>
  );
};

export default TabManager;
