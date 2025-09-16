import Store from 'electron-store';

interface AppState {
  lastProjectPath?: string;
  recentProjects?: string[];
  windowBounds?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

class AppStore {
  private store: Store<AppState>;

  constructor() {
    this.store = new Store<AppState>({
      name: 'git-worktree-gui-config',
      defaults: {
        recentProjects: [],
        windowBounds: {
          width: 1200,
          height: 800
        }
      }
    });
  }

  // Project path management
  getLastProjectPath(): string | undefined {
    return this.store.get('lastProjectPath');
  }

  setLastProjectPath(path: string): void {
    this.store.set('lastProjectPath', path);
    this.addToRecentProjects(path);
  }

  clearLastProjectPath(): void {
    this.store.delete('lastProjectPath');
  }

  // Recent projects management
  getRecentProjects(): string[] {
    return this.store.get('recentProjects', []);
  }

  addToRecentProjects(path: string): void {
    const recent = this.getRecentProjects();
    // Remove if already exists
    const filtered = recent.filter(p => p !== path);
    // Add to front
    filtered.unshift(path);
    // Keep only last 10
    const trimmed = filtered.slice(0, 10);
    this.store.set('recentProjects', trimmed);
  }

  clearRecentProjects(): void {
    this.store.set('recentProjects', []);
  }

  // Window bounds management
  getWindowBounds() {
    return this.store.get('windowBounds');
  }

  setWindowBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): void {
    this.store.set('windowBounds', bounds);
  }
}

export default new AppStore();