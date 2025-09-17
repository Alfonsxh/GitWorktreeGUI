import React, { createContext, useContext } from 'react';

export interface WorktreeSummary {
  dirty: number;
}

interface AppStateValue {
  worktreeSummaries: Record<string, WorktreeSummary>;
}

const defaultState: AppStateValue = {
  worktreeSummaries: {}
};

const AppStateContext = createContext<AppStateValue>(defaultState);

export const AppStateProvider: React.FC<React.PropsWithChildren<AppStateValue>> = ({
  worktreeSummaries,
  children
}) => {
  return (
    <AppStateContext.Provider value={{ worktreeSummaries }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => useContext(AppStateContext);
