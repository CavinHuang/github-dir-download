import type { RepoInfo } from './github.js';
import type { DownloadProgress } from './download.js';

export type ViewType = 'setup' | 'main' | 'progress' | 'settings';

export interface UIState {
  currentView: ViewType;
  isLoading: boolean;
  error: AppError | null;
  notifications: Notification[];
  theme: 'light' | 'dark' | 'auto';
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: number;
  id: string;
}

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_REPO = 'INVALID_REPO',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  ZIP_CREATION_FAILED = 'ZIP_CREATION_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export type ButtonState = 'ready' | 'analyzing' | 'downloading' | 'error' | 'disabled';

export type PageType = 'repo-root' | 'repo-folder' | 'repo-file' | 'other';

export interface CurrentPageInfo {
  url: string;
  pathname: string;
  isGitHubPage: boolean;
  isRepoPage: boolean;
  isFolderPage: boolean;
  repoInfo: RepoInfo | null;
} 