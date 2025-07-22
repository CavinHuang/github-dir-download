<script lang="ts">
  import { onMount } from 'svelte';
  import browser from 'webextension-polyfill';
  import { token, isTokenReady, apiRemaining, isNearRateLimit } from '../stores/tokenStore.js';
  import { download, isDownloading, downloadPercentage, downloadStatusText } from '../stores/downloadStore.js';
  import { ui } from '../stores/uiStore.js';
  import { settings } from '../stores/settingsStore.js';
  import type { RepoInfo } from '../types/github.js';
  
  // 子组件
  import RepoInfoDisplay from './RepoInfoDisplay.svelte';
  import DownloadButton from './DownloadButton.svelte';
  import UserInfoPanel from './UserInfoPanel.svelte';
  import DownloadHistory from './DownloadHistory.svelte';

  let currentTab: 'main' | 'history' | 'settings' = 'main';
  let currentRepo: RepoInfo | null = null;
  let isAnalyzing = false;

  // 订阅状态
  $: tokenState = $token;
  $: downloadState = $download;
  $: settingsState = $settings;

  onMount(async () => {
    // 检查当前是否在GitHub页面
    await checkCurrentPage();
    
    // 刷新token信息
    if ($isTokenReady) {
      await token.refresh();
    }
  });

  async function checkCurrentPage() {
    try {
      // 发送消息到content script获取当前页面信息
      const response = await browser.runtime.sendMessage({ type: 'GET_CURRENT_REPO' });
      if (response?.repoInfo) {
        currentRepo = response.repoInfo;
      }
    } catch (error) {
      console.log('无法获取当前页面信息，可能不在GitHub页面');
    }
  }

  async function handleDownload() {
    if (!currentRepo) {
      ui.showWarning('提示', '请在GitHub仓库页面使用此功能');
      return;
    }

    if (!$isTokenReady) {
      ui.showErrorNotification('错误', 'GitHub Token未设置或已失效');
      ui.setView('setup');
      return;
    }

    try {
      // 使用新的下载逻辑
      await download.startDownload(currentRepo, {
        includeSubfolders: true,
        maxFileSize: settingsState.settings.maxFileSize,
        maxTotalSize: settingsState.settings.maxTotalSize,
        maxFiles: settingsState.settings.maxFiles,
        excludePatterns: settingsState.settings.excludePatterns,
        concurrentDownloads: settingsState.settings.concurrentDownloads
      });

      // 切换到进度视图
      ui.setView('progress');
      ui.showSuccess('下载已开始', '任务已添加到下载队列');
    } catch (error) {
      console.error('启动下载失败:', error);
      ui.showErrorNotification('错误', (error as Error).message || '启动下载失败');
    }
  }

  function handleRefreshToken() {
    token.refresh();
  }

  function handleLogout() {
    token.clearToken();
    ui.setView('setup');
    ui.showInfo('已退出', '已清除GitHub Token');
  }

  function switchTab(tab: 'main' | 'history' | 'settings') {
    currentTab = tab;
  }

  function handleSettingsClick() {
    ui.setView('settings');
  }
</script>

<div class="main-app">
  <!-- 用户信息面板 -->
  <UserInfoPanel on:refresh={handleRefreshToken} on:settings={handleSettingsClick} on:logout={handleLogout} />
  
  <!-- 主要内容区域 -->
  <div class="content-section">
    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button 
        class="tab-btn" 
        class:active={currentTab === 'main'}
        on:click={() => switchTab('main')}
      >
        下载
      </button>
      
      <button 
        class="tab-btn" 
        class:active={currentTab === 'history'}
        on:click={() => switchTab('history')}
      >
        历史
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      {#if currentTab === 'main'}
        <!-- 仓库信息显示 -->
        <RepoInfoDisplay {currentRepo} />
        
        <!-- 下载按钮 -->
        <DownloadButton
          repoInfo={currentRepo}
          canDownload={$isTokenReady && !$isDownloading}
          isDownloading={$isDownloading}
          downloadProgress={downloadState.progress}
          on:download={handleDownload}
        />
        
        <!-- 状态信息 -->
        {#if $isNearRateLimit}
          <div class="rate-limit-warning">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>
            </svg>
            <span>API 调用次数即将用完，剩余 {$apiRemaining} 次</span>
          </div>
        {/if}
        
      {:else if currentTab === 'history'}
        <DownloadHistory />
      {/if}
    </div>
  </div>
</div>

<style>
  .main-app {
    width: 400px;
    min-height: 500px;
    background: white;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .content-section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .tab-nav {
    display: flex;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
  }

  .tab-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: none;
    color: #656d76;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .tab-btn:hover {
    background: rgba(175, 184, 193, 0.1);
    color: #24292f;
  }

  .tab-btn.active {
    color: #0969da;
    border-bottom-color: #0969da;
    background: white;
  }

  .tab-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .rate-limit-warning {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    margin-top: 1rem;
    background: #fff8dc;
    border: 1px solid #f4e5a1;
    border-radius: 6px;
    color: #7d4e00;
    font-size: 0.8125rem;
  }
</style> 