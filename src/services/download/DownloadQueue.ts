import type { RepoInfo } from '../../types/github.js';
import type { DownloadOptions, DownloadProgress } from '../../types/download.js';
import { DownloadManager } from './DownloadManager.js';
import { TokenManager } from '../storage/TokenManager.js';
import { SettingsManager } from '../storage/SettingsManager.js';

export interface QueueItem {
  id: string;
  repoInfo: RepoInfo;
  options: DownloadOptions;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress?: DownloadProgress;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export class DownloadQueue {
  private queue: QueueItem[] = [];
  private currentDownload: QueueItem | null = null;
  private downloadManager: DownloadManager | null = null;
  private tokenManager: TokenManager;
  private settingsManager: SettingsManager;
  private maxConcurrent: number = 1; // 暂时只支持单个下载
  private onProgressCallback?: (item: QueueItem) => void;
  private onStatusChangeCallback?: (item: QueueItem) => void;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
  }

  /**
   * 添加下载任务到队列
   */
  addToQueue(repoInfo: RepoInfo, options?: Partial<DownloadOptions>): QueueItem {
    const defaultOptions = this.getDefaultDownloadOptions();
    const finalOptions = { ...defaultOptions, ...options };

    const item: QueueItem = {
      id: crypto.randomUUID(),
      repoInfo,
      options: finalOptions,
      status: 'pending',
      createdAt: Date.now()
    };

    this.queue.push(item);
    this.processQueue();
    
    return item;
  }

  /**
   * 移除队列中的任务
   */
  removeFromQueue(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    const item = this.queue[index];
    
    // 如果任务正在下载，先取消
    if (item.status === 'downloading' && this.currentDownload?.id === itemId) {
      this.cancelDownload(itemId);
    }

    this.queue.splice(index, 1);
    return true;
  }

  /**
   * 取消下载
   */
  cancelDownload(itemId: string): void {
    const item = this.queue.find(item => item.id === itemId);
    if (!item) return;

    if (item.status === 'downloading' && this.downloadManager) {
      this.downloadManager.cancelDownload();
      item.status = 'cancelled';
      item.completedAt = Date.now();
      this.notifyStatusChange(item);
    } else if (item.status === 'pending') {
      item.status = 'cancelled';
      item.completedAt = Date.now();
      this.notifyStatusChange(item);
    }
  }

  /**
   * 重试失败的下载
   */
  retryDownload(itemId: string): void {
    const item = this.queue.find(item => item.id === itemId);
    if (!item || item.status !== 'failed') return;

    item.status = 'pending';
    item.error = undefined;
    item.progress = undefined;
    item.startedAt = undefined;
    item.completedAt = undefined;

    this.notifyStatusChange(item);
    this.processQueue();
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const total = this.queue.length;
    const pending = this.queue.filter(item => item.status === 'pending').length;
    const downloading = this.queue.filter(item => item.status === 'downloading').length;
    const completed = this.queue.filter(item => item.status === 'completed').length;
    const failed = this.queue.filter(item => item.status === 'failed').length;
    const cancelled = this.queue.filter(item => item.status === 'cancelled').length;

    return { total, pending, downloading, completed, failed, cancelled };
  }

  /**
   * 获取队列中的所有任务
   */
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * 获取当前正在下载的任务
   */
  getCurrentDownload(): QueueItem | null {
    return this.currentDownload ? { ...this.currentDownload } : null;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 取消当前下载
    if (this.currentDownload) {
      this.cancelDownload(this.currentDownload.id);
    }

    // 清空队列
    this.queue = [];
    this.currentDownload = null;
  }

  /**
   * 设置进度回调
   */
  onProgress(callback: (item: QueueItem) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * 设置状态变化回调
   */
  onStatusChange(callback: (item: QueueItem) => void): void {
    this.onStatusChangeCallback = callback;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 检查是否可以开始新的下载
    if (this.currentDownload && this.currentDownload.status === 'downloading') {
      return; // 已有下载在进行
    }

    // 查找待下载的任务
    const pendingItem = this.queue.find(item => item.status === 'pending');
    if (!pendingItem) {
      return; // 没有待处理的任务
    }

    await this.startDownload(pendingItem);
  }

  /**
   * 开始下载任务
   */
  private async startDownload(item: QueueItem): Promise<void> {
    try {
      // 获取token
      const token = await this.tokenManager.getToken();
      if (!token) {
        throw new Error('GitHub Token未设置');
      }

      // 创建下载管理器
      this.downloadManager = new DownloadManager(token);
      this.currentDownload = item;

      // 更新状态
      item.status = 'downloading';
      item.startedAt = Date.now();
      this.notifyStatusChange(item);

      // 开始下载
      await this.downloadManager.startDownload(
        item.repoInfo,
        item.options,
        (progress: DownloadProgress) => {
          item.progress = progress;
          this.notifyProgress(item);
        }
      );

      // 下载完成
      item.status = 'completed';
      item.completedAt = Date.now();
      this.notifyStatusChange(item);

      // 保存下载记录
      await this.saveDownloadRecord(item);

    } catch (error) {
      // 下载失败
      item.status = 'failed';
      item.error = (error as Error).message;
      item.completedAt = Date.now();
      this.notifyStatusChange(item);
    } finally {
      this.currentDownload = null;
      this.downloadManager = null;
      
      // 处理队列中的下一个任务
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * 获取默认下载选项
   */
  private getDefaultDownloadOptions(): DownloadOptions {
    const settings = this.settingsManager.getSettings();
    
    return {
      includeSubfolders: true,
      maxFileSize: settings.maxFileSize,
      maxTotalSize: settings.maxTotalSize,
      maxFiles: settings.maxFiles,
      excludePatterns: settings.excludePatterns,
      concurrentDownloads: settings.concurrentDownloads
    };
  }

  /**
   * 保存下载记录
   */
  private async saveDownloadRecord(item: QueueItem): Promise<void> {
    try {
      const record = {
        id: crypto.randomUUID(),
        repoInfo: item.repoInfo,
        timestamp: item.completedAt || Date.now(),
        status: item.status as 'completed' | 'failed' | 'cancelled',
        fileCount: item.progress?.downloadedFiles || 0,
        totalSize: item.progress?.downloadedSize || 0,
        duration: (item.completedAt || Date.now()) - (item.startedAt || Date.now()),
        error: item.error
      };

      await this.settingsManager.addDownloadRecord(record);
    } catch (error) {
      console.error('保存下载记录失败:', error);
    }
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(item: QueueItem): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({ ...item });
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStatusChange(item: QueueItem): void {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ ...item });
    }
  }
}