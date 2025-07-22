<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { download, queueStatus, pendingDownloads } from '../stores/downloadStore.js';
  import type { QueueItem } from '../services/download/DownloadQueue.js';
  import { FileUtils } from '../utils/file-utils.js';

  // 订阅状态
  $: downloadState = $download;
  $: status = $queueStatus;
  $: pending = $pendingDownloads;
  $: currentDownload = downloadState.currentDownload;
  $: queue = downloadState.queue;

  let refreshInterval: number;

  onMount(() => {
    // 初始化时刷新队列
    download.refreshQueue();
    
    // 定时刷新队列状态
    refreshInterval = setInterval(() => {
      download.refreshQueue();
    }, 2000);
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function getStatusText(item: QueueItem): string {
    switch (item.status) {
      case 'pending': return '等待中';
      case 'downloading': return '下载中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return item.status;
    }
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'downloading': return 'status-downloading';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  function handleRetry(item: QueueItem): void {
    download.retryDownload(item.id);
  }

  function handleCancel(item: QueueItem): void {
    download.cancelDownload(item.id);
  }

  function handleClearQueue(): void {
    if (confirm('确定要清空下载队列吗？')) {
      download.clearQueue();
    }
  }
</script>

<div class="queue-panel">
  <!-- 队列状态摘要 -->
  <div class="queue-summary">
    <h3>下载队列</h3>
    <div class="status-badges">
      {#if status.total > 0}
        <span class="badge total">总计: {status.total}</span>
        {#if status.pending > 0}
          <span class="badge pending">等待: {status.pending}</span>
        {/if}
        {#if status.downloading > 0}
          <span class="badge downloading">下载中: {status.downloading}</span>
        {/if}
        {#if status.completed > 0}
          <span class="badge completed">完成: {status.completed}</span>
        {/if}
        {#if status.failed > 0}
          <span class="badge failed">失败: {status.failed}</span>
        {/if}
      {:else}
        <span class="empty-message">队列为空</span>
      {/if}
    </div>
  </div>

  <!-- 当前下载进度 -->
  {#if currentDownload && currentDownload.progress}
    <div class="current-download">
      <div class="download-header">
        <h4>正在下载</h4>
        <button 
          class="cancel-btn" 
          on:click={() => handleCancel(currentDownload)}
          title="取消下载"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
        </button>
      </div>
      
      <div class="repo-info">
        <strong>{currentDownload.repoInfo.owner}/{currentDownload.repoInfo.repo}</strong>
        {#if currentDownload.repoInfo.path}
          <span class="path">/{currentDownload.repoInfo.path}</span>
        {/if}
      </div>

      <div class="progress-info">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style="width: {currentDownload.progress.percentage}%"
          ></div>
        </div>
        <div class="progress-text">
          <span>{currentDownload.progress.percentage}%</span>
          <span>{currentDownload.progress.downloadedFiles} / {currentDownload.progress.totalFiles} 文件</span>
        </div>
      </div>

      {#if currentDownload.progress.currentFile}
        <div class="current-file">
          {currentDownload.progress.currentFile}
        </div>
      {/if}

      {#if currentDownload.progress.speed && currentDownload.progress.speed > 0}
        <div class="speed-info">
          <span>{FileUtils.formatSpeed(currentDownload.progress.speed)}</span>
          {#if currentDownload.progress.estimatedTimeRemaining}
            <span>剩余: {FileUtils.formatDuration(currentDownload.progress.estimatedTimeRemaining)}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- 队列列表 -->
  {#if queue.length > 0}
    <div class="queue-list">
      <div class="list-header">
        <h4>队列任务</h4>
        {#if queue.length > 1}
          <button class="clear-btn" on:click={handleClearQueue}>
            清空队列
          </button>
        {/if}
      </div>

      <div class="queue-items">
        {#each queue as item (item.id)}
          <div class="queue-item" class:current={item.status === 'downloading'}>
            <div class="item-header">
              <div class="repo-name">
                {item.repoInfo.owner}/{item.repoInfo.repo}
                {#if item.repoInfo.path}
                  <span class="path">/{item.repoInfo.path}</span>
                {/if}
              </div>
              <span class="status {getStatusClass(item.status)}">
                {getStatusText(item)}
              </span>
            </div>

            <div class="item-details">
              {#if item.progress}
                <div class="mini-progress">
                  <div class="mini-progress-bar">
                    <div 
                      class="mini-progress-fill" 
                      style="width: {item.progress.percentage}%"
                    ></div>
                  </div>
                  <span class="mini-progress-text">{item.progress.percentage}%</span>
                </div>
              {/if}

              <div class="item-meta">
                {#if item.startedAt}
                  <span>开始: {new Date(item.startedAt).toLocaleTimeString()}</span>
                {/if}
                {#if item.completedAt}
                  <span>完成: {new Date(item.completedAt).toLocaleTimeString()}</span>
                {/if}
                {#if item.completedAt && item.startedAt}
                  <span>用时: {formatDuration(item.completedAt - item.startedAt)}</span>
                {/if}
              </div>

              {#if item.error}
                <div class="error-message">
                  {item.error}
                </div>
              {/if}
            </div>

            <div class="item-actions">
              {#if item.status === 'failed'}
                <button class="retry-btn" on:click={() => handleRetry(item)}>
                  重试
                </button>
              {/if}
              {#if item.status === 'pending'}
                <button class="cancel-btn-small" on:click={() => handleCancel(item)}>
                  取消
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .queue-panel {
    padding: 1rem;
    background: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .queue-summary h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #24292f;
  }

  .status-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge.total { background: #f6f8fa; color: #24292f; }
  .badge.pending { background: #fff8dc; color: #7d4e00; }
  .badge.downloading { background: #dbeafe; color: #1e40af; }
  .badge.completed { background: #dcfce7; color: #166534; }
  .badge.failed { background: #fee2e2; color: #dc2626; }

  .empty-message {
    color: #656d76;
    font-size: 0.875rem;
  }

  .current-download {
    margin-top: 1rem;
    padding: 1rem;
    background: #f6f8fa;
    border-radius: 8px;
    border: 1px solid #d0d7de;
  }

  .download-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .download-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
  }

  .cancel-btn {
    padding: 0.25rem;
    background: none;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    color: #656d76;
    cursor: pointer;
  }

  .cancel-btn:hover {
    background: white;
    color: #d1242f;
  }

  .repo-info {
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .repo-info strong {
    color: #24292f;
  }

  .path {
    color: #656d76;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: #0969da;
    transition: width 0.3s ease;
  }

  .progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #24292f;
    margin-bottom: 0.5rem;
  }

  .current-file {
    font-size: 0.75rem;
    color: #656d76;
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .speed-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #656d76;
  }

  .queue-list {
    margin-top: 1rem;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .list-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
  }

  .clear-btn {
    padding: 0.375rem 0.75rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #656d76;
    cursor: pointer;
  }

  .clear-btn:hover {
    background: white;
    color: #d1242f;
  }

  .queue-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .queue-item {
    padding: 0.75rem;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 6px;
  }

  .queue-item.current {
    border-color: #0969da;
    background: #f0f6ff;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .repo-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #24292f;
  }

  .status {
    padding: 0.125rem 0.375rem;
    border-radius: 8px;
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-pending { background: #fff8dc; color: #7d4e00; }
  .status-downloading { background: #dbeafe; color: #1e40af; }
  .status-completed { background: #dcfce7; color: #166534; }
  .status-failed { background: #fee2e2; color: #dc2626; }
  .status-cancelled { background: #f3f4f6; color: #6b7280; }

  .item-details {
    margin-bottom: 0.5rem;
  }

  .mini-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .mini-progress-bar {
    flex: 1;
    height: 4px;
    background: #d0d7de;
    border-radius: 2px;
    overflow: hidden;
  }

  .mini-progress-fill {
    height: 100%;
    background: #0969da;
  }

  .mini-progress-text {
    font-size: 0.625rem;
    color: #656d76;
    width: 3rem;
    text-align: right;
  }

  .item-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.625rem;
    color: #656d76;
  }

  .error-message {
    margin-top: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #fee2e2;
    color: #dc2626;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .item-actions {
    display: flex;
    gap: 0.5rem;
  }

  .retry-btn, .cancel-btn-small {
    padding: 0.25rem 0.5rem;
    border: 1px solid;
    border-radius: 4px;
    font-size: 0.625rem;
    cursor: pointer;
  }

  .retry-btn {
    background: #f6f8fa;
    border-color: #d0d7de;
    color: #24292f;
  }

  .retry-btn:hover {
    background: #0969da;
    border-color: #0969da;
    color: white;
  }

  .cancel-btn-small {
    background: none;
    border-color: #d0d7de;
    color: #656d76;
  }

  .cancel-btn-small:hover {
    background: #d1242f;
    border-color: #d1242f;
    color: white;
  }
</style>