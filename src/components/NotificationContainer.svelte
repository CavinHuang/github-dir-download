<script lang="ts">
  import { ui } from '../stores/uiStore.js';
  import { slide } from 'svelte/transition';

  // 订阅通知状态
  $: notifications = $ui.notifications;

  function dismissNotification(id: string) {
    ui.removeNotification(id);
  }

  function getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return `<path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>`;
      case 'error':
        return `<path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z"/>`;
      case 'warning':
        return `<path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>`;
      case 'info':
        return `<path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/>`;
      default:
        return `<path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/>`;
    }
  }

  function getNotificationColor(type: string): string {
    switch (type) {
      case 'success': return '#1f883d';
      case 'error': return '#d1242f';
      case 'warning': return '#d1242f';
      case 'info': return '#0969da';
      default: return '#656d76';
    }
  }
</script>

<div class="notification-container">
  {#each notifications as notification (notification.id)}
    <div 
      class="notification notification-{notification.type}"
      transition:slide={{ duration: 300 }}
    >
      <div class="notification-icon" style="color: {getNotificationColor(notification.type)}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          {@html getNotificationIcon(notification.type)}
        </svg>
      </div>
      
      <div class="notification-content">
        <div class="notification-title">{notification.title}</div>
        <div class="notification-message">{notification.message}</div>
        
        {#if notification.actions && notification.actions.length > 0}
          <div class="notification-actions">
            {#each notification.actions as action}
              <button class="action-link" on:click={action.action}>
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      
      <button 
        class="notification-dismiss" 
        on:click={() => dismissNotification(notification.id)}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 1000;
    pointer-events: none;
  }

  .notification {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .notification-success {
    border-left: 4px solid #1f883d;
  }

  .notification-error {
    border-left: 4px solid #d1242f;
  }

  .notification-warning {
    border-left: 4px solid #d1242f;
  }

  .notification-info {
    border-left: 4px solid #0969da;
  }

  .notification-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
    margin-bottom: 0.25rem;
  }

  .notification-message {
    font-size: 0.8125rem;
    color: #656d76;
    line-height: 1.4;
  }

  .notification-actions {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.75rem;
  }

  .action-link {
    background: none;
    border: none;
    color: #0969da;
    font-size: 0.8125rem;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .action-link:hover {
    color: #0550ae;
  }

  .notification-dismiss {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    color: #656d76;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .notification-dismiss:hover {
    background: #f6f8fa;
    color: #24292f;
  }
</style> 