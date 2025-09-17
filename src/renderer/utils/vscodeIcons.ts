import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

export interface FileIconInfo {
  icon: string;
  color?: string;
}

/**
 * Get VSCode icon for a file
 */
export function getVSCodeFileIcon(fileName: string): FileIconInfo {
  const iconPath = getIconForFile(fileName);
  return parseIconPath(iconPath);
}

/**
 * Get VSCode icon for a folder
 */
export function getVSCodeFolderIcon(folderName: string, isExpanded: boolean = false): FileIconInfo {
  const iconPath = isExpanded
    ? getIconForOpenFolder(folderName)
    : getIconForFolder(folderName);
  return parseIconPath(iconPath);
}

/**
 * Parse icon path to extract icon name
 */
function parseIconPath(iconPath: string | undefined): FileIconInfo {
  if (!iconPath) {
    return { icon: 'codicon-file' };
  }

  // Extract icon name from path
  const match = iconPath.match(/\/([^/]+)\.svg$/);
  if (match) {
    const iconName = match[1];
    return mapToCodiconClass(iconName);
  }

  return { icon: 'codicon-file' };
}

/**
 * Map vscode-icons names to codicon classes
 */
function mapToCodiconClass(iconName: string): FileIconInfo {
  // Common file type mappings
  const iconMap: Record<string, string> = {
    // Programming languages
    'file_type_js': 'codicon-file-code',
    'file_type_javascript': 'codicon-file-code',
    'file_type_typescript': 'codicon-file-code',
    'file_type_tsx': 'codicon-file-code',
    'file_type_jsx': 'codicon-file-code',
    'file_type_python': 'codicon-file-code',
    'file_type_java': 'codicon-file-code',
    'file_type_cpp': 'codicon-file-code',
    'file_type_c': 'codicon-file-code',
    'file_type_csharp': 'codicon-file-code',
    'file_type_go': 'codicon-file-code',
    'file_type_rust': 'codicon-file-code',
    'file_type_ruby': 'codicon-file-code',
    'file_type_php': 'codicon-file-code',
    'file_type_swift': 'codicon-file-code',

    // Web files
    'file_type_html': 'codicon-file-code',
    'file_type_css': 'codicon-file-code',
    'file_type_scss': 'codicon-file-code',
    'file_type_sass': 'codicon-file-code',
    'file_type_less': 'codicon-file-code',

    // Data files
    'file_type_json': 'codicon-json',
    'file_type_xml': 'codicon-file-code',
    'file_type_yaml': 'codicon-file-code',
    'file_type_toml': 'codicon-file-code',

    // Config files
    'file_type_git': 'codicon-git-commit',
    'file_type_docker': 'codicon-file-code',
    'file_type_npm': 'codicon-file-code',
    'file_type_eslint': 'codicon-file-code',
    'file_type_prettier': 'codicon-file-code',
    'file_type_webpack': 'codicon-file-code',

    // Documentation
    'file_type_markdown': 'codicon-markdown',
    'file_type_pdf': 'codicon-file-pdf',
    'file_type_text': 'codicon-file-text',

    // Media files
    'file_type_image': 'codicon-file-media',
    'file_type_audio': 'codicon-file-media',
    'file_type_video': 'codicon-file-media',
    'file_type_font': 'codicon-file-media',

    // Archives
    'file_type_zip': 'codicon-file-zip',
    'file_type_archive': 'codicon-file-zip',

    // Folders
    'folder_type_node_modules': 'codicon-folder-library',
    'folder_type_src': 'codicon-folder',
    'folder_type_dist': 'codicon-folder',
    'folder_type_build': 'codicon-folder',
    'folder_type_test': 'codicon-folder',
    'folder_type_docs': 'codicon-folder',
    'folder_type_git': 'codicon-git-commit',
    'default_folder': 'codicon-folder',
    'default_folder_opened': 'codicon-folder-opened',

    // Default
    'default_file': 'codicon-file'
  };

  // Direct mapping
  if (iconMap[iconName]) {
    return { icon: iconMap[iconName] };
  }

  // Try to extract type and map
  if (iconName.includes('folder')) {
    return { icon: iconName.includes('opened') ? 'codicon-folder-opened' : 'codicon-folder' };
  }

  // Default to file icon
  return { icon: 'codicon-file' };
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