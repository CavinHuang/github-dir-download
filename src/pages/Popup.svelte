<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeStores, token, ui, isTokenReady, needsTokenSetup } from '../stores/index.js';
  
  // 导入页面组件
  import TokenSetup from '../components/TokenSetup.svelte';
  import MainApp from '../components/MainApp.svelte';
  import DownloadProgress from '../components/DownloadProgress.svelte';
  import SettingsModal from '../components/SettingsModal.svelte';
  import NotificationContainer from '../components/NotificationContainer.svelte';
  import ErrorBoundary from '../components/ErrorBoundary.svelte';

  // 订阅UI状态
  $: currentView = $ui.currentView;
  $: isLoading = $ui.isLoading;
  $: hasNotifications = $ui.notifications.length > 0;

  onMount(async () => {
    try {
      // 初始化所有stores
      await initializeStores();
      
      // 根据token状态设置初始视图
      if ($needsTokenSetup) {
        ui.setView('setup');
      } else if ($isTokenReady) {
        ui.setView('main');
      } else {
        ui.setView('setup');
      }
    } catch (error) {
      console.error('初始化失败:', error);
      ui.showErrorNotification('初始化失败', '插件启动时发生错误');
    }
  });

  // 监听token状态变化
  $: if ($isTokenReady && currentView === 'setup') {
    ui.setView('main');
  }
  
  $: if ($needsTokenSetup && currentView !== 'setup') {
    ui.setView('setup');
  }
</script>

<ErrorBoundary>
  <div class="popup-container">
    <!-- 加载状态 -->
    {#if isLoading}
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>
    {/if}

    <!-- 主要内容区域 -->
    <div class="main-content" class:loading={isLoading}>
      {#if currentView === 'setup'}
        <TokenSetup />
      {:else if currentView === 'main'}
        <MainApp />
      {:else if currentView === 'progress'}
        <DownloadProgress />
      {:else if currentView === 'settings'}
        <SettingsModal />
      {:else}
        <!-- 默认回退到主界面 -->
        <MainApp />
      {/if}
    </div>

    <!-- 通知容器 -->
    {#if hasNotifications}
      <NotificationContainer />
    {/if}
  </div>
</ErrorBoundary>

<style>
  .popup-container {
    position: relative;
    width: 400px;
    min-height: 500px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    z-index: 1000;
    font-size: 0.875rem;
    color: #656d76;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #0969da;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .main-content {
    transition: opacity 0.2s ease;
  }

  .main-content.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  /* 全局样式重置 */
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(button:focus) {
    outline: 2px solid #0969da;
    outline-offset: 2px;
  }

  :global(input:focus) {
    outline: none;
  }
</style>
