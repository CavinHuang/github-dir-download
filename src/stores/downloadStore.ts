import { writable, derived } from 'svelte/store';
import type { RepoInfo } from '../types/github.js';
import type { DownloadProgress, DownloadStatus } from '../types/download.js';
import type { DownloadRecord } from '../types/storage.js';
import { SettingsManager } from '../services/storage/SettingsManager.js';

export interface DownloadState {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  currentRepo: RepoInfo | null;
  downloadHistory: DownloadRecord[];
  queuedDownloads: RepoInfo[];
  error: string | null;
}

const initialState: DownloadState = {
  isDownloading: false,
  progress: null,
  currentRepo: null,
  downloadHistory: [],
  queuedDownloads: [],
  error: null
};

// 创建可写的store
const downloadStore = writable<DownloadState>(initialState);

// 获取SettingsManager实例
const settingsManager = SettingsManager.getInstance();

// 导出的store操作
export const download = {
  // 订阅store状态
  subscribe: downloadStore.subscribe,

  // 初始化：加载下载历史
  async init(): Promise<void> {
    try {
      const history = await settingsManager.getDownloadHistory();
      downloadStore.update(state => ({
        ...state,
        downloadHistory: history
      }));
    } catch (error) {
      console.error('加载下载历史失败:', error);
    }
  },

  // 开始下载
  startDownload(repoInfo: RepoInfo): void {
    downloadStore.update(state => ({
      ...state,
      isDownloading: true,
      currentRepo: repoInfo,
      progress: {
        totalFiles: 0,
        downloadedFiles: 0,
        totalSize: 0,
        downloadedSize: 0,
        currentFile: '',
        percentage: 0,
        status: 'preparing',
        startTime: Date.now()
      },
      error: null
    }));
  },

  // 更新下载进度
  updateProgress(progress: Partial<DownloadProgress>): void {
    downloadStore.update(state => {
      if (!state.progress) return state;
      
      const newProgress = { ...state.progress, ...progress };
      
      // 计算百分比
      if (newProgress.totalFiles > 0) {
        newProgress.percentage = Math.round(
          (newProgress.downloadedFiles / newProgress.totalFiles) * 100
        );
      }
      
      // 计算速度和剩余时间
      const elapsed = Date.now() - newProgress.startTime;
      if (elapsed > 0 && newProgress.downloadedSize > 0) {
        newProgress.speed = newProgress.downloadedSize / (elapsed / 1000);
        
        if (newProgress.speed > 0) {
          const remainingBytes = newProgress.totalSize - newProgress.downloadedSize;
          newProgress.estimatedTimeRemaining = remainingBytes / newProgress.speed;
        }
      }

      return {
        ...state,
        progress: newProgress
      };
    });
  },

  // 完成下载
  async completeDownload(success: boolean, error?: string): Promise<void> {
    try {
      let currentState: DownloadState;
      const unsubscribe = downloadStore.subscribe(state => {
        currentState = state;
      });
      unsubscribe();

      if (currentState!.currentRepo && currentState!.progress) {
        // 创建下载记录
        const record: DownloadRecord = {
          id: crypto.randomUUID(),
          repoInfo: currentState!.currentRepo,
          timestamp: Date.now(),
          status: success ? 'completed' : 'failed',
          fileCount: currentState!.progress.downloadedFiles,
          totalSize: currentState!.progress.downloadedSize,
          duration: Date.now() - currentState!.progress.startTime,
          error: error
        };

        // 保存到历史记录
        await settingsManager.addDownloadRecord(record);
        
        // 更新store状态
        downloadStore.update(state => ({
          ...state,
          isDownloading: false,
          progress: success ? {
            ...state.progress!,
            status: 'completed',
            percentage: 100
          } : {
            ...state.progress!,
            status: 'error'
          },
          downloadHistory: [record, ...state.downloadHistory],
          error: error || null
        }));
      } else {
        // 如果没有当前下载信息，只更新状态
        downloadStore.update(state => ({
          ...state,
          isDownloading: false,
          error: error || null
        }));
      }
    } catch (error) {
      console.error('完成下载处理失败:', error);
      downloadStore.update(state => ({
        ...state,
        isDownloading: false,
        error: '保存下载记录失败'
      }));
    }
  },

  // 取消下载
  cancelDownload(): void {
    downloadStore.update(state => ({
      ...state,
      isDownloading: false,
      progress: state.progress ? {
        ...state.progress,
        status: 'cancelled'
      } : null,
      error: null
    }));
  },

  // 添加到下载队列
  addToQueue(repoInfo: RepoInfo): void {
    downloadStore.update(state => ({
      ...state,
      queuedDownloads: [...state.queuedDownloads, repoInfo]
    }));
  },

  // 从队列中移除
  removeFromQueue(repoInfo: RepoInfo): void {
    downloadStore.update(state => ({
      ...state,
      queuedDownloads: state.queuedDownloads.filter(
        repo => !(repo.owner === repoInfo.owner && 
                 repo.repo === repoInfo.repo && 
                 repo.path === repoInfo.path)
      )
    }));
  },

  // 清除下载历史
  async clearHistory(): Promise<void> {
    try {
      await settingsManager.clearDownloadHistory();
      downloadStore.update(state => ({
        ...state,
        downloadHistory: []
      }));
    } catch (error) {
      console.error('清除下载历史失败:', error);
    }
  },

  // 重新下载
  retryDownload(record: DownloadRecord): void {
    this.startDownload(record.repoInfo);
  },

  // 清除错误
  clearError(): void {
    downloadStore.update(state => ({ ...state, error: null }));
  },

  // 重置状态
  reset(): void {
    downloadStore.update(state => ({
      ...state,
      isDownloading: false,
      progress: null,
      currentRepo: null,
      error: null
    }));
  }
};

// 派生状态：是否可以开始新的下载
export const canStartDownload = derived(
  downloadStore,
  $download => !$download.isDownloading
);

// 派生状态：当前下载的状态文本
export const downloadStatusText = derived(
  downloadStore,
  $download => {
    if (!$download.progress) return '';
    
    switch ($download.progress.status) {
      case 'preparing':
        return '准备下载...';
      case 'downloading':
        return `下载中 ${$download.progress.currentFile}`;
      case 'packaging':
        return '打包中...';
      case 'completed':
        return '下载完成';
      case 'error':
        return '下载失败';
      case 'cancelled':
        return '已取消';
      default:
        return '';
    }
  }
);

// 派生状态：下载进度百分比
export const downloadPercentage = derived(
  downloadStore,
  $download => $download.progress?.percentage || 0
);

// 派生状态：是否正在下载
export const isDownloading = derived(
  downloadStore,
  $download => $download.isDownloading
);

// 派生状态：最近的下载记录
export const recentDownloads = derived(
  downloadStore,
  $download => $download.downloadHistory.slice(0, 5)
); 