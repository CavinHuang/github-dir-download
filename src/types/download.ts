import type { RepoInfo, GitHubContent } from './github.js';

export interface DownloadOptions {
  includeSubfolders: boolean;
  maxFileSize: number;
  maxTotalSize: number;
  maxFiles: number;
  excludePatterns: string[];
  concurrentDownloads: number;
}

export interface DownloadProgress {
  totalFiles: number;
  downloadedFiles: number;
  totalSize: number;
  downloadedSize: number;
  currentFile: string;
  percentage: number;
  status: 'preparing' | 'downloading' | 'packaging' | 'completed' | 'error' | 'cancelled';
  startTime: number;
  estimatedTimeRemaining?: number;
  speed?: number; // bytes per second
}

export interface FileData {
  path: string;
  content: Blob;
  size: number;
}

export interface ZipProgress {
  processedFiles: number;
  totalFiles: number;
  percentage: number;
  currentFile: string;
}

export interface DownloadRequest {
  repoInfo: RepoInfo;
  options: DownloadOptions;
  requestId: string;
}

export interface DownloadResponse {
  success: boolean;
  requestId: string;
  error?: string;
  downloadUrl?: string;
}

export interface FileInfo {
  path: string;
  url: string;
  size: number;
  sha: string;
}

export enum DownloadStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  DOWNLOADING = 'downloading',
  PACKAGING = 'packaging',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
} 