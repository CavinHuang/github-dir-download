// GitHub API客户端 - 简化版本

class GitHubAPI {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://api.github.com';
  }

  // 获取仓库内容
  async getRepoContents(owner, repo, path = '', branch = 'main') {
    const url = `${this.baseURL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Dir-Download-Extension/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API错误: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // 递归获取所有文件
  async getAllFiles(owner, repo, path = '', branch = 'main') {
    const items = await this.getRepoContents(owner, repo, path, branch);
    const files = [];

    // 如果是单个文件，直接返回
    if (!Array.isArray(items)) {
      if (items.type === 'file') {
        return [items];
      }
      return [];
    }

    for (const item of items) {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.type === 'dir') {
        // 递归获取文件夹内容
        try {
          const subFiles = await this.getAllFiles(owner, repo, item.path, branch);
          files.push(...subFiles);
        } catch (error) {
          console.error(`获取文件夹内容失败: ${item.path}`, error);
        }
      }
    }

    return files;
  }

  // 下载文件内容
  async downloadFile(downloadUrl) {
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.status}`);
    }

    return await response.arrayBuffer();
  }

  // 批量下载文件
  async downloadFiles(files, onProgress) {
    const results = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const arrayBuffer = await this.downloadFile(file.download_url);
        const base64Content = this.arrayBufferToBase64(arrayBuffer);
        
        results.push({
          path: file.path,
          content: base64Content,
          size: file.size
        });

        // 报告进度
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            fileName: file.name,
            progress: Math.round(((i + 1) / total) * 100)
          });
        }

      } catch (error) {
        console.error(`下载文件失败: ${file.path}`, error);
        // 继续下载其他文件，不中断整个过程
      }
    }

    return results;
  }

  // ArrayBuffer转Base64
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    // 分块处理，避免栈溢出
    const chunkSize = 1024;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
  }

  // 验证Token
  async validateToken() {
    try {
      const response = await fetch(`${this.baseURL}/user`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token验证失败:', error);
      return false;
    }
  }

  // 获取用户信息
  async getUserInfo() {
    const response = await fetch(`${this.baseURL}/user`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('无法获取用户信息');
    }

    return await response.json();
  }

  // 获取速率限制信息
  async getRateLimit() {
    const response = await fetch(`${this.baseURL}/rate_limit`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('无法获取速率限制信息');
    }

    return await response.json();
  }
}

// 导出给其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubAPI;
} else if (typeof window !== 'undefined') {
  window.GitHubAPI = GitHubAPI;
}