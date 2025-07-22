export interface UserSettings {
  maxFileSize: number;
  maxTotalSize: number;
  maxFiles: number;
  concurrentDownloads: number;
  includeHiddenFiles: boolean;
  excludePatterns: string[];
  autoDownload: boolean;
  showNotifications: boolean;
}

export interface StorageData {
  token?: string;
  settings?: UserSettings;
  downloadHistory?: DownloadRecord[];
}

export interface DownloadRecord {
  id: string;
  repoInfo: RepoInfo;
  timestamp: number;
  status: 'completed' | 'failed' | 'cancelled';
  fileCount: number;
  totalSize: number;
  duration: number;
  error?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxTotalSize: 1024 * 1024 * 1024, // 1GB
  maxFiles: 1000,
  concurrentDownloads: 5,
  includeHiddenFiles: false,
  excludePatterns: ['.git', 'node_modules', '.DS_Store'],
  autoDownload: false,
  showNotifications: true
};

import type { RepoInfo } from './github.js'; 