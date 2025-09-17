/**
 * Git diff parser for line-level change detection
 */

export interface LineChange {
  type: 'added' | 'modified' | 'deleted';
  startLine: number;
  endLine: number;
  content?: string;
}

export interface DiffInfo {
  additions: number[];
  modifications: number[];
  deletions: Array<{ afterLine: number; count: number; content: string[] }>;
}

/**
 * Parse git diff output to extract line-level changes
 */
export function parseDiff(diffOutput: string): DiffInfo {
  const lines = diffOutput.split('\n');
  const additions: number[] = [];
  const modifications: number[] = [];
  const deletions: Array<{ afterLine: number; count: number; content: string[] }> = [];

  let currentLine = 0;
  let inHunk = false;
  let deletedContent: string[] = [];
  let deletionStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentLine = parseInt(match[3], 10) - 1;
        inHunk = true;

        // Process any pending deletions
        if (deletedContent.length > 0) {
          deletions.push({
            afterLine: deletionStartLine,
            count: deletedContent.length,
            content: deletedContent
          });
          deletedContent = [];
        }
      }
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith('+')) {
      // Added line
      currentLine++;
      additions.push(currentLine);
    } else if (line.startsWith('-')) {
      // Deleted line
      if (deletedContent.length === 0) {
        deletionStartLine = currentLine;
      }
      deletedContent.push(line.substring(1));
    } else if (!line.startsWith('\\')) {
      // Context line
      if (deletedContent.length > 0) {
        // Check if next line is addition (indicates modification)
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.startsWith('+')) {
          // This is a modification
          for (let j = 0; j < deletedContent.length; j++) {
            currentLine++;
            modifications.push(currentLine);
          }
          deletedContent = [];
        } else {
          // Pure deletion
          deletions.push({
            afterLine: currentLine,
            count: deletedContent.length,
            content: deletedContent
          });
          deletedContent = [];
        }
      }
      currentLine++;
    }
  }

  // Process any remaining deletions
  if (deletedContent.length > 0) {
    deletions.push({
      afterLine: currentLine,
      count: deletedContent.length,
      content: deletedContent
    });
  }

  return { additions, modifications, deletions };
}

/**
 * Parse unified diff format to get changed line ranges
 */
export function parseUnifiedDiff(diff: string): LineChange[] {
  const changes: LineChange[] = [];
  const lines = diff.split('\n');
  let currentNewLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentNewLine = parseInt(match[1], 10);
      }
    } else if (line.startsWith('+')) {
      changes.push({
        type: 'added',
        startLine: currentNewLine,
        endLine: currentNewLine,
        content: line.substring(1)
      });
      currentNewLine++;
    } else if (line.startsWith('-')) {
      // Track deletions but don't increment line counter
    } else if (!line.startsWith('\\')) {
      currentNewLine++;
    }
  }

  return changes;
}

/**
 * Merge consecutive line changes of the same type
 */
export function mergeConsecutiveChanges(changes: LineChange[]): LineChange[] {
  if (changes.length === 0) return [];

  const merged: LineChange[] = [];
  let current = { ...changes[0] };

  for (let i = 1; i < changes.length; i++) {
    const next = changes[i];
    if (next.type === current.type && next.startLine === current.endLine + 1) {
      current.endLine = next.endLine;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged;
}