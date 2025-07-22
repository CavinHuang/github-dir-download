<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GitHubUser, RateLimit } from '../types/github.js';
  import { FileUtils } from '../utils/file-utils.js';

  export let userInfo: GitHubUser | null;
  export let rateLimit: RateLimit | null;
  export let isNearLimit: boolean;

  const dispatch = createEventDispatcher();

  function handleRefresh() {
    dispatch('refresh');
  }

  function handleLogout() {
    dispatch('logout');
  }

  function handleSettings() {
    dispatch('settings');
  }

  $: remainingCalls = rateLimit?.remaining || 0;
  $: resetTime = rateLimit ? new Date(rateLimit.reset * 1000) : null;
</script>

<div class="user-panel">
  <div class="user-info">
    {#if userInfo}
      <div class="user-avatar">
        {#if userInfo.avatar_url}
          <img src={userInfo.avatar_url} alt={userInfo.login} />
        {:else}
          <div class="avatar-placeholder">
            {userInfo.login.charAt(0).toUpperCase()}
          </div>
        {/if}
      </div>
      
      <div class="user-details">
        <div class="username">{userInfo.name || userInfo.login}</div>
        <div class="login">@{userInfo.login}</div>
      </div>
    {:else}
      <div class="user-loading">
        <div class="loading-skeleton"></div>
      </div>
    {/if}
  </div>

  <div class="rate-limit" class:warning={isNearLimit}>
    <div class="rate-limit-text">
      <span class="remaining">{remainingCalls}</span>
      <span class="total">/ {rateLimit?.limit || 5000}</span>
    </div>
    <div class="rate-limit-label">API 调用</div>
    {#if resetTime}
      <div class="reset-time">
        重置: {resetTime.toLocaleTimeString()}
      </div>
    {/if}
  </div>

  <div class="actions">
    <button 
      class="action-btn" 
      on:click={handleRefresh}
      title="刷新用户信息"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4v1.076l.812-.195a.5.5 0 01.196.98l-1.5.363a.5.5 0 01-.632-.317L6.5 4.5a.5.5 0 01.883-.356L8 4.883V3z"/>
      </svg>
    </button>
    
    <button 
      class="action-btn" 
      on:click={handleSettings}
      title="设置"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2.5 8a5.5 5.5 0 1111 0 5.5 5.5 0 01-11 0z"/>
        <path d="M8 6.25a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z"/>
      </svg>
    </button>
    
    <button 
      class="action-btn logout" 
      on:click={handleLogout}
      title="退出登录"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5l-1.97-1.97a.75.75 0 00-1.06 1.06L10.69 7.5H6a.75.75 0 000 1.5h4.69l-1.22 1.22a.75.75 0 101.06 1.06l2.5-2.5a.75.75 0 000-1.06z"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .user-panel {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    gap: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: #d0d7de;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0969da;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-details {
    min-width: 0;
    flex: 1;
  }

  .username {
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .login {
    font-size: 0.75rem;
    color: #656d76;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-loading {
    width: 120px;
    height: 32px;
  }

  .loading-skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #d0d7de 25%, #f6f8fa 50%, #d0d7de 75%);
    background-size: 200% 100%;
    animation: loading 2s infinite;
    border-radius: 4px;
  }

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .rate-limit {
    text-align: center;
    font-size: 0.75rem;
    min-width: 60px;
  }

  .rate-limit.warning {
    color: #d1242f;
  }

  .rate-limit-text {
    font-weight: 600;
    line-height: 1;
  }

  .remaining {
    font-size: 0.875rem;
  }

  .total {
    color: #656d76;
  }

  .rate-limit-label {
    color: #656d76;
    font-size: 0.625rem;
    margin-top: 0.125rem;
  }

  .reset-time {
    color: #656d76;
    font-size: 0.625rem;
    margin-top: 0.125rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: white;
    color: #656d76;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #f6f8fa;
    border-color: #8c959f;
    color: #24292f;
  }

  .action-btn.logout:hover {
    background: #ffebe9;
    border-color: #ffccd1;
    color: #d1242f;
  }
</style> 