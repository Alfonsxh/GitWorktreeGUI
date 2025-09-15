import React, { useState, useEffect } from 'react';

export interface Tab {
  id: string;
  title: string;
  type: 'terminal' | 'editor' | 'git-log';
  content?: any;
  isDirty?: boolean;
  isClosable?: boolean;
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
  const getTabIcon = (type: Tab['type']) => {
    switch (type) {
      case 'terminal':
        return '🖥';
      case 'editor':
        return '📝';
      case 'git-log':
        return '📊';
      default:
        return '📄';
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
            <span className="tab-icon">{getTabIcon(tab.type)}</span>
            <span className="tab-title">
              {tab.isDirty && '● '}
              {tab.title}
            </span>
            {tab.isClosable !== false && (
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
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