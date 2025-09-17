import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

type IconVariant =
  | {
      type: 'codicon';
      icon: string;
      color?: string;
    }
  | {
      type: 'badge';
      label: string;
      background: string;
      color: string;
    };

export type FileIconInfo = IconVariant;

const COLOR_PALETTE = [
  '#2563EB',
  '#D946EF',
  '#F97316',
  '#14B8A6',
  '#22C55E',
  '#EC4899',
  '#F59E0B',
  '#6366F1',
  '#0EA5E9',
  '#8B5CF6',
  '#F43F5E',
  '#10B981'
];

const FOLDER_COLOR = '#64748b';
const FOLDER_OPEN_COLOR = '#4f46e5';

const extensionGroups: Array<{
  match: (fileName: string, extension: string | null) => boolean;
  icon: IconVariant;
}> = [
  {
    match: (_, ext) => !!ext && ['js', 'mjs', 'cjs'].includes(ext),
    icon: createCodicon('codicon-symbol-event', '#facc15')
  },
  {
    match: (_, ext) => !!ext && ['ts', 'mts'].includes(ext),
    icon: createCodicon('codicon-symbol-class', '#38bdf8')
  },
  {
    match: (_, ext) => !!ext && ['tsx', 'jsx'].includes(ext),
    icon: createCodicon('codicon-symbol-method', '#34d399')
  },
  {
    match: (_, ext) => !!ext && ['json', 'jsonc'].includes(ext),
    icon: createCodicon('codicon-json', '#f97316')
  },
  {
    match: (_, ext) => !!ext && ['yaml', 'yml', 'toml'].includes(ext),
    icon: createCodicon('codicon-symbol-key', '#8b5cf6')
  },
  {
    match: (name, ext) => name === 'package.json' || name === 'package-lock.json' || (!!ext && ['npmrc', 'yarnrc'].includes(ext)),
    icon: createCodicon('codicon-package', '#fb7185')
  },
  {
    match: (name) => name === 'tsconfig.json' || name === 'jsconfig.json',
    icon: createCodicon('codicon-symbol-parameter', '#22d3ee')
  },
  {
    match: (_, ext) => !!ext && ['md', 'mdx'].includes(ext),
    icon: createCodicon('codicon-markdown', '#2563eb')
  },
  {
    match: (_, ext) => !!ext && ['html', 'vue', 'svelte'].includes(ext),
    icon: createCodicon('codicon-globe', '#f97316')
  },
  {
    match: (_, ext) => !!ext && ['css', 'scss', 'less', 'styl'].includes(ext),
    icon: createCodicon('codicon-symbol-color', '#0ea5e9')
  },
  {
    match: (_, ext) => !!ext && ['py'].includes(ext),
    icon: createCodicon('codicon-server-process', '#38bdf8')
  },
  {
    match: (_, ext) => !!ext && ['rb'].includes(ext),
    icon: createCodicon('codicon-ruby', '#f43f5e')
  },
  {
    match: (_, ext) => !!ext && ['go'].includes(ext),
    icon: createCodicon('codicon-symbol-structure', '#22c55e')
  },
  {
    match: (_, ext) => !!ext && ['rs'].includes(ext),
    icon: createCodicon('codicon-symbol-namespace', '#fb7185')
  },
  {
    match: (_, ext) => !!ext && ['java', 'kt'].includes(ext),
    icon: createCodicon('codicon-symbol-interface', '#f97316')
  },
  {
    match: (_, ext) => !!ext && ['php'].includes(ext),
    icon: createCodicon('codicon-symbol-parameter', '#8b5cf6')
  },
  {
    match: (_, ext) => !!ext && ['swift'].includes(ext),
    icon: createCodicon('codicon-symbol-event', '#fb923c')
  },
  {
    match: (_, ext) => !!ext && ['cpp', 'cc', 'cxx', 'hpp', 'hh'].includes(ext),
    icon: createCodicon('codicon-symbol-namespace', '#60a5fa')
  },
  {
    match: (_, ext) => !!ext && ['c', 'h'].includes(ext),
    icon: createCodicon('codicon-symbol-numeric', '#1e293b')
  },
  {
    match: (name) => /\.test\./.test(name) || /\.spec\./.test(name),
    icon: createCodicon('codicon-beaker', '#f59e0b')
  },
  {
    match: (_, ext) => !!ext && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext),
    icon: createCodicon('codicon-device-camera', '#10b981')
  },
  {
    match: (_, ext) => !!ext && ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext),
    icon: createCodicon('codicon-play', '#f43f5e')
  },
  {
    match: (_, ext) => !!ext && ['mp3', 'wav', 'flac', 'ogg'].includes(ext),
    icon: createCodicon('codicon-symbol-keyword', '#6366f1')
  },
  {
    match: (_, ext) => !!ext && ['zip', 'tar', 'gz', 'tgz', 'rar', '7z'].includes(ext),
    icon: createCodicon('codicon-file-zip', '#22d3ee')
  },
  {
    match: (name) => name === 'Dockerfile' || name.startsWith('docker-compose'),
    icon: createCodicon('codicon-symbol-method', '#38bdf8')
  },
  {
    match: (name) => name === '.env' || name.startsWith('.env'),
    icon: createCodicon('codicon-symbol-key', '#f59e0b')
  },
  {
    match: (name) => name === 'README.md' || name === 'README',
    icon: createCodicon('codicon-book', '#6366f1')
  }
];

const folderGroups: Array<{
  match: (folderName: string) => boolean;
  icon: { closed: IconVariant; opened: IconVariant };
}> = [
  {
    match: name => name === 'src' || name === 'lib',
    icon: {
      closed: createCodicon('codicon-repo', '#2563eb'),
      opened: createCodicon('codicon-repo', '#2563eb')
    }
  },
  {
    match: name => name === 'dist' || name === 'build',
    icon: {
      closed: createCodicon('codicon-archive', '#f59e0b'),
      opened: createCodicon('codicon-archive', '#f59e0b')
    }
  },
  {
    match: name => name === 'test' || name === '__tests__',
    icon: {
      closed: createCodicon('codicon-beaker', '#ec4899'),
      opened: createCodicon('codicon-beaker', '#ec4899')
    }
  },
  {
    match: name => name === 'docs' || name === 'documentation',
    icon: {
      closed: createCodicon('codicon-book', '#14b8a6'),
      opened: createCodicon('codicon-book', '#14b8a6')
    }
  },
  {
    match: name => name === 'config' || name === '.config',
    icon: {
      closed: createCodicon('codicon-gear', '#8b5cf6'),
      opened: createCodicon('codicon-gear', '#8b5cf6')
    }
  },
  {
    match: name => name === 'public' || name === 'static',
    icon: {
      closed: createCodicon('codicon-browser', '#0ea5e9'),
      opened: createCodicon('codicon-browser', '#0ea5e9')
    }
  }
];

/**
 * Get icon information for a file.
 * Produces either a stylised codicon or a colourful badge derived from the extension.
 */
export function getVSCodeFileIcon(fileName: string): FileIconInfo {
  const extension = extractExtension(fileName);
  const matched = extensionGroups.find(group => group.match(fileName, extension));
  if (matched) {
    return matched.icon;
  }

  const badgeLabel = extension ? extension.substring(0, 3) : fileName.substring(0, 2);
  return createBadge(badgeLabel);
}

/**
 * Get icon information for a folder.
 */
export function getVSCodeFolderIcon(folderName: string, isExpanded: boolean = false): FileIconInfo {
  const matched = folderGroups.find(group => group.match(folderName));
  if (matched) {
    return isExpanded ? matched.icon.opened : matched.icon.closed;
  }

  return isExpanded
    ? createCodicon('codicon-folder-opened', FOLDER_OPEN_COLOR)
    : createCodicon('codicon-folder', FOLDER_COLOR);
}

function createCodicon(icon: string, color?: string): IconVariant {
  return { type: 'codicon', icon, color };
}

function createBadge(labelRaw: string): IconVariant {
  const label = labelRaw ? labelRaw.toUpperCase() : '•';
  const background = colorForKey(label);
  return {
    type: 'badge',
    label,
    background,
    color: getReadableTextColor(background)
  };
}

function extractExtension(fileName: string): string | null {
  const parts = fileName.split('.');
  if (parts.length <= 1) return null;
  return parts.pop()?.toLowerCase() || null;
}

function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

function getReadableTextColor(hexColor: string): string {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#111827' : '#F9FAFB';
}

/**
 * Get icon for git status
 */
export function getGitStatusIcon(status: string): string {
  switch (status) {
    case 'M': return 'codicon-diff-modified';
    case 'A': return 'codicon-diff-added';
    case 'D': return 'codicon-diff-removed';
    case '?': return 'codicon-question';
    case 'C': return 'codicon-diff-renamed';
    case 'U': return 'codicon-warning';
    default: return '';
  }
}

/**
 * Get color for git status
 */
export function getGitStatusColor(status: string): string {
  switch (status) {
    case 'M': return '#3273dc';  // Blue for modified
    case 'A': return '#48c774';  // Green for added
    case 'D': return '#f14668';  // Red for deleted
    case '?': return '#73c991';  // Light green for untracked
    case 'C': return '#3273dc';  // Blue for copied
    case 'U': return '#ffdd57';  // Yellow for unmerged
    default: return 'inherit';
  }
}
