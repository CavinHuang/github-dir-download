<script lang="ts">
  import DownloadQueuePanel from './DownloadQueuePanel.svelte';
  import { ui } from '../stores/uiStore.js';

  function handleBack() {
    ui.setView('main');
  }
</script>

<div class="progress-container">
  <!-- 头部 -->
  <div class="progress-header">
    <button class="back-btn" on:click={handleBack}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06L6.72 3.47a.75.75 0 011.06 1.06L4.56 7.75h7.69a.75.75 0 010 1.5H4.56l3.22 3.22a.75.75 0 010 1.06z"/>
      </svg>
      返回
    </button>
    
    <h2>下载管理</h2>
  </div>

  <!-- 下载队列面板 -->
  <DownloadQueuePanel />
</div>

<style>
  .progress-container {
    width: 400px;
    min-height: 500px;
    background: white;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .progress-header {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #d0d7de;
    gap: 0.75rem;
  }

  .back-btn {
    padding: 0.375rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    color: #656d76;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: white;
    border-color: #8c959f;
    color: #24292f;
  }

  .progress-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #24292f;
  }
</style> 