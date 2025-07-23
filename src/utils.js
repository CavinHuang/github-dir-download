// 工具函数集合 - 简化版本

// URL解析工具
class URLUtils {
  // 解析GitHub URL
  static parseGitHubURL(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?/);
    if (!match) return null;

    const [, owner, repo, branch = 'main', path = ''] = match;
    
    return {
      owner,
      repo,
      path: path || '',
      branch: branch || 'main',
      url
    };
  }

  // 检查是否是GitHub仓库URL
  static isGitHubRepoURL(url) {
    return /github\.com\/[^\/]+\/[^\/]+/.test(url);
  }

  // 检查是否是GitHub文件夹URL
  static isGitHubFolderURL(url) {
    return /github\.com\/[^\/]+\/[^\/]+\/tree\//.test(url);
  }

  // 清理路径
  static sanitizePath(path) {
    return path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  // 获取文件扩展名
  static getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex + 1);
  }

  // 验证GitHub Token格式
  static isValidGitHubToken(token) {
    // GitHub tokens start with 'ghp_' (classic) or 'github_pat_' (fine-grained)
    return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]+)$/.test(token);
  }
}

// DOM操作工具
class DOMUtils {
  // 等待元素出现
  static waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 超时处理
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // 创建下载按钮
  static createButton(text, onClick, className = 'github-dir-download-btn') {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  // 创建加载动画
  static createLoadingSpinner() {
    const spinner = document.createElement('span');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '';
    return spinner;
  }

  // 显示通知
  static showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      color: white;
      background: ${type === 'error' ? '#d1242f' : type === 'success' ? '#1f883d' : '#0969da'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }
}

// 文件处理工具
class FileUtils {
  // 格式化文件大小
  static formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 检查文件类型
  static getFileType(filename) {
    const ext = URLUtils.getFileExtension(filename).toLowerCase();
    
    const types = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
      video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
      document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      code: ['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
    };

    for (const [type, extensions] of Object.entries(types)) {
      if (extensions.includes(ext)) {
        return type;
      }
    }

    return 'unknown';
  }

  // 检查是否是二进制文件
  static isBinaryFile(filename) {
    const binaryExts = [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'ico', 'tiff', 'svg',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv',
      'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
      'exe', 'dll', 'so', 'dylib', 'bin'
    ];
    
    const ext = URLUtils.getFileExtension(filename).toLowerCase();
    return binaryExts.includes(ext);
  }
}

// 存储工具
class StorageUtils {
  // 保存到本地存储
  static async save(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // 从本地存储读取
  static async load(key, defaultValue = null) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (result) => {
        resolve(result[key] || defaultValue);
      });
    });
  }

  // 删除存储项
  static async remove(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove(key, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  // 清空所有存储
  static async clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

// 时间工具
class TimeUtils {
  // 格式化时间
  static formatTime(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else if (ms < 3600000) {
      return `${(ms / 60000).toFixed(1)}m`;
    } else {
      return `${(ms / 3600000).toFixed(1)}h`;
    }
  }

  // 估算剩余时间
  static estimateRemainingTime(total, current, startTime) {
    if (current === 0) return '计算中...';
    
    const elapsed = Date.now() - startTime;
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    
    return this.formatTime(remaining);
  }

  // 获取友好的时间字符串
  static getFriendlyTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// 导出所有工具类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    URLUtils,
    DOMUtils,
    FileUtils,
    StorageUtils,
    TimeUtils
  };
} else if (typeof window !== 'undefined') {
  window.URLUtils = URLUtils;
  window.DOMUtils = DOMUtils;
  window.FileUtils = FileUtils;
  window.StorageUtils = StorageUtils;
  window.TimeUtils = TimeUtils;
}