<script lang="ts">
  import { settings, hasUnsavedChanges, downloadLimitsText } from '../stores/settingsStore.js';
  import { ui } from '../stores/uiStore.js';
  import { token } from '../stores/tokenStore.js';
  import { FileUtils } from '../utils/file-utils.js';

  // 订阅设置状态
  $: settingsState = $settings;
  $: userSettings = settingsState.settings;
  $: isSaving = settingsState.isSaving;
  $: limitsText = $downloadLimitsText;

  let activeTab: 'download' | 'storage' | 'about' = 'download';

  function handleBack() {
    if ($hasUnsavedChanges) {
      if (confirm('有未保存的更改，确定要离开吗？')) {
        settings.discardChanges();
        ui.setView('main');
      }
    } else {
      ui.setView('main');
    }
  }

  async function handleSave() {
    const result = await settings.save();
    if (result.success) {
      ui.showSuccess('设置已保存', '您的设置已成功保存');
    } else {
      ui.showErrorNotification('保存失败', result.error || '保存设置时发生错误');
    }
  }

  async function handleReset() {
    if (confirm('确定要重置所有设置为默认值吗？')) {
      const result = await settings.resetToDefaults();
      if (result.success) {
        ui.showSuccess('设置已重置', '所有设置已重置为默认值');
      } else {
        ui.showErrorNotification('重置失败', result.error || '重置设置时发生错误');
      }
    }
  }

  async function handleExport() {
    const result = await settings.exportSettings();
    if (result.success && result.data) {
      const blob = new Blob([result.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `github-dir-download-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ui.showSuccess('导出成功', '设置文件已下载');
    } else {
      ui.showErrorNotification('导出失败', result.error || '导出设置时发生错误');
    }
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as string;
          const result = await settings.importSettings(data);
          if (result.success) {
            ui.showSuccess('导入成功', '设置已成功导入');
          } else {
            ui.showErrorNotification('导入失败', result.error || '导入设置时发生错误');
          }
        } catch (error) {
          ui.showErrorNotification('导入失败', '设置文件格式不正确');
        }
      };
      reader.readAsText(file);
    }
    // 清空文件选择，以便重复选择同一文件
    input.value = '';
  }

  function handleLogout() {
    if (confirm('确定要退出登录吗？这将清除您的GitHub Token。')) {
      token.clearToken();
      ui.setView('setup');
      ui.showInfo('已退出', '已清除GitHub Token');
    }
  }

  function formatBytes(bytes: number): string {
    return FileUtils.formatFileSize(bytes);
  }
</script>

<div class="settings-container">
  <!-- 头部 -->
  <div class="settings-header">
    <button class="back-btn" on:click={handleBack}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06L6.72 3.47a.75.75 0 011.06 1.06L4.56 7.75h7.69a.75.75 0 010 1.5H4.56l3.22 3.22a.75.75 0 010 1.06z"/>
      </svg>
      返回
    </button>
    
    <h2>设置</h2>
  </div>

  <!-- Tab导航 -->
  <div class="tab-nav">
    <button 
      class="tab-btn" 
      class:active={activeTab === 'download'}
      on:click={() => activeTab = 'download'}
    >
      下载设置
    </button>
    
    <button 
      class="tab-btn" 
      class:active={activeTab === 'storage'}
      on:click={() => activeTab = 'storage'}
    >
      数据管理
    </button>
    
    <button 
      class="tab-btn" 
      class:active={activeTab === 'about'}
      on:click={() => activeTab = 'about'}
    >
      关于
    </button>
  </div>

  <!-- 设置内容 -->
  <div class="settings-content">
    {#if activeTab === 'download'}
      <div class="setting-section">
        <h3>下载限制</h3>
        
        <div class="setting-item">
          <label for="max-file-size">单个文件最大大小</label>
          <div class="input-with-unit">
            <input
              id="max-file-size"
              type="number"
              min="1"
              max="1024"
              bind:value={userSettings.maxFileSize}
              on:input={() => settings.updateSetting('maxFileSize', userSettings.maxFileSize * 1024 * 1024)}
            />
            <span class="unit">MB</span>
          </div>
          <small>当前设置：{limitsText.maxFileSize}</small>
        </div>

        <div class="setting-item">
          <label for="max-total-size">总下载大小限制</label>
          <div class="input-with-unit">
            <input
              id="max-total-size"
              type="number"
              min="1"
              max="10"
              bind:value={userSettings.maxTotalSize}
              on:input={() => settings.updateSetting('maxTotalSize', userSettings.maxTotalSize * 1024 * 1024 * 1024)}
            />
            <span class="unit">GB</span>
          </div>
          <small>当前设置：{limitsText.maxTotalSize}</small>
        </div>

        <div class="setting-item">
          <label for="max-files">最大文件数量</label>
          <input
            id="max-files"
            type="number"
            min="1"
            max="10000"
            bind:value={userSettings.maxFiles}
            on:input={() => settings.updateSetting('maxFiles', userSettings.maxFiles)}
          />
          <small>单次下载的最大文件数量</small>
        </div>

        <div class="setting-item">
          <label for="concurrent-downloads">并发下载数</label>
          <input
            id="concurrent-downloads"
            type="number"
            min="1"
            max="20"
            bind:value={userSettings.concurrentDownloads}
            on:input={() => settings.updateSetting('concurrentDownloads', userSettings.concurrentDownloads)}
          />
          <small>同时下载的文件数量，过高可能影响性能</small>
        </div>
      </div>

      <div class="setting-section">
        <h3>过滤设置</h3>
        
        <div class="setting-item">
          <label>
            <input
              type="checkbox"
              bind:checked={userSettings.includeHiddenFiles}
              on:change={() => settings.updateSetting('includeHiddenFiles', userSettings.includeHiddenFiles)}
            />
            包含隐藏文件
          </label>
          <small>是否下载以 . 开头的隐藏文件</small>
        </div>

        <div class="setting-item">
          <label for="exclude-patterns">排除模式</label>
          <textarea
            id="exclude-patterns"
            placeholder="每行一个模式，支持通配符"
            value={userSettings.excludePatterns.join('\n')}
            on:input={(e) => {
              const patterns = e.target.value.split('\n').filter(p => p.trim());
              settings.updateSetting('excludePatterns', patterns);
            }}
          ></textarea>
          <small>匹配的文件/文件夹将被跳过</small>
        </div>
      </div>

    {:else if activeTab === 'storage'}
      <div class="setting-section">
        <h3>存储使用情况</h3>
        
        {#if settingsState.storageUsage}
          <div class="storage-info">
            <div class="storage-bar">
              <div 
                class="storage-fill" 
                style="width: {(settingsState.storageUsage.used / settingsState.storageUsage.total) * 100}%"
              ></div>
            </div>
            <div class="storage-text">
              {formatBytes(settingsState.storageUsage.used)} / {formatBytes(settingsState.storageUsage.total)}
            </div>
          </div>
        {/if}
      </div>

      <div class="setting-section">
        <h3>数据管理</h3>
        
        <div class="action-group">
          <button class="action-btn" on:click={handleExport}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 1.25a.75.75 0 00-1.5 0V7.31L5.22 5.53a.75.75 0 00-1.06 1.06l3.25 3.25c.3.3.77.3 1.06 0l3.25-3.25a.75.75 0 00-1.06-1.06L8.5 7.31V1.25z"/>
              <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z"/>
            </svg>
            导出设置
          </button>
          
          <button class="action-btn" on:click={() => document.getElementById('file-input')?.click()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.47 1.78a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L8.5 3.87V9.5a.75.75 0 01-1.5 0V3.87L4.28 6.59a.75.75 0 01-1.06-1.06L7.47 1.78z"/>
              <path d="M1 9.5a.75.75 0 01.75.75v1.5c0 .69.56 1.25 1.25 1.25h10c.69 0 1.25-.56 1.25-1.25v-1.5a.75.75 0 011.5 0v1.5A2.75 2.75 0 0113 14.25H3A2.75 2.75 0 01.25 11.75v-1.5A.75.75 0 011 9.5z"/>
            </svg>
            导入设置
          </button>
          
          <input
            id="file-input"
            type="file"
            accept=".json"
            style="display: none"
            on:change={handleFileSelect}
          />
        </div>
      </div>

      <div class="setting-section danger">
        <h3>危险操作</h3>
        
        <div class="action-group">
          <button class="action-btn danger" on:click={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 010 1.5h-2.5a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h2.5a.75.75 0 010 1.5h-2.5A1.75 1.75 0 012 13.25V2.75zm10.44 4.5l-1.97-1.97a.75.75 0 00-1.06 1.06L10.69 7.5H6a.75.75 0 000 1.5h4.69l-1.22 1.22a.75.75 0 101.06 1.06l2.5-2.5a.75.75 0 000-1.06z"/>
            </svg>
            退出登录
          </button>
        </div>
      </div>

    {:else if activeTab === 'about'}
      <div class="setting-section">
        <div class="about-content">
          <div class="app-info">
            <img src="/icon-with-shadow.svg" alt="GitHub Dir Download" class="app-icon" />
            <h3>GitHub 文件夹下载器</h3>
            <p class="version">版本 1.0.0</p>
          </div>
          
          <div class="description">
            <p>一个便捷的浏览器插件，用于从GitHub仓库下载指定文件夹的内容，并打包为ZIP文件。</p>
          </div>
          
          <div class="features">
            <h4>主要功能</h4>
            <ul>
              <li>支持下载GitHub仓库中的任意文件夹</li>
              <li>自动打包为ZIP文件</li>
              <li>可配置的下载限制和过滤规则</li>
              <li>实时下载进度显示</li>
              <li>下载历史记录</li>
            </ul>
          </div>
          
          <div class="links">
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">
              获取GitHub Token
            </a>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- 底部操作栏 -->
  {#if activeTab === 'download' && $hasUnsavedChanges}
    <div class="settings-footer">
      <button class="footer-btn secondary" on:click={() => settings.discardChanges()}>
        丢弃更改
      </button>
      
      <button class="footer-btn" on:click={handleReset}>
        重置默认
      </button>
      
      <button 
        class="footer-btn primary" 
        on:click={handleSave}
        disabled={isSaving}
      >
        {#if isSaving}
          <span class="loading-spinner"></span>
          保存中...
        {:else}
          保存设置
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .settings-container {
    width: 400px;
    min-height: 500px;
    background: white;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .settings-header {
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

  .settings-header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #24292f;
  }

  .tab-nav {
    display: flex;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
  }

  .tab-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: none;
    color: #656d76;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .tab-btn:hover {
    background: rgba(175, 184, 193, 0.1);
    color: #24292f;
  }

  .tab-btn.active {
    color: #0969da;
    border-bottom-color: #0969da;
    background: white;
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .setting-section {
    margin-bottom: 2rem;
  }

  .setting-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #24292f;
  }

  .setting-section.danger h3 {
    color: #d1242f;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

  .setting-item label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #24292f;
    margin-bottom: 0.5rem;
  }

  .setting-item input[type="checkbox"] {
    margin-right: 0.5rem;
  }

  .setting-item input[type="number"], 
  .setting-item textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
  }

  .setting-item textarea {
    min-height: 80px;
    resize: vertical;
    font-family: monospace;
  }

  .input-with-unit {
    display: flex;
    align-items: center;
  }

  .input-with-unit input {
    flex: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
  }

  .unit {
    padding: 0.5rem 0.75rem;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-left: none;
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
    font-size: 0.875rem;
    color: #656d76;
  }

  .setting-item small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #656d76;
  }

  .storage-info {
    margin-bottom: 1rem;
  }

  .storage-bar {
    width: 100%;
    height: 8px;
    background: #d0d7de;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .storage-fill {
    height: 100%;
    background: #0969da;
  }

  .storage-text {
    font-size: 0.75rem;
    color: #656d76;
    text-align: center;
  }

  .action-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.75rem 1rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    color: #24292f;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: white;
    border-color: #8c959f;
  }

  .action-btn.danger {
    background: #ffebe9;
    border-color: #ffccd1;
    color: #d1242f;
  }

  .action-btn.danger:hover {
    background: #ffd8d3;
    border-color: #ffb3ba;
  }

  .about-content {
    text-align: center;
  }

  .app-info {
    margin-bottom: 2rem;
  }

  .app-icon {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
  }

  .app-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #24292f;
  }

  .version {
    margin: 0;
    font-size: 0.875rem;
    color: #656d76;
  }

  .description {
    margin-bottom: 2rem;
    text-align: left;
  }

  .description p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #24292f;
  }

  .features {
    text-align: left;
    margin-bottom: 2rem;
  }

  .features h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #24292f;
  }

  .features ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    color: #656d76;
    line-height: 1.5;
  }

  .features li {
    margin-bottom: 0.25rem;
  }

  .links a {
    color: #0969da;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .links a:hover {
    text-decoration: underline;
  }

  .settings-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border-top: 1px solid #d0d7de;
    background: #f6f8fa;
  }

  .footer-btn {
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

  .footer-btn.primary {
    background: #0969da;
    border-color: #0969da;
    color: white;
  }

  .footer-btn.primary:hover:not(:disabled) {
    background: #0550ae;
    border-color: #0550ae;
  }

  .footer-btn.secondary {
    background: #f6f8fa;
    border-color: #d0d7de;
    color: #24292f;
  }

  .footer-btn.secondary:hover {
    background: white;
    border-color: #8c959f;
  }

  .footer-btn:not(.primary):not(.secondary) {
    background: #d1242f;
    border-color: #d1242f;
    color: white;
  }

  .footer-btn:not(.primary):not(.secondary):hover {
    background: #a40e26;
    border-color: #a40e26;
  }

  .footer-btn:disabled {
    opacity: 0.6;
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
</style> 