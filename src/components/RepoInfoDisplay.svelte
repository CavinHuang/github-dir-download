<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { RepoInfo } from '../types/github.js';

  export let repoInfo: RepoInfo | null;
  export let isAnalyzing: boolean = false;

  const dispatch = createEventDispatcher();

  function handleAnalyze() {
    dispatch('analyze');
  }

  function getBranchColor(branch: string): string {
    if (branch === 'main' || branch === 'master') return '#1f883d';
    if (branch.includes('dev') || branch.includes('develop')) return '#0969da';
    if (branch.includes('test') || branch.includes('staging')) return '#d1242f';
    return '#656d76';
  }
</script>

<div class="repo-info">
  {#if repoInfo}
    <div class="repo-header">
      <div class="repo-icon">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
        </svg>
      </div>
      
      <div class="repo-details">
        <div class="repo-name">
          <span class="owner">{repoInfo.owner}</span>
          <span class="separator">/</span>
          <span class="name">{repoInfo.repo}</span>
        </div>
        
        <div class="repo-meta">
          <div class="branch" style="color: {getBranchColor(repoInfo.branch)}">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
            </svg>
            {repoInfo.branch}
          </div>
          
          {#if repoInfo.path}
            <div class="path">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
              </svg>
              /{repoInfo.path}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="repo-url">
      <a href={repoInfo.url} target="_blank" rel="noopener">
        {repoInfo.url}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.75 2a.75.75 0 01.75.75v7.5a.75.75 0 01-1.5 0v-7.5A.75.75 0 013.75 2zM8.75 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018.75 6zM12.75 4a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 01.75-.75z"/>
        </svg>
      </a>
    </div>

    <div class="repo-actions">
      <button 
        class="analyze-btn"
        on:click={handleAnalyze}
        disabled={isAnalyzing}
      >
        {#if isAnalyzing}
          <span class="loading-spinner"></span>
          分析中...
        {:else}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM4 7.75A.75.75 0 014.75 7h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 014 7.75zm0 3.5a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"/>
          </svg>
          分析仓库
        {/if}
      </button>
    </div>
  {:else}
    <div class="no-repo">
      <div class="no-repo-icon">
        <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
        </svg>
      </div>
      <div class="no-repo-text">
        <h3>未检测到GitHub仓库</h3>
        <p>请访问GitHub仓库页面，或手动输入仓库信息</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .repo-info {
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    overflow: hidden;
  }

  .repo-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .repo-icon {
    color: #656d76;
    margin-top: 0.125rem;
  }

  .repo-details {
    flex: 1;
    min-width: 0;
  }

  .repo-name {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    word-break: break-word;
  }

  .owner {
    color: #0969da;
  }

  .separator {
    color: #656d76;
    margin: 0 0.25rem;
  }

  .name {
    color: #24292f;
  }

  .repo-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
  }

  .branch, .path {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #656d76;
  }

  .path {
    word-break: break-all;
  }

  .repo-url {
    padding: 0.75rem 1rem;
    background: #f6f8fa;
    border-top: 1px solid #d0d7de;
  }

  .repo-url a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #0969da;
    text-decoration: none;
    font-size: 0.75rem;
    word-break: break-all;
  }

  .repo-url a:hover {
    text-decoration: underline;
  }

  .repo-actions {
    padding: 0.75rem 1rem;
    border-top: 1px solid #d0d7de;
    background: #f6f8fa;
  }

  .analyze-btn {
    padding: 0.5rem 0.75rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    color: #24292f;
    font-size: 0.75rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .analyze-btn:hover:not(:disabled) {
    background: white;
    border-color: #8c959f;
  }

  .analyze-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 1px solid transparent;
    border-top: 1px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .no-repo {
    padding: 2rem 1rem;
    text-align: center;
    color: #656d76;
  }

  .no-repo-icon {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .no-repo-text h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
  }

  .no-repo-text p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
  }
</style> 