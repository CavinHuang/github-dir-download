<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { ui } from '../stores/uiStore.js';
  import { ErrorHandler } from '../utils/error-utils.js';
  import { ErrorType } from '../types/ui.js';

  const dispatch = createEventDispatcher();

  let hasError = false;
  let errorInfo: any = null;

  function handleError(error: any): void {
    console.error('ErrorBoundary caught an error:', error);
    
    hasError = true;
    errorInfo = {
      message: error?.message || '未知错误',
      stack: error?.stack,
      timestamp: new Date().toISOString()
    };

    // 使用ErrorHandler处理错误
    const appError = ErrorHandler.handle(error, 'ErrorBoundary');
    
    // 显示用户友好的错误通知
    ui.showErrorNotification(
      '应用错误',
      appError.message,
      0 // 不自动消失
    );

    dispatch('error', { error, errorInfo });
  }

  function handleReset(): void {
    hasError = false;
    errorInfo = null;
    dispatch('reset');
  }

  function handleReload(): void {
    window.location.reload();
  }

  // 监听全局错误
  function handleGlobalError(event: ErrorEvent): void {
    handleError(event.error || new Error(event.message));
  }

  function handleUnhandledRejection(event: PromiseRejectionEvent): void {
    handleError(event.reason || new Error('Unhandled Promise Rejection'));
  }

  onMount(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  });

  onDestroy(() => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  });
</script>

{#if hasError}
  <div class="error-boundary">
    <div class="error-container">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z"/>
        </svg>
      </div>
      
      <div class="error-content">
        <h2>出现了一个错误</h2>
        <p>很抱歉，应用遇到了一个意外错误。您可以尝试以下操作：</p>
        
        <div class="error-actions">
          <button class="action-btn primary" on:click={handleReset}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1.076l.812-.195a.5.5 0 01.196.98l-1.5.363a.5.5 0 01-.632-.317L6.5 4.5a.5.5 0 01.883-.356L8 4.883V3z"/>
            </svg>
            重试
          </button>
          
          <button class="action-btn secondary" on:click={handleReload}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L8.75 7.19V4.5a.75.75 0 00-1.5 0v2.69L5.28 5.22a.75.75 0 00-1.06 1.06l3.25 3.25a.75.75 0 001.06 0l3.25-3.25z"/>
            </svg>
            刷新页面
          </button>
        </div>

        {#if errorInfo}
          <details class="error-details">
            <summary>错误详情</summary>
            <div class="error-info">
              <div class="error-field">
                <strong>错误信息:</strong>
                <code>{errorInfo.message}</code>
              </div>
              
              <div class="error-field">
                <strong>时间:</strong>
                <code>{errorInfo.timestamp}</code>
              </div>
              
              {#if errorInfo.stack}
                <div class="error-field">
                  <strong>堆栈跟踪:</strong>
                  <pre class="error-stack">{errorInfo.stack}</pre>
                </div>
              {/if}
            </div>
          </details>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .error-container {
    max-width: 500px;
    margin: 2rem;
    padding: 2rem;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .error-icon {
    color: #d1242f;
    margin-bottom: 1.5rem;
  }

  .error-content h2 {
    color: #24292f;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
  }

  .error-content p {
    color: #656d76;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 2rem 0;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .action-btn {
    padding: 0.75rem 1.5rem;
    border: 1px solid;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
    text-decoration: none;
  }

  .action-btn.primary {
    background: #1f883d;
    border-color: #1f883d;
    color: white;
  }

  .action-btn.primary:hover {
    background: #1a7f37;
    border-color: #1a7f37;
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

  .error-details {
    text-align: left;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    overflow: hidden;
  }

  .error-details summary {
    padding: 0.75rem;
    background: #f6f8fa;
    cursor: pointer;
    font-weight: 500;
    color: #24292f;
    border-bottom: 1px solid #d0d7de;
  }

  .error-details summary:hover {
    background: #f1f3f4;
  }

  .error-info {
    padding: 1rem;
  }

  .error-field {
    margin-bottom: 1rem;
  }

  .error-field:last-child {
    margin-bottom: 0;
  }

  .error-field strong {
    display: block;
    color: #24292f;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .error-field code {
    display: block;
    background: #f6f8fa;
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.8125rem;
    color: #24292f;
    word-break: break-word;
  }

  .error-stack {
    background: #f6f8fa;
    padding: 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #656d76;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
    margin: 0;
  }
</style> 