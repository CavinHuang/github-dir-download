<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RepoInfo } from '../types/github.js';
  import type { DownloadProgress } from '../types/download.js';
  import { FileUtils } from '../utils/file-utils.js';

  export let repoInfo: RepoInfo | null;
  export let canDownload: boolean;
  export let isDownloading: boolean;
  export let downloadProgress: DownloadProgress | null;

  const dispatch = createEventDispatcher();

  function handleDownload() {
    dispatch('download');
  }

  $: buttonText = getButtonText(isDownloading, downloadProgress);
  $: buttonClass = getButtonClass(canDownload, isDownloading);

  function getButtonText(downloading: boolean, progress: DownloadProgress | null): string {
    if (!repoInfo) return '请选择仓库文件夹';
    if (downloading && progress) {
      switch (progress.status) {
        case 'preparing':
          return '准备下载...';
        case 'downloading':
          return `下载中 (${progress.percentage}%)`;
        case 'packaging':
          return '打包中...';
        default:
          return '下载中...';
      }
    }
    return `下载 ${repoInfo.path || '根目录'}`;
  }

  function getButtonClass(canDownload: boolean, downloading: boolean): string {
    if (!canDownload || !repoInfo) return 'disabled';
    if (downloading) return 'downloading';
    return 'ready';
  }
</script>

<div class="download-section">
  <div class="download-info">
    {#if repoInfo}
      <div class="download-target">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
        </svg>
        <span>下载目标：{repoInfo.path || '根目录'}</span>
      </div>
      
      {#if downloadProgress && downloadProgress.totalSize > 0}
        <div class="size-info">
          <span>大小：{FileUtils.formatFileSize(downloadProgress.totalSize)}</span>
          <span>文件：{downloadProgress.totalFiles} 个</span>
        </div>
      {/if}
    {:else}
      <div class="no-target">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/>
        </svg>
        <span>请先访问GitHub仓库页面</span>
      </div>
    {/if}
  </div>

  <button 
    class="download-btn {buttonClass}"
    on:click={handleDownload}
    disabled={!canDownload || !repoInfo || isDownloading}
  >
    {#if isDownloading}
      <span class="loading-spinner"></span>
    {:else}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
      </svg>
    {/if}
    {buttonText}
  </button>

  {#if downloadProgress && isDownloading}
    <div class="download-details">
      <div class="progress-info">
        <span>{downloadProgress.downloadedFiles} / {downloadProgress.totalFiles}</span>
        <span>{downloadProgress.percentage}%</span>
      </div>
      
      {#if downloadProgress.currentFile}
        <div class="current-file">
          正在下载：{downloadProgress.currentFile}
        </div>
      {/if}
      
      {#if downloadProgress.speed && downloadProgress.speed > 0}
        <div class="speed-info">
          <span>{FileUtils.formatSpeed(downloadProgress.speed)}</span>
          {#if downloadProgress.estimatedTimeRemaining}
            <span>剩余：{FileUtils.formatDuration(downloadProgress.estimatedTimeRemaining)}</span>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .download-section {
    margin-top: 1rem;
    padding: 1rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 8px;
  }

  .download-info {
    margin-bottom: 1rem;
  }

  .download-target {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #24292f;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .size-info {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #656d76;
  }

  .no-target {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #656d76;
    font-size: 0.875rem;
  }

  .download-btn {
    width: 100%;
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
    margin-bottom: 1rem;
  }

  .download-btn.ready {
    background: #1f883d;
    border-color: #1f883d;
    color: white;
  }

  .download-btn.ready:hover {
    background: #1a7f37;
    border-color: #1a7f37;
  }

  .download-btn.downloading {
    background: #0969da;
    border-color: #0969da;
    color: white;
  }

  .download-btn.disabled {
    background: #f6f8fa;
    border-color: #d0d7de;
    color: #8c959f;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .download-details {
    padding-top: 1rem;
    border-top: 1px solid #d0d7de;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #24292f;
    font-weight: 500;
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
</style> 