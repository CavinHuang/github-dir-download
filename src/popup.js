// Popup脚本 - 简化版本

class PopupManager {
  constructor() {
    this.tokenInput = document.getElementById('token-input');
    this.saveTokenBtn = document.getElementById('save-token-btn');
    this.tokenStatus = document.getElementById('token-status');
    this.pageStatus = document.getElementById('page-status');
    this.tokenValidity = document.getElementById('token-validity');
    this.clearDataBtn = document.getElementById('clear-data-btn');
    
    this.init();
  }

  async init() {
    // 绑定事件
    this.saveTokenBtn.addEventListener('click', () => this.saveToken());
    this.clearDataBtn.addEventListener('click', () => this.clearData());
    this.tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveToken();
      }
    });

    // 加载现有数据
    await this.loadExistingData();
    
    // 检查当前页面状态
    await this.checkCurrentPage();
  }

  async loadExistingData() {
    try {
      // 获取存储的Token
      const token = await this.getStoredToken();
      if (token) {
        this.tokenInput.value = token;
        this.updateTokenStatus('saved', '已保存');
        
        // 验证Token
        const isValid = await this.validateToken(token);
        this.updateTokenValidity(isValid);
      } else {
        this.updateTokenStatus('empty', '未设置');
        this.updateTokenValidity(false);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      this.updateTokenStatus('error', '加载失败');
    }
  }

  async saveToken() {
    const token = this.tokenInput.value.trim();
    
    if (!token) {
      this.showMessage('请输入Token', 'error');
      return;
    }

    // 基本格式验证
    if (!this.isValidTokenFormat(token)) {
      this.showMessage('Token格式无效', 'error');
      return;
    }

    this.updateTokenStatus('validating', '验证中...');
    this.saveTokenBtn.disabled = true;

    try {
      // 验证Token
      const isValid = await this.validateToken(token);
      
      if (isValid) {
        // 保存Token
        await this.storeToken(token);
        this.updateTokenStatus('valid', '有效');
        this.updateTokenValidity(true);
        this.showMessage('Token保存成功', 'success');
      } else {
        this.updateTokenStatus('invalid', '无效');
        this.updateTokenValidity(false);
        this.showMessage('Token无效或已过期', 'error');
      }
    } catch (error) {
      console.error('Token验证失败:', error);
      this.updateTokenStatus('error', '验证失败');
      this.showMessage('验证失败: ' + error.message, 'error');
    } finally {
      this.saveTokenBtn.disabled = false;
    }
  }

  async validateToken(token) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_TOKEN',
        token: token
      });
      
      return response && response.success && response.valid;
    } catch (error) {
      console.error('Token验证通信失败:', error);
      return false;
    }
  }

  async getStoredToken() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('github_token', (result) => {
        resolve(result.github_token || null);
      });
    });
  }

  async storeToken(token) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ github_token: token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async clearData() {
    if (!confirm('确定要清除所有数据吗？')) {
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      // 重置UI
      this.tokenInput.value = '';
      this.updateTokenStatus('empty', '未设置');
      this.updateTokenValidity(false);
      this.showMessage('数据已清除', 'success');
      
    } catch (error) {
      console.error('清除数据失败:', error);
      this.showMessage('清除失败: ' + error.message, 'error');
    }
  }

  async checkCurrentPage() {
    try {
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      if (tabs[0]) {
        const url = tabs[0].url;
        if (url.includes('github.com')) {
          const isRepoPage = /github\.com\/[^\/]+\/[^\/]+/.test(url);
          if (isRepoPage) {
            this.updatePageStatus('GitHub仓库页面 ✓', 'success');
          } else {
            this.updatePageStatus('GitHub页面', 'info');
          }
        } else {
          this.updatePageStatus('非GitHub页面', 'warning');
        }
      } else {
        this.updatePageStatus('无法检测', 'error');
      }
    } catch (error) {
      console.error('检查页面失败:', error);
      this.updatePageStatus('检测失败', 'error');
    }
  }

  updateTokenStatus(type, text) {
    this.tokenStatus.textContent = text;
    this.tokenStatus.className = `status-indicator ${type}`;
  }

  updateTokenValidity(isValid) {
    this.tokenValidity.textContent = isValid ? '有效 ✓' : '无效或未设置';
    this.tokenValidity.className = isValid ? 'valid' : 'invalid';
  }

  updatePageStatus(text, type) {
    this.pageStatus.textContent = text;
    this.pageStatus.className = type;
  }

  isValidTokenFormat(token) {
    // GitHub tokens start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]+)$/.test(token);
  }

  showMessage(message, type) {
    // 创建消息提示
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      background: ${type === 'error' ? '#d1242f' : type === 'success' ? '#1f883d' : '#0969da'};
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(messageDiv);

    // 3秒后移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});