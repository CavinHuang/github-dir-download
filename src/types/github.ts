export interface RepoInfo {
  owner: string;
  repo: string;
  path: string;
  branch: string;
  url: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
  download_url?: string;
  url: string;
  git_url?: string;
  html_url?: string;
  content?: string;
  encoding?: string;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface RateLimitResponse {
  rate: RateLimit;
  resources: {
    core: RateLimit;
    search: RateLimit;
    graphql: RateLimit;
  };
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: FileTreeNode[];
}

export interface RepoAnalysis {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  largeFiles: GitHubContent[];
  estimatedDownloadTime: number;
}

export interface TokenInfo {
  login: string;
  scopes: string[];
  rateLimit: RateLimit;
} 