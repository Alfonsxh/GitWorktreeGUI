import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface FileEditorProps {
  filePath: string;
  content: string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (content: string) => void;
}

const FileEditor: React.FC<FileEditorProps> = ({
  filePath,
  content,
  language = 'javascript',
  onChange,
  onSave
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setEditorContent(content);
    setIsDirty(false);
  }, [content, filePath]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      setIsDirty(value !== content);
      onChange?.(value);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Add save shortcut
    editor.addCommand(
      // Cmd+S / Ctrl+S
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        handleSave();
      }
    );
  };

  const handleSave = () => {
    console.log('handleSave called, isDirty:', isDirty, 'onSave exists:', !!onSave);
    if (onSave && isDirty) {
      console.log('Saving file with content length:', editorContent.length);
      onSave(editorContent);
      setIsDirty(false);
    }
  };

  const detectLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'gitignore': 'ignore'
    };

    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="file-editor">
      <div className="editor-header">
        <span className="editor-file-path">{filePath}</span>
        {isDirty && <span className="editor-dirty-indicator">●</span>}
        <button
          className="editor-save-btn"
          onClick={handleSave}
          disabled={!isDirty}
        >
          Save (⌘S)
        </button>
      </div>
      <Editor
        height="calc(100% - 40px)"
        language={language || detectLanguage(filePath)}
        value={editorContent}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2
        }}
      />
    </div>
  );
};

export default FileEditor;