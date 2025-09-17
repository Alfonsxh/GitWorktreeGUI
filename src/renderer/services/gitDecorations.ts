import * as monaco from 'monaco-editor';
import { parseDiff, DiffInfo } from '../utils/diffParser';

export interface GitDecoration {
  range: monaco.Range;
  options: monaco.editor.IModelDecorationOptions;
}

export class GitDecorationsService {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private decorationIds: string[] = [];
  private diffInfo: DiffInfo | null = null;

  /**
   * Initialize the service with an editor instance
   */
  public setEditor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.setupGlyphMarginClickHandler();
  }

  /**
   * Update decorations based on git diff
   */
  public async updateDecorations(filePath: string, worktreePath: string) {
    if (!this.editor) return;

    try {
      // Get git diff from backend
      const diff = await window.electronAPI.gitDiff(worktreePath, filePath);
      if (!diff) return;
      this.diffInfo = parseDiff(diff);

      const decorations = this.createDecorations(this.diffInfo);
      this.decorationIds = this.editor.deltaDecorations(this.decorationIds, decorations);
    } catch (error) {
      console.error('Failed to update git decorations:', error);
    }
  }

  /**
   * Create Monaco decorations from diff info
   */
  private createDecorations(diffInfo: DiffInfo): monaco.editor.IModelDeltaDecoration[] {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Added lines - green gutter
    for (const lineNumber of diffInfo.additions) {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'git-decoration-added',
          glyphMarginHoverMessage: { value: '**Added line**' },
          overviewRuler: {
            color: 'rgba(72, 199, 116, 0.8)',
            position: monaco.editor.OverviewRulerLane.Left
          },
          minimap: {
            color: 'rgba(72, 199, 116, 0.8)',
            position: monaco.editor.MinimapPosition.Gutter
          }
        }
      });
    }

    // Modified lines - blue gutter
    for (const lineNumber of diffInfo.modifications) {
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'git-decoration-modified',
          glyphMarginHoverMessage: { value: '**Modified line**' },
          overviewRuler: {
            color: 'rgba(37, 99, 235, 0.8)',
            position: monaco.editor.OverviewRulerLane.Left
          },
          minimap: {
            color: 'rgba(37, 99, 235, 0.8)',
            position: monaco.editor.MinimapPosition.Gutter
          }
        }
      });
    }

    // Deleted lines - red triangle
    for (const deletion of diffInfo.deletions) {
      const lineNumber = deletion.afterLine;
      const deletedText = deletion.content.join('\\n');
      decorations.push({
        range: new monaco.Range(lineNumber, Number.MAX_SAFE_INTEGER, lineNumber + 1, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'git-decoration-deleted',
          glyphMarginHoverMessage: {
            value: `**Deleted ${deletion.count} line(s):**\n\`\`\`\n${deletedText}\n\`\`\``
          },
          overviewRuler: {
            color: 'rgba(231, 76, 60, 0.8)',
            position: monaco.editor.OverviewRulerLane.Left
          }
        }
      });
    }

    return decorations;
  }

  /**
   * Setup click handler for glyph margin
   */
  private setupGlyphMarginClickHandler() {
    if (!this.editor) return;

    this.editor.onMouseDown((e) => {
      if (!e.target.position) return;

      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position.lineNumber;
        this.handleGlyphClick(lineNumber);
      }
    });
  }

  /**
   * Handle click on glyph margin
   */
  private handleGlyphClick(lineNumber: number) {
    if (!this.editor || !this.diffInfo) return;

    // Check if this line has changes
    const isAdded = this.diffInfo.additions.includes(lineNumber);
    const isModified = this.diffInfo.modifications.includes(lineNumber);
    const deletion = this.diffInfo.deletions.find(d => d.afterLine === lineNumber);

    if (isAdded || isModified) {
      this.showInlineDiff(lineNumber, isAdded ? 'added' : 'modified');
    } else if (deletion) {
      this.showDeletionPreview(deletion);
    }
  }

  /**
   * Show inline diff widget
   */
  private showInlineDiff(lineNumber: number, type: 'added' | 'modified') {
    if (!this.editor) return;

    // Get the current line content
    const model = this.editor.getModel();
    if (!model) return;

    const lineContent = model.getLineContent(lineNumber);

    // Create a hover widget
    const hoverMessage = type === 'added'
      ? `**Added line:**\n\`\`\`\n${lineContent}\n\`\`\``
      : `**Modified line:**\n\`\`\`\n${lineContent}\n\`\`\``;

    // Show hover at the line
    this.editor.trigger('git-decorations', 'editor.action.showHover', {
      range: new monaco.Range(lineNumber, 1, lineNumber, 1)
    });
  }

  /**
   * Show deletion preview
   */
  private showDeletionPreview(deletion: { afterLine: number; count: number; content: string[] }) {
    if (!this.editor) return;

    const deletedText = deletion.content.join('\\n');
    console.log(`Deleted ${deletion.count} lines after line ${deletion.afterLine}:\n${deletedText}`);

    // Could implement a custom widget here to show deleted content
  }

  /**
   * Clear all decorations
   */
  public clearDecorations() {
    if (!this.editor) return;
    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
    this.diffInfo = null;
  }

  /**
   * Dispose the service
   */
  public dispose() {
    this.clearDecorations();
    this.editor = null;
  }
}