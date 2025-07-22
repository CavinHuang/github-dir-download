import type { RepoInfo } from '../types/github.js';
import { GITHUB_PATTERNS } from '../constants/ui.js';

export class URLUtils {
  static parseGitHubURL(url: string): RepoInfo | null {
    const match = url.match(GITHUB_PATTERNS.REPO_URL);
    if (!match) return null;

    const [, owner, repo, branch = 'main', path = ''] = match;
    
    return {
      owner,
      repo,
      path: path || '',
      branch: branch || 'main',
      url
    };
  }

  static isGitHubRepoURL(url: string): boolean {
    return GITHUB_PATTERNS.REPO_URL.test(url);
  }

  static isGitHubFolderURL(url: string): boolean {
    return GITHUB_PATTERNS.FOLDER_URL.test(url);
  }

  static buildGitHubAPIURL(baseUrl: string, endpoint: string): string {
    return `${baseUrl}${endpoint}`;
  }

  static sanitizePath(path: string): string {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex + 1);
  }

  static isValidGitHubToken(token: string): boolean {
    // GitHub personal access tokens start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]+)$/.test(token);
  }
} 