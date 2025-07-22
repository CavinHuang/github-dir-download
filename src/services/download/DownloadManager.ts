import JSZip from 'jszip';
import type { RepoInfo } from '../../types/github.js';
import type { DownloadOptions, DownloadProgress, FileData } from '../../types/download.js';
import { GitHubClient } from '../github/GitHubClient.js';
import { FileUtils } from '../../utils/file-utils.js';
import { ErrorHandler } from '../../utils/error-utils.js';

export interface DownloadState {
  isDownloading: boolean;
  progress: DownloadProgress | null;
  requestId: string | null;
}

export class DownloadManager {
  private githubClient: GitHubClient;
  private downloadState: DownloadState;
  private abortController: AbortController | null = null;
  private progressCallback?: (progress: DownloadProgress) => void;

  constructor(token: string) {
    this.githubClient = new GitHubClient(token);
    this.downloadState = {
      isDownloading: false,
      progress: null,
      requestId: null
    };
  }

  /**
   * 开始下载流程
   */
  async startDownload(
    repoInfo: RepoInfo,
    options: DownloadOptions,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (this.downloadState.isDownloading) {
      throw new Error('下载已在进行中');
    }

    this.progressCallback = onProgress;
    this.abortController = new AbortController();
    const requestId = crypto.randomUUID();

    this.downloadState = {
      isDownloading: true,
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
      requestId
    };

    this.updateProgress({ status: 'preparing' });

    try {
      // 1. 分析仓库结构
      await this.analyzeRepository(repoInfo, options);
      
      // 2. 收集文件列表
      const fileList = await this.collectFiles(repoInfo, options);
      
      // 3. 下载文件
      const fileData = await this.downloadFiles(fileList, options, repoInfo);
      
      // 4. 生成ZIP
      await this.generateZip(fileData, repoInfo);
      
      // 5. 完成
      this.updateProgress({ 
        status: 'completed',
        percentage: 100
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.updateProgress({ status: 'cancelled' });
      } else {
        this.updateProgress({ status: 'error' });
        throw ErrorHandler.handle(error as Error, 'DownloadManager.startDownload');
      }
    } finally {
      this.downloadState.isDownloading = false;
      this.abortController = null;
    }
  }

  /**
   * 取消下载
   */
  cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 获取下载状态
   */
  getDownloadState(): DownloadState {
    return { ...this.downloadState };
  }

  /**
   * 分析仓库结构
   */
  private async analyzeRepository(repoInfo: RepoInfo, options: DownloadOptions): Promise<void> {
    this.updateProgress({ 
      status: 'preparing',
      currentFile: '分析仓库结构...' 
    });

    // 检查API限制
    const rateLimitCheck = await this.githubClient.checkRateLimit();
    if (!rateLimitCheck.canProceed) {
      throw new Error(`API调用次数不足，将在 ${rateLimitCheck.resetTime.toLocaleTimeString()} 重置`);
    }

    // 验证仓库访问权限
    try {
      await this.githubClient.getRepoContents(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.path || '',
        repoInfo.branch || 'main'
      );
    } catch (error) {
      throw new Error(`无法访问仓库: ${(error as Error).message}`);
    }
  }

  /**
   * 收集文件列表
   */
  private async collectFiles(repoInfo: RepoInfo, options: DownloadOptions): Promise<Array<{
    path: string;
    downloadUrl: string;
    size: number;
    sha: string;
  }>> {
    this.updateProgress({ 
      status: 'preparing',
      currentFile: '收集文件列表...' 
    });

    const allFiles = await this.githubClient.getAllFilesInDirectory(
      repoInfo.owner,
      repoInfo.repo,
      repoInfo.path || '',
      repoInfo.branch || 'main',
      options.maxFiles
    );

    // 过滤文件
    const filteredFiles = allFiles.filter(file => {
      // 跳过非文件
      if (file.type !== 'file') return false;

      // 检查文件大小
      if (file.size && file.size > options.maxFileSize) return false;

      // 检查隐藏文件
      if (!options.includeHiddenFiles && file.name.startsWith('.')) return false;

      // 检查排除模式
      if (this.isExcluded(file.path, options.excludePatterns)) return false;

      return true;
    });

    const totalSize = filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalSize > options.maxTotalSize) {
      throw new Error(`文件总大小 ${FileUtils.formatFileSize(totalSize)} 超过限制 ${FileUtils.formatFileSize(options.maxTotalSize)}`);
    }

    this.updateProgress({
      totalFiles: filteredFiles.length,
      totalSize
    });

    return filteredFiles.map(file => ({
      path: file.path,
      downloadUrl: file.download_url || '',
      size: file.size || 0,
      sha: file.sha
    }));
  }

  /**
   * 下载文件
   */
  private async downloadFiles(
    fileList: Array<{
      path: string;
      downloadUrl: string;
      size: number;
      sha: string;
    }>,
    options: DownloadOptions,
    repoInfo: RepoInfo
  ): Promise<FileData[]> {
    this.updateProgress({ status: 'downloading' });

    const results: FileData[] = [];
    const concurrency = Math.min(options.concurrentDownloads, 10); // 最大并发限制

    // 分批下载
    for (let i = 0; i < fileList.length; i += concurrency) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      const batch = fileList.slice(i, i + concurrency);
      const batchPromises = batch.map(file => this.downloadSingleFile(file, repoInfo));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const file = batch[j];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn(`下载文件失败 ${file.path}:`, result.reason);
          // 创建空文件占位
          results.push({
            path: file.path,
            content: new Blob([''], { type: 'text/plain' }),
            size: 0
          });
        }
        
        // 更新进度
        const downloadedFiles = i + j + 1;
        const downloadedSize = results.reduce((sum, r) => sum + r.size, 0);
        
        this.updateProgress({
          downloadedFiles,
          downloadedSize,
          currentFile: file.path,
          percentage: Math.round((downloadedFiles / fileList.length) * 80) // 80%用于下载，20%用于打包
        });
      }

      // 避免请求过于频繁
      if (i + concurrency < fileList.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * 下载单个文件
   */
  private async downloadSingleFile(file: {
    path: string;
    downloadUrl: string;
    size: number;
    sha: string;
  }, repoInfo: RepoInfo): Promise<FileData> {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let response: Response;

        if (file.downloadUrl) {
          // 使用download_url直接下载
          response = await fetch(file.downloadUrl, {
            signal: this.abortController?.signal,
            headers: {
              'User-Agent': 'GitHub-Dir-Download-Extension/1.0.0'
            }
          });
        } else {
          // 使用GitHub API下载
          const blob = await this.githubClient.downloadFileWithRetry(
            repoInfo.owner,
            repoInfo.repo,
            file.sha
          );
          
          return {
            path: file.path,
            content: blob,
            size: blob.size
          };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.blob();
        return {
          path: file.path,
          content,
          size: content.size
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          // 指数退避
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 生成ZIP文件
   */
  private async generateZip(fileData: FileData[], repoInfo: RepoInfo): Promise<void> {
    this.updateProgress({ 
      status: 'packaging',
      currentFile: '生成ZIP文件...',
      percentage: 85
    });

    const zip = new JSZip();
    const basePath = repoInfo.path || '';

    for (const file of fileData) {
      // 计算相对路径
      let relativePath = file.path;
      if (basePath && relativePath.startsWith(basePath)) {
        relativePath = relativePath.substring(basePath.length);
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.substring(1);
        }
      }

      // 确保路径安全
      relativePath = FileUtils.sanitizeFileName(relativePath);
      
      if (relativePath) {
        zip.file(relativePath, file.content);
      }
    }

    this.updateProgress({ 
      currentFile: '压缩文件...',
      percentage: 90
    });

    // 生成ZIP
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    this.updateProgress({ 
      currentFile: '准备下载...',
      percentage: 95
    });

    // 下载文件
    const fileName = FileUtils.generateFileName(
      repoInfo.owner,
      repoInfo.repo,
      repoInfo.path || ''
    );

    // 创建下载链接
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 清理资源
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * 检查文件是否被排除
   */
  private isExcluded(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      // 简单的通配符匹配
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(filePath) || filePath.includes(pattern);
    });
  }

  /**
   * 更新下载进度
   */
  private updateProgress(updates: Partial<DownloadProgress>): void {
    if (!this.downloadState.progress) return;

    this.downloadState.progress = {
      ...this.downloadState.progress,
      ...updates
    };

    // 计算速度和剩余时间
    if (this.downloadState.progress.downloadedSize > 0) {
      const elapsed = Date.now() - this.downloadState.progress.startTime;
      if (elapsed > 0) {
        this.downloadState.progress.speed = this.downloadState.progress.downloadedSize / (elapsed / 1000);
        
        if (this.downloadState.progress.speed > 0 && this.downloadState.progress.totalSize > 0) {
          const remainingBytes = this.downloadState.progress.totalSize - this.downloadState.progress.downloadedSize;
          this.downloadState.progress.estimatedTimeRemaining = remainingBytes / this.downloadState.progress.speed;
        }
      }
    }

    // 调用回调
    if (this.progressCallback) {
      this.progressCallback({ ...this.downloadState.progress });
    }
  }
}