import browser from 'webextension-polyfill';
import type { RepoInfo } from './types/github.js';
import type { DownloadOptions } from './types/download.js';
import { DownloadQueue } from './services/download/DownloadQueue.js';
import { TokenManager } from './services/storage/TokenManager.js';
import { SettingsManager } from './services/storage/SettingsManager.js';
import { ErrorHandler } from './utils/error-utils.js';

class BackgroundScript {
  private tokenManager: TokenManager;
  private settingsManager: SettingsManager;
  private downloadQueue: DownloadQueue;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.downloadQueue = new DownloadQueue();
    this.init();
  }

  private init(): void {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    this.setupDownloadQueue();
  }

  private setupDownloadQueue(): void {
    // 设置下载队列回调
    this.downloadQueue.onProgress((item) => {
      this.updateButtonState('downloading');
      // 可以在这里向popup发送进度更新消息
    });

    this.downloadQueue.onStatusChange((item) => {
      if (item.status === 'completed') {
        this.updateButtonState('ready');
      } else if (item.status === 'failed') {
        this.updateButtonState('error');
      }
    });
  }

  private async handleMessage(message: any, sender: any, sendResponse: any): Promise<any> {
    console.log('GitHub Dir Download Background: 收到消息', message.type);

    try {
      // 检查扩展上下文是否有效
      if (!this.isExtensionContextValid()) {
        console.warn('GitHub Dir Download Background: 扩展上下文可能已失效');
        return { success: false, error: '扩展上下文失效，请刷新页面重试' };
      }

      switch (message.type) {
        case 'START_DOWNLOAD':
          return await this.handleStartDownload(message.repoInfo, message.options);
        case 'GET_CURRENT_REPO':
          return await this.handleGetCurrentRepo();
        case 'GET_DOWNLOAD_QUEUE':
          return { success: true, queue: this.downloadQueue.getQueue() };
        case 'CANCEL_DOWNLOAD':
          this.downloadQueue.cancelDownload(message.itemId);
          return { success: true };
        case 'RETRY_DOWNLOAD':
          this.downloadQueue.retryDownload(message.itemId);
          return { success: true };
        case 'CLEAR_QUEUE':
          this.downloadQueue.clearQueue();
          return { success: true };
        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('GitHub Dir Download Background: 处理消息时发生错误', error);
      const appError = ErrorHandler.handle(error as Error, 'background.handleMessage');
      return { success: false, error: appError.message };
    }
  }

  /**
   * 检查扩展上下文是否有效
   */
  private isExtensionContextValid(): boolean {
    try {
      // 检查基本的 browser runtime 对象
      if (!browser || !browser.runtime) {
        console.warn('browser.runtime 不可用');
        return false;
      }

      // 检查存储API是否可用
      if (!browser.storage || !browser.storage.sync) {
        console.warn('browser.storage 不可用');
        return false;
      }

      // 检查tabs API是否可用
      if (!browser.tabs || !browser.tabs.query) {
        console.warn('browser.tabs 不可用');
        return false;
      }

      return true;
    } catch (error) {
      console.error('扩展上下文检查失败:', error);
      return false;
    }
  }

  private async handleStartDownload(repoInfo: RepoInfo, options?: Partial<DownloadOptions>): Promise<any> {
    console.log('GitHub Dir Download Background: 开始处理下载请求', repoInfo);

    try {
      // 检查和验证token
      const token = await this.tokenManager.getToken();
      if (!token) {
        console.error('GitHub Dir Download Background: 未设置GitHub Token');
        return { success: false, error: '未设置GitHub Token' };
      }

      const isValidToken = await this.tokenManager.validateToken(token);
      if (!isValidToken) {
        console.error('GitHub Dir Download Background: Token无效');
        return { success: false, error: 'GitHub Token无效或已过期' };
      }

      // 将下载任务添加到队列
      const queueItem = this.downloadQueue.addToQueue(repoInfo, options);

      console.log('GitHub Dir Download Background: 下载任务已添加到队列', queueItem.id);
      return {
        success: true,
        itemId: queueItem.id,
        message: '下载任务已开始'
      };
    } catch (error) {
      console.error('GitHub Dir Download Background: 处理下载请求时发生错误', error);
      const appError = ErrorHandler.handle(error as Error, 'background.handleStartDownload');
      console.error('GitHub Dir Download Background: 处理后的错误信息', appError);

      // 更新按钮状态为错误
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_BUTTON_STATE',
            state: 'error'
          });
        }
      } catch (msgError) {
        console.log('更新按钮状态失败:', msgError);
      }

      return {
        success: false,
        error: appError.message,
        details: error instanceof Error ? error.stack : String(error)
      };
    }
  }


  private async updateButtonState(state: string): Promise<void> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_BUTTON_STATE',
          state: state
        });
      }
    } catch (error) {
      console.log('更新按钮状态失败:', error);
    }
  }

  private async handleGetCurrentRepo(): Promise<any> {
    try {
      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.url) {
        return { success: false, error: '无法获取当前页面信息' };
      }

      // 简单的GitHub URL解析
      const url = tabs[0].url;
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?/);

      if (!githubMatch) {
        return { success: false, error: '不是GitHub页面' };
      }

      const [, owner, repo, branch = 'main', path = ''] = githubMatch;

      return {
        success: true,
        repoInfo: {
          owner,
          repo,
          branch,
          path
        }
      };
    } catch (error) {
      console.error('获取当前仓库信息失败:', error);
      return { success: false, error: '获取页面信息失败' };
    }
  }
}

new BackgroundScript();
