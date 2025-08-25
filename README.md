# Git Worktree Manager

A cross-IDE Git Worktree management tool optimized for AI-assisted programming workflows.

## Features

- 🌳 **Visual Worktree Management**: View and manage all your Git worktrees in a tree view
- 🚀 **Quick Switch**: Switch between worktrees with a single click or keyboard shortcut
- 🔒 **Lock/Unlock**: Protect worktrees from accidental modifications
- 📁 **Easy Navigation**: Open worktrees in terminal or file explorer
- 🎯 **AI-Optimized**: Perfect for managing multiple parallel development tasks with AI tools
- 🔄 **Auto-Refresh**: Automatically updates when worktrees change
- 📊 **Status Bar Integration**: See current worktree at a glance

## Supported Platforms

- ✅ **VS Code Extension** - Ready for VS Code Marketplace
- ✅ **JetBrains Plugin** - Ready for JetBrains Marketplace (IntelliJ IDEA, WebStorm, PyCharm, etc.)

## Installation

### VS Code

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Git Worktree Manager"
4. Click Install

Or install via command line:
```bash
code --install-extension git-worktree-manager
```

### JetBrains IDEs

1. Open any JetBrains IDE (IntelliJ IDEA, WebStorm, PyCharm, etc.)
2. Go to Settings/Preferences → Plugins
3. Search for "Git Worktree Manager"
4. Click Install

Or install from disk:
```bash
cd plugins/jetbrains
./gradlew buildPlugin
# Install the generated .zip file from build/distributions/
```

## Usage

### VS Code

1. Open a Git repository in VS Code
2. Click the Worktree icon in the Activity Bar
3. View and manage your worktrees in the sidebar

#### Commands

- `Ctrl+Alt+W` / `Cmd+Alt+W`: Quick switch worktree
- `Git Worktree: Add`: Create a new worktree
- `Git Worktree: Remove`: Remove selected worktree
- `Git Worktree: Lock/Unlock`: Lock or unlock a worktree

## Development

This is a monorepo containing:
- `packages/core`: Shared core logic
- `plugins/vscode`: VS Code extension
- `plugins/jetbrains`: JetBrains plugin

### Prerequisites

- Node.js 18+ and npm/pnpm
- Git 2.30+
- For JetBrains development: JDK 17+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/git-worktree-manager.git
cd git-worktree-manager

# Install dependencies
npm install

# Build core module
npm run build:core

# Development
npm run dev:vscode      # VS Code extension
npm run dev:jetbrains   # JetBrains plugin
```

### Testing

```bash
npm test              # Run all tests
npm run test:core     # Test core module only
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

- [x] Core module with Git worktree operations
- [x] VS Code extension MVP
- [x] JetBrains plugin MVP  
- [ ] Advanced merge UI
- [ ] AI task allocation suggestions
- [ ] Team collaboration features
- [ ] Cloud sync for settings

## Support

- 🐛 [Report Issues](https://github.com/yourusername/git-worktree-manager/issues)
- 💬 [Discussions](https://github.com/yourusername/git-worktree-manager/discussions)
- 📖 [Documentation](https://github.com/yourusername/git-worktree-manager/wiki)

## Acknowledgments

Built with ❤️ for developers using AI-assisted programming tools.