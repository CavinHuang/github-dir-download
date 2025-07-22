<script lang="ts">
  import { token, isTokenReady } from '../stores/tokenStore.js';
  import { ui } from '../stores/uiStore.js';
  import { URLUtils } from '../utils/url-utils.js';

  let tokenInput = '';
  let isSubmitting = false;
  let showHelp = false;
  let validationError = '';

  // 订阅token状态
  $: tokenState = $token;
  $: isValidating = tokenState.isValidating;
  $: tokenError = tokenState.error;

  // 监听token状态变化，如果设置成功则切换到主界面
  $: if ($isTokenReady) {
    ui.setView('main');
    ui.showSuccess('设置成功', 'GitHub Token已验证并保存');
  }

  async function handleSubmit() {
    if (!tokenInput.trim()) {
      validationError = '请输入GitHub Token';
      return;
    }

    // 验证token格式
    if (!URLUtils.isValidGitHubToken(tokenInput.trim())) {
      validationError = 'Token格式不正确。请确认您输入的是有效的GitHub Personal Access Token';
      return;
    }

    isSubmitting = true;
    validationError = '';

    try {
      const result = await token.setToken(tokenInput.trim());
      if (!result.success) {
        validationError = result.error || '设置Token失败';
      }
    } catch (error) {
      validationError = '网络错误，请稍后重试';
    } finally {
      isSubmitting = false;
    }
  }

  function clearError() {
    validationError = '';
    token.clearError();
  }

  function handleTokenInput(event: Event) {
    const input = event.target as HTMLInputElement;
    tokenInput = input.value;
    if (validationError) {
      clearError();
    }
  }

  function toggleHelp() {
    showHelp = !showHelp;
  }
</script>

<div class="token-setup">
  <div class="header">
    <img src="/icon-with-shadow.svg" alt="GitHub Dir Download" class="logo" />
    <h1>GitHub 文件夹下载器</h1>
    <p class="subtitle">设置 GitHub Personal Access Token 开始使用</p>
  </div>

  <div class="setup-form">
    <div class="form-group">
      <label for="token-input">GitHub Personal Access Token</label>
      <div class="input-wrapper">
        <input
          id="token-input"
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          bind:value={tokenInput}
          on:input={handleTokenInput}
          disabled={isSubmitting || isValidating}
          class:error={validationError || tokenError}
        />
        <button
          type="button"
          class="help-btn"
          on:click={toggleHelp}
          title="获取帮助"
        >
          ?
        </button>
      </div>
    </div>

    {#if validationError || tokenError}
      <div class="error-message">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z"/>
        </svg>
        {validationError || tokenError}
      </div>
    {/if}

    <button
      type="button"
      class="submit-btn"
      on:click={handleSubmit}
      disabled={!tokenInput.trim() || isSubmitting || isValidating}
    >
      {#if isSubmitting || isValidating}
        <span class="loading-spinner"></span>
        验证中...
      {:else}
        验证并保存
      {/if}
    </button>

    {#if showHelp}
      <div class="help-section">
        <h3>如何获取 GitHub Personal Access Token？</h3>
        <ol>
          <li>
            访问 <a href="https://github.com/settings/tokens" target="_blank" rel="noopener">
              GitHub Settings → Developer settings → Personal access tokens
            </a>
          </li>
          <li>点击 "Generate new token (classic)"</li>
          <li>设置 Token 名称，如 "GitHub Dir Download"</li>
          <li>选择过期时间（建议选择较长时间）</li>
          <li>
            勾选以下权限：
            <ul>
              <li><code>repo</code> - 访问仓库（必需）</li>
              <li><code>user:email</code> - 读取用户邮箱（可选）</li>
            </ul>
          </li>
          <li>点击 "Generate token" 生成</li>
          <li>复制生成的 Token（以 <code>ghp_</code> 开头）</li>
          <li>将 Token 粘贴到上方输入框中</li>
        </ol>
        
        <div class="security-note">
          <strong>安全提示：</strong>
          <ul>
            <li>Token 仅存储在您的本地浏览器中</li>
            <li>请妥善保管您的 Token，不要分享给他人</li>
            <li>如果 Token 泄露，请立即在 GitHub 中撤销</li>
          </ul>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .token-setup {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .logo {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
  }

  h1 {
    color: #24292f;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #656d76;
    font-size: 0.875rem;
    margin: 0;
  }

  .setup-form {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
    color: #24292f;
    margin-bottom: 0.5rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    flex: 1;
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.875rem;
    background: white;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
  }

  input.error {
    border-color: #da3633;
  }

  input:disabled {
    background: #f6f8fa;
    color: #656d76;
  }

  .help-btn {
    position: absolute;
    right: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid #d0d7de;
    border-radius: 50%;
    background: white;
    color: #656d76;
    font-size: 0.75rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .help-btn:hover {
    background: #f6f8fa;
    border-color: #0969da;
    color: #0969da;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #da3633;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: #ffebe9;
    border: 1px solid #ffccd1;
    border-radius: 6px;
  }

  .submit-btn {
    width: 100%;
    padding: 0.75rem;
    background: #1f883d;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background-color 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #1a7f37;
  }

  .submit-btn:disabled {
    background: #8c959f;
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

  .help-section {
    margin-top: 1.5rem;
    padding: 1rem;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .help-section h3 {
    color: #24292f;
    font-size: 1rem;
    margin: 0 0 1rem 0;
  }

  .help-section ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  .help-section li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .help-section ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .help-section a {
    color: #0969da;
    text-decoration: none;
  }

  .help-section a:hover {
    text-decoration: underline;
  }

  .help-section code {
    background: #f6f8fa;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.8125rem;
  }

  .security-note {
    background: #fff8c5;
    border: 1px solid #ffdf5d;
    border-radius: 6px;
    padding: 0.75rem;
    margin-top: 1rem;
  }

  .security-note strong {
    color: #9a6700;
  }

  .security-note ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .security-note li {
    margin-bottom: 0.25rem;
    color: #656d76;
  }
</style> 