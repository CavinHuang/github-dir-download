import type { GitHubUser, GitHubContent, RateLimit, RateLimitResponse } from '../../types/github.js';
import { GITHUB_API, API_HEADERS, DOWNLOAD_LIMITS } from '../../constants/api.js';
import { ErrorHandler } from '../../utils/error-utils.js';

export class GitHubClient {
  private token: string;
  private baseURL: string;

  constructor(token: string) {
    this.token = token;
    this.baseURL = GITHUB_API.BASE_URL;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': API_HEADERS.ACCEPT,
      'User-Agent': API_HEADERS.USER_AGENT
    };
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // 忽略JSON解析错误，使用默认错误消息
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'GitHubClient.makeRequest');
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch {
      return false;
    }
  }

  async getUserInfo(): Promise<GitHubUser> {
    return await this.makeRequest<GitHubUser>(GITHUB_API.USER_ENDPOINT);
  }

  async getRateLimit(): Promise<RateLimit> {
    const data = await this.makeRequest<RateLimitResponse>(GITHUB_API.RATE_LIMIT_ENDPOINT);
    return data.rate;
  }

  async getRepoContents(
    owner: string, 
    repo: string, 
    path: string = '', 
    ref: string = 'main'
  ): Promise<GitHubContent[]> {
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    const endpoint = GITHUB_API.CONTENTS_ENDPOINT(owner, repo, cleanPath);
    const url = ref ? `${endpoint}?ref=${encodeURIComponent(ref)}` : endpoint;

    const result = await this.makeRequest<GitHubContent | GitHubContent[]>(url);
    
    // GitHub API返回单个文件时是对象，返回目录内容时是数组
    return Array.isArray(result) ? result : [result];
  }

  async getFileContent(owner: string, repo: string, sha: string): Promise<Blob> {
    try {
      const endpoint = GITHUB_API.BLOB_ENDPOINT(owner, repo, sha);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      if (!response.ok) {
        throw new Error(`获取文件内容失败: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'GitHubClient.getFileContent');
    }
  }

  async getAllFilesInDirectory(
    owner: string,
    repo: string,
    path: string = '',
    ref: string = 'main',
    maxFiles: number = DOWNLOAD_LIMITS.MAX_FILES
  ): Promise<GitHubContent[]> {
    const allFiles: GitHubContent[] = [];
    const queue: string[] = [path];

    while (queue.length > 0 && allFiles.length < maxFiles) {
      const currentPath = queue.shift()!;
      
      try {
        const contents = await this.getRepoContents(owner, repo, currentPath, ref);
        
        for (const item of contents) {
          if (allFiles.length >= maxFiles) {
            break;
          }

          if (item.type === 'file') {
            allFiles.push(item);
          } else if (item.type === 'dir') {
            queue.push(item.path);
          }
        }
      } catch (error) {
        console.warn(`跳过目录 ${currentPath}:`, error);
        continue;
      }
    }

    return allFiles;
  }

  async checkRateLimit(): Promise<{ canProceed: boolean; remaining: number; resetTime: Date }> {
    try {
      const rateLimit = await this.getRateLimit();
      const canProceed = rateLimit.remaining > DOWNLOAD_LIMITS.API_RATE_LIMIT_BUFFER;
      const resetTime = new Date(rateLimit.reset * 1000);

      return {
        canProceed,
        remaining: rateLimit.remaining,
        resetTime
      };
    } catch (error) {
      console.error('检查API限制失败:', error);
      return {
        canProceed: false,
        remaining: 0,
        resetTime: new Date()
      };
    }
  }

  async downloadFileWithRetry(
    owner: string,
    repo: string,
    sha: string,
    maxRetries: number = DOWNLOAD_LIMITS.MAX_RETRIES
  ): Promise<Blob> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.getFileContent(owner, repo, sha);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // 指数退避策略
          const delay = DOWNLOAD_LIMITS.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  // 批量获取文件内容（带并发控制）
  async downloadFilesInBatches(
    files: { owner: string; repo: string; sha: string; path: string }[],
    concurrency: number = DOWNLOAD_LIMITS.CONCURRENT_DOWNLOADS,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ path: string; content: Blob; error?: Error }[]> {
    const results: { path: string; content: Blob; error?: Error }[] = [];
    const total = files.length;
    let completed = 0;

    // 分批处理
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const content = await this.downloadFileWithRetry(file.owner, file.repo, file.sha);
          return { path: file.path, content };
        } catch (error) {
          return { path: file.path, content: new Blob(), error: error as Error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      completed += batch.length;
      onProgress?.(completed, total);
    }

    return results;
  }
} 