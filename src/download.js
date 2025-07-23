// 下载管理器 - 简化版本

class DownloadManager {
  constructor() {
    this.isDownloading = false;
    this.currentProgress = null;
  }

  // 开始下载
  async startDownload(token, repoInfo, onProgress) {
    if (this.isDownloading) {
      throw new Error('已有下载任务在进行中');
    }

    this.isDownloading = true;
    this.currentProgress = { current: 0, total: 0, stage: 'init' };

    try {
      // 检查必要的库
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip库未加载');
      }
      if (typeof saveAs === 'undefined') {
        throw new Error('FileSaver库未加载');
      }

      // 创建GitHub API客户端
      const api = new GitHubAPI(token);

      // 阶段1: 验证Token
      this.updateProgress('验证Token...', 0, 0, onProgress);
      const isValidToken = await api.validateToken();
      if (!isValidToken) {
        throw new Error('GitHub Token无效或已过期');
      }

      // 阶段2: 获取文件列表
      this.updateProgress('获取文件列表...', 0, 0, onProgress);
      const files = await api.getAllFiles(
        repoInfo.owner, 
        repoInfo.repo, 
        repoInfo.path, 
        repoInfo.branch
      );

      if (files.length === 0) {
        throw new Error('没有找到可下载的文件');
      }

      console.log(`找到 ${files.length} 个文件`);

      // 阶段3: 下载文件内容
      this.updateProgress('下载文件中...', 0, files.length, onProgress);
      
      const fileContents = await api.downloadFiles(files, (progress) => {
        this.updateProgress(
          `下载文件: ${progress.fileName}`,
          progress.current,
          progress.total,
          onProgress
        );
      });

      // 阶段4: 创建ZIP文件
      this.updateProgress('创建ZIP文件...', 0, 0, onProgress);
      const zipBlob = await this.createZipFile(fileContents, repoInfo);

      // 阶段5: 保存文件
      this.updateProgress('保存文件...', 0, 0, onProgress);
      const filename = this.getDownloadFilename(repoInfo);
      saveAs(zipBlob, filename);

      this.updateProgress('下载完成', 1, 1, onProgress);

      return {
        success: true,
        filename: filename,
        fileCount: fileContents.length,
        size: zipBlob.size
      };

    } catch (error) {
      console.error('下载失败:', error);
      throw error;
    } finally {
      this.isDownloading = false;
      this.currentProgress = null;
    }
  }

  // 创建ZIP文件
  async createZipFile(fileContents, repoInfo) {
    const zip = new JSZip();
    
    // 创建根文件夹
    const rootFolder = repoInfo.path || repoInfo.repo;
    
    fileContents.forEach(file => {
      // 确保文件路径正确
      let filePath = file.path;
      
      // 如果是特定路径的下载，需要调整文件结构
      if (repoInfo.path) {
        // 移除路径前缀，保持相对结构
        if (filePath.startsWith(repoInfo.path + '/')) {
          filePath = filePath.substring(repoInfo.path.length + 1);
        }
      }
      
      // 添加文件到ZIP
      zip.file(filePath, file.content, { 
        base64: true,
        createFolders: true 
      });
    });

    // 生成ZIP文件
    return await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
  }

  // 获取下载文件名
  getDownloadFilename(repoInfo) {
    let filename;
    
    if (repoInfo.path) {
      // 如果是文件夹下载，使用文件夹名
      const pathParts = repoInfo.path.split('/');
      filename = pathParts[pathParts.length - 1];
    } else {
      // 如果是整个仓库，使用仓库名
      filename = repoInfo.repo;
    }
    
    // 添加分支信息（如果不是main分支）
    if (repoInfo.branch && repoInfo.branch !== 'main') {
      filename += `-${repoInfo.branch}`;
    }
    
    return `${filename}.zip`;
  }

  // 更新进度
  updateProgress(message, current, total, onProgress) {
    this.currentProgress = {
      message: message,
      current: current,
      total: total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0
    };

    if (onProgress) {
      onProgress(this.currentProgress);
    }

    console.log(`Progress: ${message} (${current}/${total})`);
  }

  // 获取当前进度
  getCurrentProgress() {
    return this.currentProgress;
  }

  // 是否正在下载
  isCurrentlyDownloading() {
    return this.isDownloading;
  }

  // 取消下载（简单实现，实际场景中可能需要更复杂的逻辑）
  cancelDownload() {
    // 注意：由于现代浏览器的限制，实际上很难真正取消已经开始的网络请求
    // 这里只是标记状态，实际的取消需要在请求层面实现
    console.log('尝试取消下载...');
    this.isDownloading = false;
    this.currentProgress = null;
  }
}

// 工具函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 工具函数：估算下载时间
function estimateDownloadTime(totalBytes, downloadedBytes, startTime) {
  const elapsed = Date.now() - startTime;
  const rate = downloadedBytes / elapsed; // bytes per ms
  const remaining = totalBytes - downloadedBytes;
  return remaining / rate; // ms
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DownloadManager, formatFileSize, estimateDownloadTime };
} else if (typeof window !== 'undefined') {
  window.DownloadManager = DownloadManager;
  window.formatFileSize = formatFileSize;
  window.estimateDownloadTime = estimateDownloadTime;
}