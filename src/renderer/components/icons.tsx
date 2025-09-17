import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const createIcon = (path: React.ReactNode) => {
  const IconComponent: React.FC<IconProps> = ({ size = 16, ...props }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {path}
    </svg>
  );
  return IconComponent;
};


export const IconWindow = createIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
  </>
);

export const IconPlus = createIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);

export const IconRefresh = createIcon(
  <>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6" />
  </>
);

export const IconLayoutSidebar = createIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </>
);

export const IconGitBranch = createIcon(
  <>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="12" r="2" />
    <path d="M8 6h5a3 3 0 0 1 3 3v1" />
    <path d="M6 8v8" />
  </>
);

export const IconTerminal = createIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="m7 8 4 4-4 4" />
    <path d="M13 16h4" />
  </>
);

export const IconChevronDown = createIcon(
  <path d="m6 9 6 6 6-6" />
);

export const IconDotsVertical = createIcon(
  <>
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </>
);

export const IconFiles = createIcon(
  <>
    <rect x="4" y="3" width="12" height="18" rx="2" />
    <path d="M8 7h4" />
    <path d="M8 11h6" />
    <path d="M8 15h4" />
    <path d="M16 7h2a2 2 0 0 1 2 2v12" />
  </>
);

export const IconDiff = createIcon(
  <>
    <path d="M12 3v18" />
    <path d="M5 9h6" />
    <path d="M13 15h6" />
    <path d="m5 5 4 4-4 4" />
    <path d="m19 13-4 4 4 4" />
  </>
);

export const IconSearch = createIcon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3-3" />
  </>
);

export const IconClock = createIcon(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2 2" />
  </>
);

export const IconInfo = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01" />
    <path d="M11 12h1v4h1" />
  </>
);

export const IconSettings = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.78 1.78 0 0 0 .4 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.78 1.78 0 0 0-1.82-.4 1.78 1.78 0 0 0-1.11 1.64V21a2 2 0 0 1-4 0v-.09a1.78 1.78 0 0 0-1.11-1.64 1.78 1.78 0 0 0-1.82.4l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.78 1.78 0 0 0 5 15a1.78 1.78 0 0 0-1.64-1.11H3a2 2 0 0 1 0-4h.09A1.78 1.78 0 0 0 4.73 8.8a1.78 1.78 0 0 0-.4-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.78 1.78 0 0 0 8.98 5 1.78 1.78 0 0 0 10.09 3.36V3a2 2 0 0 1 4 0v.09a1.78 1.78 0 0 0 1.11 1.64 1.78 1.78 0 0 0 1.82-.4l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.78 1.78 0 0 0-.4 1.82 1.78 1.78 0 0 0 1.64 1.11H21a2 2 0 0 1 0 4h-.09A1.78 1.78 0 0 0 19.4 15Z" />
  </>
);

export const IconAlert = createIcon(
  <>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);

export const IconBranch = IconGitBranch;
export const IconSourceControl = IconGitBranch;

export const IconCaretHorizontal = createIcon(
  <>
    <path d="m8 4 8 8-8 8" />
  </>
);

export const IconChevronRight = createIcon(
  <path d="m9 6 6 6-6 6" />
);

export const IconFolder = createIcon(
  <>
    <path d="M4 4h7l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" />
  </>
);

export const IconFolderOpen = createIcon(
  <>
    <path d="M22 11v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7" />
    <path d="M5 7l-3 4v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7l-3-4" />
    <path d="M11 7h2l1-3H10z" />
  </>
);

export const IconFile = createIcon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </>
);

export const IconFileCode = createIcon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 13 2 2-2 2" />
  </>
);

export const IconFileText = createIcon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </>
);

export const IconTrash = createIcon(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>
);

export default {
  IconFolderOpen,
  IconWindow,
  IconPlus,
  IconRefresh,
  IconLayoutSidebar,
  IconGitBranch,
  IconTerminal,
  IconChevronDown,
  IconDotsVertical,
  IconFiles,
  IconDiff,
  IconSearch,
  IconClock,
  IconInfo,
  IconSettings,
  IconAlert,
  IconSourceControl,
  IconCaretHorizontal,
  IconChevronRight,
  IconFolder,
  IconFile,
  IconFileCode,
  IconFileText,
  IconTrash
};
