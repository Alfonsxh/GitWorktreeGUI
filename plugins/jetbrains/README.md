# Git Worktree Manager for JetBrains IDEs

A powerful Git Worktree management plugin for IntelliJ IDEA and other JetBrains IDEs.

## Features

- 🌳 **Visual Worktree Management**: View all worktrees in a dedicated tool window
- 🚀 **Quick Switch**: Switch between worktrees with Alt+Shift+W
- 🔒 **Lock/Unlock**: Protect worktrees from accidental modifications
- 📁 **Easy Navigation**: Open worktrees in terminal or file manager
- 📊 **Status Bar Integration**: See current worktree at a glance
- ⚙️ **Configurable Settings**: Customize refresh intervals and behaviors

## Installation

### From JetBrains Marketplace

1. Open IntelliJ IDEA (or any JetBrains IDE)
2. Go to **Settings/Preferences** → **Plugins**
3. Search for "Git Worktree Manager"
4. Click **Install**

### From Disk

1. Download the latest `.zip` file from [Releases](https://github.com/yourusername/git-worktree-manager/releases)
2. Go to **Settings/Preferences** → **Plugins**
3. Click the gear icon → **Install Plugin from Disk**
4. Select the downloaded file

## Usage

### Tool Window

Open the Git Worktree tool window:
- **View** → **Tool Windows** → **Git Worktree**
- Or click the worktree icon in the left sidebar

### Keyboard Shortcuts

- `Alt+Shift+W` - Quick switch worktree

### Actions

All actions are available from:
- The tool window toolbar
- Right-click context menu in the tree
- **VCS** → **Git Worktree** menu

## Development

### Prerequisites

- JDK 17 or higher
- IntelliJ IDEA (Community or Ultimate)
- Kotlin plugin

### Building

```bash
cd plugins/jetbrains
./gradlew build
```

### Running

```bash
./gradlew runIde
```

This will launch a sandbox IntelliJ IDEA instance with the plugin installed.

### Testing

```bash
./gradlew test
```

### Creating Distribution

```bash
./gradlew buildPlugin
```

The plugin ZIP will be created in `build/distributions/`.

## Configuration

The plugin can be configured in:
**Settings/Preferences** → **Version Control** → **Git Worktree Manager**

Available settings:
- **Auto-refresh**: Enable/disable automatic refresh
- **Refresh interval**: Set how often to refresh (10-300 seconds)
- **Status bar**: Show/hide current worktree in status bar
- **Confirmations**: Enable/disable confirmation dialogs
- **Default behavior**: Configure default window opening behavior

## Compatibility

- IntelliJ IDEA 2023.2 and later
- All JetBrains IDEs based on IntelliJ Platform 232+

## License

MIT License - see [LICENSE](../../LICENSE) file for details.