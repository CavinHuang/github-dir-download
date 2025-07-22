import browser from 'webextension-polyfill';
import { URLUtils } from './utils/url-utils.js';
import { DOMUtils } from './utils/dom-utils.js';
import type { RepoInfo } from './types/github.js';
import type { CurrentPageInfo, ButtonState } from './types/ui.js';
import { GITHUB_PATTERNS, UI_CONSTANTS } from './constants/ui.js';

class GitHubContentScript {
  private currentRepoInfo: RepoInfo | null = null;
  private downloadButton: HTMLElement | null = null;
  private isInjected = false;
  private pageObserver: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // 检查是否在GitHub页面
    if (!this.isGitHubPage()) {
      return;
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageReady());
    } else {
      this.onPageReady();
    }

    // 监听来自background/popup的消息
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  private isGitHubPage(): boolean {
    return window.location.hostname === 'github.com';
  }

  private onPageReady(): void {
    this.analyzeCurrentPage();
    this.setupPageObserver();
    this.injectStyles();
  }

  private analyzeCurrentPage(): void {
    const url = window.location.href;
    const repoInfo = URLUtils.parseGitHubURL(url);
    
    if (repoInfo && this.shouldShowDownloadButton(repoInfo)) {
      this.currentRepoInfo = repoInfo;
      this.injectDownloadButton();
    } else {
      this.currentRepoInfo = null;
      this.removeDownloadButton();
    }
  }

  private shouldShowDownloadButton(repoInfo: RepoInfo): boolean {
    // 只在仓库页面或文件夹页面显示下载按钮
    // 不在以下页面显示：issues, pulls, actions, settings等
    const pathname = window.location.pathname;
    const excludePatterns = [
      '/issues',
      '/pull/',
      '/pulls',
      '/actions',
      '/settings',
      '/wiki',
      '/projects',
      '/security',
      '/pulse',
      '/community',
      '/graphs'
    ];

    return !excludePatterns.some(pattern => pathname.includes(pattern));
  }

  private async injectDownloadButton(): Promise<void> {
    if (this.isInjected || !this.currentRepoInfo) {
      return;
    }

    // 等待目标容器出现
    const targetSelector = this.getButtonTargetSelector();
    const targetContainer = await DOMUtils.waitForElement(targetSelector, 10000);
    
    if (!targetContainer) {
      console.log('GitHub Dir Download: 找不到按钮注入位置，尝试备用方案');
      // 尝试备用方案：直接在页面主容器中创建
      this.tryAlternativeInjection();
      return;
    }

    // 创建下载按钮
    this.downloadButton = DOMUtils.createDownloadButton(
      this.getButtonText(),
      this.handleDownloadClick.bind(this)
    );

    // 插入按钮
    this.insertButtonIntoContainer(targetContainer, this.downloadButton);
    this.isInjected = true;

    console.log('GitHub Dir Download: 按钮已注入');
  }

  private getButtonTargetSelector(): string {
    // GitHub页面的工具栏选择器 - 2024年新版GitHub界面
    const selectors = [
      // 新版GitHub目录页面的工具栏
      '.react-code-view-header-element--wide .d-flex.gap-2',
      '.CodeViewHeader-module__Box_7--FZfkg .d-flex.gap-2',
      // 文件列表页面的工具栏  
      '[data-testid="breadcrumbs"] + div .d-flex',
      // 仓库主页的工具栏
      '.repository-content .Box-header .d-flex',
      // 备用选择器
      '.file-navigation .d-flex',
      'nav[aria-labelledby*="breadcrumb"] + div .d-flex'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('GitHub Dir Download: 找到注入位置:', selector);
        return selector;
      }
    }

    console.log('GitHub Dir Download: 未找到合适的注入位置，使用通用选择器');
    return selectors[0]; // 返回默认选择器
  }

  private getButtonText(): string {
    if (!this.currentRepoInfo) return '下载文件夹';
    
    if (this.currentRepoInfo.path) {
      const pathParts = this.currentRepoInfo.path.split('/');
      const folderName = pathParts[pathParts.length - 1];
      return `下载 ${folderName}`;
    }
    
    return '下载仓库';
  }

  private insertButtonIntoContainer(container: Element, button: HTMLElement): void {
    // 查找现有的按钮容器
    const existingButtonContainer = container.classList.contains('d-flex') ? container : container.querySelector('.d-flex');
    
    if (existingButtonContainer) {
      // 在现有按钮组的开头插入
      if (existingButtonContainer.firstChild) {
        existingButtonContainer.insertBefore(button, existingButtonContainer.firstChild);
      } else {
        existingButtonContainer.appendChild(button);
      }
      console.log('GitHub Dir Download: 按钮已插入到现有容器');
    } else {
      // 创建新的按钮容器
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'd-flex gap-2 align-items-center';
      buttonContainer.appendChild(button);
      container.appendChild(buttonContainer);
      console.log('GitHub Dir Download: 创建了新的按钮容器');
    }
  }

  private removeDownloadButton(): void {
    if (this.downloadButton && this.downloadButton.parentNode) {
      this.downloadButton.parentNode.removeChild(this.downloadButton);
      this.downloadButton = null;
      this.isInjected = false;
    }
  }

  private async handleDownloadClick(): Promise<void> {
    if (!this.currentRepoInfo) {
      console.error('GitHub Dir Download: 没有当前仓库信息');
      return;
    }

    console.log('GitHub Dir Download: 开始下载请求', this.currentRepoInfo);
    
    // 更新按钮状态为分析中
    this.updateButtonState('analyzing');

    try {
      // 发送下载请求到background script
      const response = await browser.runtime.sendMessage({
        type: 'START_DOWNLOAD',
        repoInfo: this.currentRepoInfo
      });

      console.log('GitHub Dir Download: 收到响应', response);

      if (response && response.success) {
        console.log('GitHub Dir Download: 下载开始成功');
        this.updateButtonState('downloading');
      } else {
        const errorMsg = response?.error || '未知错误';
        console.error('GitHub Dir Download: 下载失败', errorMsg);
        this.updateButtonState('error');
        // 显示错误提示
        this.showErrorTooltip(errorMsg);
        setTimeout(() => this.updateButtonState('ready'), 3000);
      }
    } catch (error) {
      console.error('GitHub Dir Download: 下载请求失败', error);
      const errorMsg = error instanceof Error ? error.message : '通信失败';
      console.error('GitHub Dir Download: 详细错误信息', errorMsg);
      this.updateButtonState('error');
      this.showErrorTooltip(errorMsg);
      setTimeout(() => this.updateButtonState('ready'), 3000);
    }
  }

  private updateButtonState(state: ButtonState): void {
    if (!this.downloadButton) return;

    DOMUtils.updateButtonState(this.downloadButton as HTMLButtonElement, state);
  }

  private showErrorTooltip(message: string): void {
    if (!this.downloadButton) return;

    // 创建错误提示
    const tooltip = document.createElement('div');
    tooltip.id = 'github-dir-download-error-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #d1242f;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
      top: 100%;
      left: 0;
      margin-top: 4px;
    `;
    tooltip.textContent = message;

    // 移除已存在的提示
    const existingTooltip = document.getElementById('github-dir-download-error-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    // 设置按钮为相对定位
    const button = this.downloadButton as HTMLElement;
    const originalPosition = button.style.position;
    button.style.position = 'relative';
    button.appendChild(tooltip);

    // 3秒后移除提示
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
        button.style.position = originalPosition;
      }
    }, 3000);
  }

  private setupPageObserver(): void {
    // 监听页面变化（GitHub是SPA应用）
    this.pageObserver = new MutationObserver((mutations) => {
      let shouldReanalyze = false;

      mutations.forEach((mutation) => {
        // 检查是否是导航变化
        if (mutation.type === 'childList' && 
            mutation.target === document.body ||
            (mutation.target as Element).matches?.('[data-turbo-body]')) {
          shouldReanalyze = true;
        }
      });

      if (shouldReanalyze) {
        // 延迟执行，等待页面渲染完成
        setTimeout(() => this.analyzeCurrentPage(), 500);
      }
    });

    this.pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private injectStyles(): void {
    const styles = `
      .github-dir-download-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.375rem !important;
        padding: 0.375rem 0.75rem !important;
        background: #1f883d !important;
        color: white !important;
        border: 1px solid #1f883d !important;
        border-radius: 6px !important;
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        margin-left: 0.5rem !important;
      }
      
      .github-dir-download-btn:hover {
        background: #1a7f37 !important;
        border-color: #1a7f37 !important;
        color: white !important;
        text-decoration: none !important;
      }
      
      .github-dir-download-btn:disabled,
      .github-dir-download-btn.disabled {
        background: #8c959f !important;
        border-color: #8c959f !important;
        color: white !important;
        cursor: not-allowed !important;
        opacity: 0.6 !important;
      }
      
      .github-dir-download-btn.analyzing {
        background: #0969da !important;
        border-color: #0969da !important;
      }
      
      .github-dir-download-btn.downloading {
        background: #6f42c1 !important;
        border-color: #6f42c1 !important;
      }
      
      .github-dir-download-btn.error {
        background: #d1242f !important;
        border-color: #d1242f !important;
      }
      
      .github-dir-download-btn .loading-spinner {
        width: 0.875rem !important;
        height: 0.875rem !important;
        border: 2px solid transparent !important;
        border-top: 2px solid currentColor !important;
        border-radius: 50% !important;
        animation: github-dir-download-spin 1s linear infinite !important;
      }
      
      @keyframes github-dir-download-spin {
        to { transform: rotate(360deg); }
      }
    `;

    // 创建并注入自定义样式
    const styleElement = document.createElement('style');
    styleElement.id = 'github-dir-download-styles';
    styleElement.textContent = styles;
    
    // 避免重复注入
    if (!document.getElementById('github-dir-download-styles')) {
      document.head.appendChild(styleElement);
    }
  }

  private async handleMessage(message: any, sender: any, sendResponse: any): Promise<any> {
    switch (message.type) {
      case 'GET_REPO_INFO':
        return {
          repoInfo: this.currentRepoInfo,
          pageInfo: this.getCurrentPageInfo()
        };

      case 'UPDATE_BUTTON_STATE':
        if (message.state) {
          this.updateButtonState(message.state);
        }
        return { success: true };

      case 'GET_CURRENT_REPO':
        return {
          repoInfo: this.currentRepoInfo
        };

      default:
        return { success: false, error: 'Unknown message type' };
    }
  }

  private getCurrentPageInfo(): CurrentPageInfo {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    return {
      url,
      pathname,
      isGitHubPage: this.isGitHubPage(),
      isRepoPage: URLUtils.isGitHubRepoURL(url),
      isFolderPage: URLUtils.isGitHubFolderURL(url),
      repoInfo: this.currentRepoInfo
    };
  }

  private tryAlternativeInjection(): void {
    // 备用注入方案：在页面的明显位置创建悬浮按钮
    const floatingButton = DOMUtils.createDownloadButton(
      this.getButtonText(),
      this.handleDownloadClick.bind(this)
    );
    
    floatingButton.style.cssText = `
      position: fixed !important;
      top: 100px !important;
      right: 20px !important;
      z-index: 9999 !important;
      background: #1f883d !important;
      color: white !important;
      border: none !important;
      padding: 12px 16px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      font-size: 14px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    `;
    
    document.body.appendChild(floatingButton);
    this.downloadButton = floatingButton;
    this.isInjected = true;
    
    console.log('GitHub Dir Download: 使用悬浮按钮方案');
  }

  // 清理资源
  destroy(): void {
    if (this.pageObserver) {
      this.pageObserver.disconnect();
      this.pageObserver = null;
    }
    
    this.removeDownloadButton();
    
    // 移除注入的样式
    const styleElement = document.getElementById('github-dir-download-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}

// 创建实例
let contentScript: GitHubContentScript | null = null;

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript = new GitHubContentScript();
  });
} else {
  contentScript = new GitHubContentScript();
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  if (contentScript) {
    contentScript.destroy();
    contentScript = null;
  }
}); 