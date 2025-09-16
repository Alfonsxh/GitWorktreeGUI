export interface GitPlatform {
  type: 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'unknown';
  domain: string;
  owner: string;
  repo: string;
}

export function parseGitRemoteUrl(remoteUrl: string): GitPlatform | null {
  if (!remoteUrl) return null;

  // Remove trailing .git if present
  remoteUrl = remoteUrl.replace(/\.git$/, '');

  let match: RegExpMatchArray | null;
  let domain: string;
  let owner: string;
  let repo: string;

  // SSH format: git@github.com:owner/repo
  match = remoteUrl.match(/git@([^:]+):([^/]+)\/(.+)/);
  if (match) {
    domain = match[1];
    owner = match[2];
    repo = match[3];
  }
  // HTTPS format: https://github.com/owner/repo
  else if ((match = remoteUrl.match(/https?:\/\/([^/]+)\/([^/]+)\/(.+)/))) {
    domain = match[1];
    owner = match[2];
    repo = match[3];
  } else {
    return null;
  }

  // Determine platform type
  let type: GitPlatform['type'] = 'unknown';
  if (domain.includes('github.com')) {
    type = 'github';
  } else if (domain.includes('gitlab')) {
    type = 'gitlab';
  } else if (domain.includes('gitee.com')) {
    type = 'gitee';
  } else if (domain.includes('bitbucket')) {
    type = 'bitbucket';
  } else {
    // Check if it might be a self-hosted GitLab by common patterns
    if (domain.includes('git') || domain.includes('code')) {
      type = 'gitlab'; // Default to GitLab for self-hosted
    }
  }

  return { type, domain, owner, repo };
}

export function generateMergeRequestUrl(
  platform: GitPlatform,
  sourceBranch: string,
  targetBranch: string = 'main'
): string | null {
  const encodedSource = encodeURIComponent(sourceBranch);
  const encodedTarget = encodeURIComponent(targetBranch);

  switch (platform.type) {
    case 'github':
      return `https://${platform.domain}/${platform.owner}/${platform.repo}/compare/${encodedTarget}...${encodedSource}?expand=1`;

    case 'gitlab':
      // GitLab URL format for creating a new merge request
      return `https://${platform.domain}/${platform.owner}/${platform.repo}/-/merge_requests/new?merge_request[source_branch]=${encodedSource}&merge_request[target_branch]=${encodedTarget}`;

    case 'gitee':
      return `https://${platform.domain}/${platform.owner}/${platform.repo}/compare/${encodedTarget}...${encodedSource}`;

    case 'bitbucket':
      return `https://${platform.domain}/${platform.owner}/${platform.repo}/pull-requests/new?source=${encodedSource}&dest=${encodedTarget}`;

    default:
      // For unknown platforms, try GitLab format as a fallback
      return `https://${platform.domain}/${platform.owner}/${platform.repo}/-/merge_requests/new?merge_request[source_branch]=${encodedSource}&merge_request[target_branch]=${encodedTarget}`;
  }
}

export function getPlatformName(type: GitPlatform['type']): string {
  switch (type) {
    case 'github':
      return 'GitHub';
    case 'gitlab':
      return 'GitLab';
    case 'gitee':
      return 'Gitee';
    case 'bitbucket':
      return 'Bitbucket';
    default:
      return 'Git';
  }
}