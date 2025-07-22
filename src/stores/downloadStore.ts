import { writable, derived } from 'svelte/store';
import browser from 'webextension-polyfill';
import type { RepoInfo } from '../types/github.js';
import type { DownloadProgress, DownloadOptions } from '../types/download.js';
import type { DownloadRecord } from '../types/storage.js';
import type { QueueItem } from '../services/download/DownloadQueue.js';
import { SettingsManager } from '../services/storage/SettingsManager.js';

export interface DownloadState {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  currentRepo: RepoInfo | null;
  downloadHistory: DownloadRecord[];
  queue: QueueItem[];
  currentDownload: QueueItem | null;
  error: string | null;
}

const initialState: DownloadState = {
  isDownloading: false,
  progress: null,
  currentRepo: null,
  downloadHistory: [],
  queue: [],
  currentDownload: null,
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
  async startDownload(repoInfo: RepoInfo, options?: Partial<DownloadOptions>): Promise<void> {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'START_DOWNLOAD',
        repoInfo,
        options
      });

      if (response && response.success) {
        downloadStore.update(state => ({
          ...state,
          isDownloading: true,
          currentRepo: repoInfo,
          error: null
        }));
        
        // 刷新队列状态
        this.refreshQueue();
      } else {
        throw new Error(response?.error || '启动下载失败');
      }
    } catch (error) {
      downloadStore.update(state => ({
        ...state,
        error: (error as Error).message
      }));
      throw error;
    }
  },




  // 刷新下载队列
  async refreshQueue(): Promise<void> {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_DOWNLOAD_QUEUE' });
      if (response && response.success) {
        const currentDownload = response.queue.find((item: QueueItem) => item.status === 'downloading');
        const isDownloading = !!currentDownload;
        
        downloadStore.update(state => ({
          ...state,
          queue: response.queue,
          currentDownload,
          isDownloading,
          progress: currentDownload?.progress || null
        }));
      }
    } catch (error) {
      console.error('刷新下载队列失败:', error);
    }
  },

  // 取消下载
  async cancelDownload(itemId: string): Promise<void> {
    try {
      await browser.runtime.sendMessage({ type: 'CANCEL_DOWNLOAD', itemId });
      this.refreshQueue();
    } catch (error) {
      console.error('取消下载失败:', error);
    }
  },

  // 重试下载
  async retryDownload(itemId: string): Promise<void> {
    try {
      await browser.runtime.sendMessage({ type: 'RETRY_DOWNLOAD', itemId });
      this.refreshQueue();
    } catch (error) {
      console.error('重试下载失败:', error);
    }
  },

  // 清空队列
  async clearQueue(): Promise<void> {
    try {
      await browser.runtime.sendMessage({ type: 'CLEAR_QUEUE' });
      this.refreshQueue();
    } catch (error) {
      console.error('清空队列失败:', error);
    }
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

// 派生状态：下载队列状态
export const queueStatus = derived(
  downloadStore,
  $download => {
    const total = $download.queue.length;
    const pending = $download.queue.filter(item => item.status === 'pending').length;
    const downloading = $download.queue.filter(item => item.status === 'downloading').length;
    const completed = $download.queue.filter(item => item.status === 'completed').length;
    const failed = $download.queue.filter(item => item.status === 'failed').length;
    const cancelled = $download.queue.filter(item => item.status === 'cancelled').length;

    return { total, pending, downloading, completed, failed, cancelled };
  }
);

// 派生状态：队列中的待处理任务
export const pendingDownloads = derived(
  downloadStore,
  $download => $download.queue.filter(item => item.status === 'pending')
); 