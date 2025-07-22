<script lang="ts">
  import { download, downloadPercentage, downloadStatusText, isDownloading } from '../stores/downloadStore.js';
  import { ui } from '../stores/uiStore.js';
  import { FileUtils } from '../utils/file-utils.js';

  // 订阅下载状态
  $: downloadState = $download;
  $: progress = downloadState.progress;
  $: currentRepo = downloadState.currentRepo;

  function handleCancel() {
    download.cancelDownload();
    ui.setView('main');
  }

  function handleBackToMain() {
    ui.setView('main');
  }

  function handleRetry() {
    if (currentRepo) {
      download.startDownload(currentRepo);
    }
  }
</script>

<div class="progress-container">
  <!-- 头部 -->
  <div class="progress-header">
    <button class="back-btn" on:click={handleBackToMain}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06L6.72 3.47a.75.75 0 011.06 1.06L4.56 7.75h7.69a.75.75 0 010 1.5H4.56l3.22 3.22a.75.75 0 010 1.06z"/>
      </svg>
      返回
    </button>
    
    <h2>下载进度</h2>
  </div>

  {#if currentRepo}
    <!-- 下载目标信息 -->
    <div class="target-info">
      <div class="repo-name">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
        </svg>
        <span>{currentRepo.owner}/{currentRepo.repo}</span>
      </div>
      
      {#if currentRepo.path}
        <div class="repo-path">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
          </svg>
          /{currentRepo.path}
        </div>
      {/if}
    </div>
  {/if}

  {#if progress}
    <!-- 状态显示 -->
    <div class="status-section">
      <div class="status-text">
        {$downloadStatusText}
      </div>
      
      <!-- 进度条 -->
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          style="width: {$downloadPercentage}%"
          class:completed={progress.status === 'completed'}
          class:error={progress.status === 'error'}
        ></div>
      </div>
      
      <div class="progress-details">
        <span>{$downloadPercentage}%</span>
        {#if progress.totalFiles > 0}
          <span>{progress.downloadedFiles} / {progress.totalFiles} 文件</span>
        {/if}
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="details-section">
      {#if progress.currentFile}
        <div class="detail-row">
          <span class="label">当前文件：</span>
          <span class="value" title={progress.currentFile}>{progress.currentFile}</span>
        </div>
      {/if}
      
      {#if progress.totalSize > 0}
        <div class="detail-row">
          <span class="label">大小：</span>
          <span class="value">
            {FileUtils.formatFileSize(progress.downloadedSize)} / {FileUtils.formatFileSize(progress.totalSize)}
          </span>
        </div>
      {/if}
      
      {#if progress.speed && progress.speed > 0}
        <div class="detail-row">
          <span class="label">速度：</span>
          <span class="value">{FileUtils.formatSpeed(progress.speed)}</span>
        </div>
      {/if}
      
      {#if progress.estimatedTimeRemaining}
        <div class="detail-row">
          <span class="label">剩余时间：</span>
          <span class="value">{FileUtils.formatDuration(progress.estimatedTimeRemaining)}</span>
        </div>
      {/if}
      
      <div class="detail-row">
        <span class="label">开始时间：</span>
        <span class="value">{new Date(progress.startTime).toLocaleTimeString()}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      {#if progress.status === 'completed'}
        <button class="action-btn success" on:click={handleBackToMain}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
          完成
        </button>
      {:else if progress.status === 'error'}
        <button class="action-btn" on:click={handleRetry}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1.076l.812-.195a.5.5 0 01.196.98l-1.5.363a.5.5 0 01-.632-.317L6.5 4.5a.5.5 0 01.883-.356L8 4.883V3z"/>
          </svg>
          重试
        </button>
        <button class="action-btn secondary" on:click={handleBackToMain}>
          返回
        </button>
      {:else if $isDownloading}
        <button class="action-btn danger" on:click={handleCancel}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
          </svg>
          取消下载
        </button>
      {/if}
    </div>
  {:else}
    <!-- 无进度信息时的状态 -->
    <div class="no-progress">
      <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
      </svg>
      <h3>准备下载</h3>
      <p>正在初始化下载任务...</p>
    </div>
  {/if}
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

  .target-info {
    padding: 1rem;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
  }

  .repo-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
    margin-bottom: 0.5rem;
  }

  .repo-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #656d76;
  }

  .status-section {
    padding: 1.5rem 1rem;
  }

  .status-text {
    text-align: center;
    font-size: 0.875rem;
    color: #24292f;
    margin-bottom: 1rem;
    font-weight: 500;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }

  .progress-fill {
    height: 100%;
    background: #0969da;
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .progress-fill.completed {
    background: #1f883d;
  }

  .progress-fill.error {
    background: #d1242f;
  }

  .progress-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #656d76;
  }

  .details-section {
    padding: 0 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .label {
    color: #656d76;
    min-width: 80px;
  }

  .value {
    color: #24292f;
    font-weight: 500;
    text-align: right;
    word-break: break-all;
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions {
    margin-top: auto;
    padding: 1rem;
    border-top: 1px solid #d0d7de;
    display: flex;
    gap: 0.75rem;
  }

  .action-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .action-btn.success {
    background: #1f883d;
    border-color: #1f883d;
    color: white;
  }

  .action-btn.success:hover {
    background: #1a7f37;
    border-color: #1a7f37;
  }

  .action-btn.danger {
    background: #d1242f;
    border-color: #d1242f;
    color: white;
  }

  .action-btn.danger:hover {
    background: #a40e26;
    border-color: #a40e26;
  }

  .action-btn.secondary {
    background: #f6f8fa;
    border-color: #d0d7de;
    color: #24292f;
  }

  .action-btn.secondary:hover {
    background: white;
    border-color: #8c959f;
  }

  .action-btn:not(.secondary):not(.success):not(.danger) {
    background: #0969da;
    border-color: #0969da;
    color: white;
  }

  .action-btn:not(.secondary):not(.success):not(.danger):hover {
    background: #0550ae;
    border-color: #0550ae;
  }

  .no-progress {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #656d76;
  }

  .no-progress svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .no-progress h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #24292f;
  }

  .no-progress p {
    margin: 0;
    font-size: 0.875rem;
  }
</style> 