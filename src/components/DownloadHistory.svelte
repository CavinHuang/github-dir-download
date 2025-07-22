<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DownloadRecord } from '../types/storage.js';
  import { FileUtils } from '../utils/file-utils.js';

  export let history: DownloadRecord[];

  const dispatch = createEventDispatcher();

  function handleRetry(record: DownloadRecord) {
    dispatch('retry', record);
  }

  function handleClear() {
    if (confirm('确定要清除所有下载历史吗？')) {
      dispatch('clear');
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#1f883d';
      case 'failed': return '#d1242f';
      case 'cancelled': return '#656d76';
      default: return '#656d76';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return status;
    }
  }
</script>

<div class="download-history">
  <div class="history-header">
    <h3>下载历史</h3>
    {#if history.length > 0}
      <button class="clear-btn" on:click={handleClear}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149L10.844 13.5a.25.25 0 01-.249.219H5.405a.25.25 0 01-.249-.219L4.496 6.675z"/>
        </svg>
        清空
      </button>
    {/if}
  </div>

  {#if history.length === 0}
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>
      </svg>
      <h4>暂无下载历史</h4>
      <p>您的下载记录将显示在这里</p>
    </div>
  {:else}
    <div class="history-list">
      {#each history as record (record.id)}
        <div class="history-item">
          <div class="item-header">
            <div class="repo-info">
              <span class="repo-name">{record.repoInfo.owner}/{record.repoInfo.repo}</span>
              {#if record.repoInfo.path}
                <span class="repo-path">/{record.repoInfo.path}</span>
              {/if}
            </div>
            
            <div class="status" style="color: {getStatusColor(record.status)}">
              {getStatusText(record.status)}
            </div>
          </div>

          <div class="item-details">
            <div class="details-row">
              <span class="label">时间：</span>
              <span class="value">{formatDate(record.timestamp)}</span>
            </div>
            
            <div class="details-row">
              <span class="label">文件：</span>
              <span class="value">{record.fileCount} 个</span>
            </div>
            
            <div class="details-row">
              <span class="label">大小：</span>
              <span class="value">{FileUtils.formatFileSize(record.totalSize)}</span>
            </div>
            
            <div class="details-row">
              <span class="label">耗时：</span>
              <span class="value">{FileUtils.formatDuration(record.duration / 1000)}</span>
            </div>

            {#if record.error}
              <div class="error-info">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z"/>
                </svg>
                <span>{record.error}</span>
              </div>
            {/if}
          </div>

          {#if record.status === 'failed'}
            <div class="item-actions">
              <button class="retry-btn" on:click={() => handleRetry(record)}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1.076l.812-.195a.5.5 0 01.196.98l-1.5.363a.5.5 0 01-.632-.317L6.5 4.5a.5.5 0 01.883-.356L8 4.883V3z"/>
                </svg>
                重试
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .download-history {
    padding: 1rem;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .history-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #24292f;
  }

  .clear-btn {
    padding: 0.375rem 0.75rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    color: #656d76;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: all 0.2s;
  }

  .clear-btn:hover {
    background: #ffebe9;
    border-color: #ffccd1;
    color: #d1242f;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #656d76;
  }

  .empty-state svg {
    opacity: 0.3;
    margin-bottom: 1rem;
  }

  .empty-state h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #24292f;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .history-item {
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 0.75rem;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .repo-info {
    flex: 1;
    min-width: 0;
  }

  .repo-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
  }

  .repo-path {
    font-size: 0.75rem;
    color: #656d76;
    margin-left: 0.25rem;
  }

  .status {
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .item-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 1rem;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .details-row {
    display: flex;
    align-items: center;
  }

  .label {
    color: #656d76;
    margin-right: 0.5rem;
  }

  .value {
    color: #24292f;
  }

  .error-info {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #d1242f;
    background: #ffebe9;
    padding: 0.375rem 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .item-actions {
    border-top: 1px solid #d0d7de;
    padding-top: 0.5rem;
    margin-top: 0.5rem;
  }

  .retry-btn {
    padding: 0.375rem 0.75rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    color: #24292f;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: all 0.2s;
  }

  .retry-btn:hover {
    background: white;
    border-color: #0969da;
    color: #0969da;
  }
</style> 