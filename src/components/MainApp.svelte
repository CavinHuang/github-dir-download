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

    // 切换到进度视图并开始下载
    ui.setView('progress');
    download.startDownload(currentRepo);
    
    // 发送下载请求到background script
    try {
      await browser.runtime.sendMessage({
        type: 'START_DOWNLOAD',
        repoInfo: currentRepo,
        options: {
          includeSubfolders: true,
          maxFileSize: settingsState.settings.maxFileSize,
          maxTotalSize: settingsState.settings.maxTotalSize,
          maxFiles: settingsState.settings.maxFiles,
          excludePatterns: settingsState.settings.excludePatterns,
          concurrentDownloads: settingsState.settings.concurrentDownloads
        }
      });
    } catch (error) {
      console.error('发送下载请求失败:', error);
      ui.showErrorNotification('错误', '启动下载失败');
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