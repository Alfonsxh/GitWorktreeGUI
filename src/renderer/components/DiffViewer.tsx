import React, { useState, useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface DiffViewerProps {
  filePath: string;
  worktreePath: string;
  currentContent?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ filePath, worktreePath, currentContent }) => {
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [fileHistory, setFileHistory] = useState<any[]>([]);
  const [diffStats, setDiffStats] = useState({ additions: 0, deletions: 0 });
  const editorRef = useRef<any>(null);
  const [renderSideBySide, setRenderSideBySide] = useState(true);

  useEffect(() => {
    loadDiffContent();
    loadFileHistory();
  }, [filePath, worktreePath, currentContent]);

  const loadDiffContent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get original content from HEAD
      const original = await window.electronAPI.gitShowFile(worktreePath, filePath);
      setOriginalContent(original || '');

      // Get current content
      let current: string;
      if (currentContent !== undefined) {
        current = currentContent;
        setModifiedContent(currentContent);
      } else {
        current = await window.electronAPI.readFile(filePath);
        setModifiedContent(current);
      }

      // Get accurate diff stats from git
      const stats = await window.electronAPI.gitDiffStat(worktreePath, filePath);
      setDiffStats(stats);
    } catch (err) {
      console.error('Failed to load diff content:', err);
      setError('Failed to load diff content');
    } finally {
      setLoading(false);
    }
  };

  const loadFileHistory = async () => {
    try {
      const history = await window.electronAPI.gitLogFile(worktreePath, filePath);
      setFileHistory(history);
    } catch (err) {
      console.error('Failed to load file history:', err);
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Are you sure you want to discard all changes to this file?')) {
      return;
    }

    try {
      await window.electronAPI.gitDiscard(worktreePath, filePath);
      // Reload the content
      loadDiffContent();
      alert('Changes discarded successfully');
    } catch (err) {
      console.error('Failed to discard changes:', err);
      alert('Failed to discard changes');
    }
  };

  const handleStage = async () => {
    try {
      await window.electronAPI.gitStage(worktreePath, filePath);
      alert('File staged successfully');
    } catch (err) {
      console.error('Failed to stage file:', err);
      alert('Failed to stage file');
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(filePath);
  };

  const handleRevertLines = async (startLine: number, endLine: number) => {
    if (!confirm(`Revert changes from line ${startLine} to ${endLine}?`)) {
      return;
    }

    try {
      // Get the current file content
      const currentLines = modifiedContent.split('\n');
      const originalLines = originalContent.split('\n');

      // Replace the modified lines with original lines
      const newLines = [...currentLines];
      for (let i = startLine - 1; i < endLine && i < originalLines.length; i++) {
        if (i < currentLines.length) {
          newLines[i] = originalLines[i] || '';
        }
      }

      // Write the modified content back
      const newContent = newLines.join('\n');
      await window.electronAPI.writeFile(filePath, newContent);

      // Reload the content
      await loadDiffContent();
      alert('Lines reverted successfully');
    } catch (err) {
      console.error('Failed to revert lines:', err);
      alert('Failed to revert lines');
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Get the modified editor (right side in side-by-side, or the only editor in inline mode)
    const modifiedEditor = editor.getModifiedEditor();

    // Add custom context menu actions
    modifiedEditor.addAction({
      id: 'revert-line',
      label: 'Revert This Line',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: async (ed: any) => {
        const position = ed.getPosition();
        if (position) {
          await handleRevertLines(position.lineNumber, position.lineNumber);
        }
      }
    });

    modifiedEditor.addAction({
      id: 'revert-selection',
      label: 'Revert Selected Lines',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,
      run: async (ed: any) => {
        const selection = ed.getSelection();
        if (selection) {
          const startLine = selection.startLineNumber;
          const endLine = selection.endLineNumber;
          await handleRevertLines(startLine, endLine);
        }
      }
    });

    modifiedEditor.addAction({
      id: 'stage-file',
      label: 'Stage File',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.7,
      run: async () => {
        await handleStage();
      }
    });

    modifiedEditor.addAction({
      id: 'discard-all',
      label: 'Discard All Changes',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.8,
      run: async () => {
        await handleDiscard();
      }
    });
  };

  if (loading) {
    return (
      <div className="diff-viewer-container">
        <div className="diff-viewer-loading">Loading diff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer-container">
        <div className="diff-viewer-error">{error}</div>
      </div>
    );
  }

  const fileName = filePath.split('/').pop() || 'Unknown File';
  const relativePath = filePath.replace(worktreePath + '/', '');

  // Determine file language for syntax highlighting
  const getLanguage = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'java': 'java',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'sql': 'sql',
      'md': 'markdown',
      'markdown': 'markdown',
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'cmake': 'cmake',
      'gradle': 'gradle',
      'r': 'r',
      'lua': 'lua',
      'vim': 'vim',
      'pl': 'perl',
      'pm': 'perl',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const language = getLanguage(filePath);

  return (
    <div className="diff-viewer-container">
      <div className="diff-viewer-info-bar">
        <span className="diff-viewer-file-name">📄 {relativePath}</span>
        <span className="diff-viewer-stats">
          <span style={{ color: '#27ae60' }}>+{diffStats.additions}</span>
          {' / '}
          <span style={{ color: '#e74c3c' }}>-{diffStats.deletions}</span>
        </span>
        <span className="diff-viewer-status">Modified</span>
      </div>

      <div className="diff-viewer-toolbar">
        <div className="diff-viewer-actions">
          <button
            className="diff-viewer-btn"
            onClick={() => setRenderSideBySide(!renderSideBySide)}
            title={renderSideBySide ? 'Switch to inline view' : 'Switch to side-by-side view'}
          >
            {renderSideBySide ? '⊟ Inline' : '⊞ Side by Side'}
          </button>
          <button
            className="diff-viewer-btn"
            onClick={loadDiffContent}
            title="Refresh"
          >
            ↻ Refresh
          </button>
          <button
            className="diff-viewer-btn danger"
            onClick={handleDiscard}
            title="Discard all changes"
          >
            🗑 Discard All
          </button>
          <button
            className="diff-viewer-btn"
            onClick={handleStage}
            title="Stage file"
          >
            ➕ Stage
          </button>
          <button
            className="diff-viewer-btn"
            onClick={handleCopyPath}
            title="Copy file path"
          >
            📋 Copy Path
          </button>
          <button
            className="diff-viewer-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="Toggle history"
          >
            📜 History
          </button>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Right-click on lines for revert options
        </div>
      </div>

      {showHistory && fileHistory.length > 0 && (
        <div className="diff-viewer-history">
          <h4>Recent Commits:</h4>
          <ul>
            {fileHistory.slice(0, 5).map((commit, index) => (
              <li key={index}>
                <code>{commit.hash.substring(0, 7)}</code> - {commit.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="diff-viewer-content" style={{ flex: 1, height: '100%' }}>
        <DiffEditor
          original={originalContent}
          modified={modifiedContent}
          language={language}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: false,
            renderSideBySide: renderSideBySide,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            renderWhitespace: 'selection',
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            diffCodeLens: false,
            renderLineHighlight: 'all',
            renderValidationDecorations: 'on',
            enableSplitViewResizing: true,
            originalEditable: false,
            ignoreTrimWhitespace: false,
            renderIndicators: true,
          }}
        />
      </div>
    </div>
  );
};

export default DiffViewer;