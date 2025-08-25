import { WorktreeParser } from './parser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('WorktreeParser', () => {
  const parser = new WorktreeParser();

  describe('parseWorktreeList', () => {
    it('should parse basic worktree list', () => {
      const fixture = readFileSync(
        join(__dirname, '../../../spec/fixtures/worktree-list/basic.txt'),
        'utf8'
      );
      
      const result = parser.parseWorktreeList(fixture);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        path: '/Users/project/main',
        head: 'abc1234567890abcdef1234567890abcdef12345',
        branch: 'main',
        locked: false,
        isMainWorktree: true,
      });
      expect(result[1]).toEqual({
        path: '/Users/project/feature-ai',
        head: 'def1234567890abcdef1234567890abcdef12345',
        branch: 'feature-ai',
        locked: false,
        isMainWorktree: false,
      });
    });

    it('should parse locked worktree', () => {
      const fixture = readFileSync(
        join(__dirname, '../../../spec/fixtures/worktree-list/locked.txt'),
        'utf8'
      );
      
      const result = parser.parseWorktreeList(fixture);
      
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        path: '/Users/project/feature-locked',
        head: 'def1234567890abcdef1234567890abcdef12345',
        branch: 'feature-locked',
        locked: true,
        lockedReason: 'Locked for maintenance',
        isMainWorktree: false,
      });
    });

    it('should parse detached HEAD worktree', () => {
      const fixture = readFileSync(
        join(__dirname, '../../../spec/fixtures/worktree-list/detached-head.txt'),
        'utf8'
      );
      
      const result = parser.parseWorktreeList(fixture);
      
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        path: '/Users/project/detached',
        head: '9876543210fedcba9876543210fedcba98765432',
        locked: false,
        isMainWorktree: false,
        isDetached: true,
      });
    });

    it('should handle empty input', () => {
      const result = parser.parseWorktreeList('');
      expect(result).toEqual([]);
    });
  });

  describe('parseStatus', () => {
    it('should parse branch and file status', () => {
      const output = `## main...origin/main [ahead 2, behind 1]
M  src/file1.ts
 M src/file2.ts
?? new-file.txt`;

      const result = parser.parseStatus(output);
      
      expect(result).toEqual({
        branch: 'main',
        ahead: 2,
        behind: 1,
        files: {
          staged: 1,
          modified: 1,
          untracked: 1,
        },
      });
    });

    it('should handle clean status', () => {
      const output = '## main';
      
      const result = parser.parseStatus(output);
      
      expect(result).toEqual({
        branch: 'main',
        ahead: 0,
        behind: 0,
        files: {
          staged: 0,
          modified: 0,
          untracked: 0,
        },
      });
    });
  });
});