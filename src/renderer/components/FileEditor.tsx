import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { GitDecorationsService } from '../services/gitDecorations';

interface FileEditorProps {
  filePath: string;
  content: string;
  language?: string;
  worktreePath?: string;
  onChange?: (value: string) => void;
  onSave?: (content: string) => void;
}

const FileEditor: React.FC<FileEditorProps> = ({
  filePath,
  content,
  language = 'javascript',
  worktreePath,
  onChange,
  onSave
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const originalContentRef = useRef(content);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved'>('idle');
  const editorRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gitDecorationsService = useRef<GitDecorationsService>(new GitDecorationsService());

  useEffect(() => {
    // Reset when switching to a different file or content changes
    setEditorContent(content);
    originalContentRef.current = content;
    setIsDirty(false);
    setAutoSaveStatus('idle');

    // Clear any pending auto-save when switching files
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    if (autoSaveStatusTimeoutRef.current) {
      clearTimeout(autoSaveStatusTimeoutRef.current);
      autoSaveStatusTimeoutRef.current = null;
    }
  }, [filePath, content]); // Reset when file path or content changes

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (autoSaveStatusTimeoutRef.current) {
        clearTimeout(autoSaveStatusTimeoutRef.current);
      }
      gitDecorationsService.current.dispose();
    };
  }, []);

  // Update decorations when file is saved or path changes
  useEffect(() => {
    if (worktreePath && filePath && editorRef.current) {
      gitDecorationsService.current.updateDecorations(filePath, worktreePath);
    }
  }, [filePath, worktreePath, isDirty]);

  const handleSave = useCallback(() => {
    console.log('handleSave called, editorContent length:', editorContent.length, 'originalContent length:', originalContentRef.current.length);
    const currentDirty = editorContent !== originalContentRef.current;
    console.log('isDirty:', currentDirty, 'onSave exists:', !!onSave);
    if (onSave) {
      console.log('Calling onSave with content length:', editorContent.length);
      onSave(editorContent);
      originalContentRef.current = editorContent; // Update original content after save
      setIsDirty(false);
    }
  }, [editorContent, onSave]);

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const saveShortcut = isMac ? e.metaKey && e.key === 's' : e.ctrlKey && e.key === 's';

      if (saveShortcut) {
        e.preventDefault();
        console.log('Keyboard shortcut triggered');
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      console.log('Editor content changed, new length:', value.length, 'original length:', originalContentRef.current.length);
      setEditorContent(value);
      const dirty = value !== originalContentRef.current;
      setIsDirty(dirty);
      console.log('isDirty set to:', dirty);
      onChange?.(value);

      // Auto-save: Clear previous timeout and set a new one
      if (dirty && onSave) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        setAutoSaveStatus('pending');

        // Auto-save after 1 second of no typing
        autoSaveTimeoutRef.current = setTimeout(() => {
          console.log('Auto-saving file...');
          setAutoSaveStatus('saving');
          onSave(value);
          originalContentRef.current = value;
          setIsDirty(false);
          setAutoSaveStatus('saved');
          autoSaveTimeoutRef.current = null;

          // Clear saved status after 2 seconds
          if (autoSaveStatusTimeoutRef.current) {
            clearTimeout(autoSaveStatusTimeoutRef.current);
          }
          autoSaveStatusTimeoutRef.current = setTimeout(() => {
            setAutoSaveStatus('idle');
            autoSaveStatusTimeoutRef.current = null;
          }, 2000);
        }, 1000);
      } else if (!dirty) {
        setAutoSaveStatus('idle');
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
      }
    }
  };

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;

    // Initialize git decorations
    gitDecorationsService.current.setEditor(editor);
    if (worktreePath && filePath) {
      gitDecorationsService.current.updateDecorations(filePath, worktreePath);
    }

    // Disable all validation for all languages
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    });

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: false,
      allowComments: true,
      schemas: []
    });

    monaco.languages.html.htmlDefaults.setOptions({
      validate: {
        scripts: false,
        styles: false,
        html: false
      }
    });

    monaco.languages.css.cssDefaults.setOptions({
      validate: false
    });

    // Add save shortcut - use editor's built-in command
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: () => {
        console.log('Monaco save shortcut triggered');
        // Trigger save immediately with current content
        const currentContent = editor.getValue();
        if (onSave) {
          console.log('Calling onSave from Monaco with content length:', currentContent.length);
          onSave(currentContent);
          originalContentRef.current = currentContent;
          setIsDirty(false);
        }
      }
    });
  }, [onSave]);

  const detectLanguage = (path: string): string => {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const ext = fileName.split('.').pop() || '';

    // Check complete filename first
    const fileNameMap: { [key: string]: string } = {
      'dockerfile': 'dockerfile',
      'dockerfile.dev': 'dockerfile',
      'dockerfile.prod': 'dockerfile',
      'docker-compose.yml': 'yaml',
      'docker-compose.yaml': 'yaml',
      'makefile': 'makefile',
      'gnumakefile': 'makefile',
      'cmakelists.txt': 'cmake',
      'gemfile': 'ruby',
      'gemfile.lock': 'ruby',
      'rakefile': 'ruby',
      'procfile': 'yaml',
      'guardfile': 'ruby',
      'podfile': 'ruby',
      'thorfile': 'ruby',
      'vagrantfile': 'ruby',
      'berksfile': 'ruby',
      'cheffile': 'ruby',
      'puppetfile': 'ruby',
      '.gitignore': 'ignore',
      '.dockerignore': 'ignore',
      '.npmignore': 'ignore',
      '.gitattributes': 'properties',
      '.editorconfig': 'ini',
      '.env': 'dotenv',
      '.env.local': 'dotenv',
      '.env.development': 'dotenv',
      '.env.production': 'dotenv',
      '.env.test': 'dotenv',
      '.babelrc': 'json',
      '.eslintrc': 'json',
      '.prettierrc': 'json',
      '.stylelintrc': 'json',
      'tsconfig.json': 'json',
      'jsconfig.json': 'json',
      'package.json': 'json',
      'package-lock.json': 'json',
      'composer.json': 'json',
      'composer.lock': 'json',
      'requirements.txt': 'pip-requirements',
      'requirements-dev.txt': 'pip-requirements',
      'pipfile': 'toml',
      'pipfile.lock': 'json',
      'cargo.toml': 'toml',
      'cargo.lock': 'toml',
      'go.mod': 'go',
      'go.sum': 'go',
      'yarn.lock': 'yaml',
      'pnpm-lock.yaml': 'yaml',
      'license': 'plaintext',
      'license.txt': 'plaintext',
      'license.md': 'markdown',
      'readme': 'plaintext',
      'readme.txt': 'plaintext',
      'readme.md': 'markdown',
      'changelog': 'plaintext',
      'changelog.md': 'markdown',
      'changelog.txt': 'plaintext',
      'history': 'plaintext',
      'history.md': 'markdown',
      'authors': 'plaintext',
      'contributors': 'plaintext',
      'copying': 'plaintext',
      'copying.txt': 'plaintext',
      'install': 'plaintext',
      'install.txt': 'plaintext',
      'todo': 'plaintext',
      'todo.txt': 'plaintext',
      'todo.md': 'markdown',
    };

    // Check if it's a known filename
    if (fileNameMap[fileName]) {
      return fileNameMap[fileName];
    }

    // Check filename patterns
    if (fileName.startsWith('dockerfile')) return 'dockerfile';
    if (fileName.endsWith('.dockerfile')) return 'dockerfile';
    if (fileName.startsWith('.env')) return 'dotenv';
    if (fileName.endsWith('file') && fileName.match(/^[A-Z]/)) return 'ruby'; // Vagrantfile, Berksfile etc

    // Check by extension
    const extMap: { [key: string]: string } = {
      // Programming languages
      'js': 'javascript',
      'jsx': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'pyw': 'python',
      'pyi': 'python',
      'java': 'java',
      'class': 'java',
      'jar': 'java',
      'c': 'c',
      'h': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'hpp': 'cpp',
      'hxx': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'erb': 'erb',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'scala': 'scala',
      'sc': 'scala',
      'lua': 'lua',
      'pl': 'perl',
      'pm': 'perl',
      'r': 'r',
      'R': 'r',
      'jl': 'julia',
      'elm': 'elm',
      'ex': 'elixir',
      'exs': 'elixir',
      'erl': 'erlang',
      'hrl': 'erlang',
      'fs': 'fsharp',
      'fsi': 'fsharp',
      'fsx': 'fsharp',
      'ml': 'ocaml',
      'mli': 'ocaml',
      'pas': 'pascal',
      'pp': 'pascal',
      'cls': 'apex',
      'trigger': 'apex',
      'vb': 'vb',
      'vbs': 'vbscript',
      'ada': 'ada',
      'adb': 'ada',
      'ads': 'ada',
      'asm': 'asm',
      's': 'asm',
      'clj': 'clojure',
      'cljs': 'clojure',
      'cljc': 'clojure',
      'coffee': 'coffeescript',
      'dart': 'dart',
      'groovy': 'groovy',
      'gradle': 'groovy',

      // Web technologies
      'html': 'html',
      'htm': 'html',
      'xhtml': 'html',
      'xml': 'xml',
      'xsl': 'xml',
      'xslt': 'xml',
      'svg': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'stylus': 'stylus',
      'styl': 'stylus',

      // Data formats
      'json': 'json',
      'jsonc': 'json',
      'json5': 'json',
      'geojson': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'config': 'ini',
      'properties': 'properties',
      'props': 'properties',
      'csv': 'csv',
      'tsv': 'tsv',

      // Documents
      'md': 'markdown',
      'markdown': 'markdown',
      'mdown': 'markdown',
      'mkd': 'markdown',
      'mdx': 'markdown',
      'rst': 'restructuredtext',
      'tex': 'latex',
      'latex': 'latex',
      'ltx': 'latex',
      'bib': 'bibtex',
      'adoc': 'asciidoc',
      'asciidoc': 'asciidoc',
      'org': 'org',

      // Shell scripts
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ksh': 'shell',
      'csh': 'shell',
      'tcsh': 'shell',
      'ps1': 'powershell',
      'psm1': 'powershell',
      'psd1': 'powershell',
      'bat': 'bat',
      'cmd': 'bat',

      // Database
      'sql': 'sql',
      'mysql': 'sql',
      'pgsql': 'sql',
      'plsql': 'plsql',
      'sqlite': 'sql',

      // DevOps & Config
      'dockerfile': 'dockerfile',
      'containerfile': 'dockerfile',
      'tf': 'hcl',
      'tfvars': 'hcl',
      'hcl': 'hcl',
      'nomad': 'hcl',
      'workflow': 'hcl',
      'nix': 'nix',
      'dhall': 'dhall',
      'jsonnet': 'jsonnet',
      'libsonnet': 'jsonnet',

      // Build tools
      'sbt': 'scala',
      'bazel': 'python',
      'build': 'python',
      'workspace': 'python',
      'buck': 'python',
      'pants': 'python',

      // Templates
      'ejs': 'ejs',
      'pug': 'pug',
      'jade': 'pug',
      'hbs': 'handlebars',
      'handlebars': 'handlebars',
      'mustache': 'mustache',
      'njk': 'nunjucks',
      'jinja': 'jinja',
      'jinja2': 'jinja',
      'j2': 'jinja',
      'twig': 'twig',
      'liquid': 'liquid',

      // Logs
      'log': 'log',
      'out': 'log',
      'err': 'log',

      // Other
      'txt': 'plaintext',
      'text': 'plaintext',
      'gitignore': 'ignore',
      'dockerignore': 'ignore',
      'editorconfig': 'ini',
      'env': 'dotenv',
      'vim': 'vim',
      'vimrc': 'vim',
    };

    return extMap[ext] || 'plaintext';
  };

  const detectedLanguage = language || detectLanguage(filePath);

  // Get editor options based on file type
  const getEditorOptions = (lang: string) => {
    const baseOptions = {
      minimap: { enabled: true },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
      wordWrap: 'on' as const,
      lineNumbers: 'on' as const,
      renderWhitespace: 'selection' as const,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,

      // Disable all validations
      'semanticHighlighting.enabled': false,
      'occurrencesHighlight': 'off' as const,
      'codeLens': false,
      'folding': true,
      'foldingHighlight': false,
      'matchBrackets': 'near' as const,
      'suggestOnTriggerCharacters': false,
      'quickSuggestions': false,
      'parameterHints': {
        enabled: false
      },
      'hover': {
        enabled: false
      },
    };

    // Special configurations for certain file types
    switch (lang) {
      case 'python':
        return { ...baseOptions, tabSize: 4 };
      case 'yaml':
      case 'dockerfile':
        return { ...baseOptions, tabSize: 2, insertSpaces: true };
      case 'makefile':
        return { ...baseOptions, insertSpaces: false }; // Makefiles require tabs
      case 'markdown':
        return { ...baseOptions, wordWrap: 'on' as const, lineNumbers: 'off' as const };
      case 'log':
        return { ...baseOptions, readOnly: true, wordWrap: 'off' as const };
      default:
        return baseOptions;
    }
  };

  const getAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case 'pending':
        return <span className="auto-save-indicator pending">Auto-save pending...</span>;
      case 'saving':
        return <span className="auto-save-indicator saving">Saving...</span>;
      case 'saved':
        return <span className="auto-save-indicator saved">✓ Saved</span>;
      default:
        return null;
    }
  };

  return (
    <div className="file-editor">
      <div className="editor-header">
        <span className="editor-file-path">{filePath}</span>
        {isDirty && <span className="editor-dirty-indicator">●</span>}
        {getAutoSaveIndicator()}
        <span className="editor-language-indicator" style={{ marginLeft: 'auto', marginRight: '10px', fontSize: '12px', color: '#888' }}>
          {detectedLanguage}
        </span>
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
        language={detectedLanguage}
        value={editorContent}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={getEditorOptions(detectedLanguage)}
      />
    </div>
  );
};

export default FileEditor;