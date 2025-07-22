import browser from 'webextension-polyfill';
import type { RepoInfo } from './types/github.js';
import { GitHubClient } from './services/github/GitHubClient.js';
import { RepoAnalyzer } from './services/github/RepoAnalyzer.js';
import { TokenManager } from './services/storage/TokenManager.js';
import { SettingsManager } from './services/storage/SettingsManager.js';
import { ErrorHandler } from './utils/error-utils.js';
import JSZip from 'jszip';

class BackgroundScript {
  private tokenManager: TokenManager;
  private settingsManager: SettingsManager;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    this.init();
  }

  private init(): void {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  private async handleMessage(message: any, sender: any, sendResponse: any): Promise<any> {
    console.log('GitHub Dir Download Background: 收到消息', message.type);
    
    try {
      switch (message.type) {
        case 'START_DOWNLOAD':
          return await this.handleStartDownload(message.repoInfo, message.options);
        case 'GET_CURRENT_REPO':
          return await this.handleGetCurrentRepo();
        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('GitHub Dir Download Background: 处理消息时发生错误', error);
      const appError = ErrorHandler.handle(error as Error, 'background.handleMessage');
      return { success: false, error: appError.message };
    }
  }

  private async handleStartDownload(repoInfo: RepoInfo, options?: any): Promise<any> {
    console.log('GitHub Dir Download Background: 开始处理下载请求', repoInfo);
    
    try {
      // 检查和验证token
      const token = await this.tokenManager.getToken();
      if (!token) {
        console.error('GitHub Dir Download Background: 未设置GitHub Token');
        return { success: false, error: '未设置GitHub Token' };
      }

      const isValidToken = await this.tokenManager.validateToken(token);
      if (!isValidToken) {
        console.error('GitHub Dir Download Background: Token无效');
        return { success: false, error: 'GitHub Token无效或已过期' };
      }

      // 开始下载流程
      await this.downloadDirectoryAsZip(repoInfo, token);

      console.log('GitHub Dir Download Background: 下载请求处理成功');
      return { 
        success: true, 
        analysis: {
          totalFiles: 0,
          totalSize: 0
        }
      };
    } catch (error) {
      console.error('GitHub Dir Download Background: 处理下载请求时发生错误', error);
      const appError = ErrorHandler.handle(error as Error, 'background.handleStartDownload');
      console.error('GitHub Dir Download Background: 处理后的错误信息', appError);
      
      // 更新按钮状态为错误
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_BUTTON_STATE',
            state: 'error'
          });
        }
      } catch (msgError) {
        console.log('更新按钮状态失败:', msgError);
      }
      
      return { 
        success: false, 
        error: appError.message, 
        details: error instanceof Error ? error.stack : String(error) 
      };
    }
  }

  private async downloadDirectoryAsZip(repoInfo: RepoInfo, token: string): Promise<void> {
    console.log('开始下载目录:', repoInfo);
    
    const zip = new JSZip();
    const downloadedFiles = new Set<string>();
    
    // 更新按钮状态
    await this.updateButtonState('downloading');
    
    // 递归获取所有文件
    await this.addDirectoryToZip(
      zip, 
      repoInfo.owner, 
      repoInfo.repo, 
      repoInfo.path || '', 
      repoInfo.branch || 'main',
      token,
      downloadedFiles,
      repoInfo.path || ''
    );
    
    console.log(`总计添加了 ${downloadedFiles.size} 个文件到ZIP`);
    
    if (downloadedFiles.size === 0) {
      throw new Error('没有找到文件可供下载');
    }
    
    // 生成ZIP文件
    console.log('正在生成ZIP文件...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    // 下载文件
    const folderName = repoInfo.path || repoInfo.repo;
    const fileName = `${folderName}-${Date.now()}.zip`;
    
    console.log(`开始下载ZIP文件: ${fileName}`);
    const url = URL.createObjectURL(zipBlob);
    
    await browser.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    });
    
    // 清理资源
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log('下载完成');
    await this.updateButtonState('ready');
  }

  private async addDirectoryToZip(
    zip: JSZip, 
    owner: string, 
    repo: string, 
    path: string, 
    branch: string,
    token: string,
    downloadedFiles: Set<string>,
    basePath: string,
    depth: number = 0
  ): Promise<void> {
    
    if (depth > 10) { // 防止无限递归
      console.warn('达到最大递归深度，跳过:', path);
      return;
    }
    
    console.log(`获取目录内容: ${path} (深度: ${depth})`);
    
    try {
      // 构建API URL
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Dir-Download-Extension'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API错误: ${response.status} ${response.statusText}`);
      }
      
      const contents = await response.json();
      const items = Array.isArray(contents) ? contents : [contents];
      
      console.log(`找到 ${items.length} 个项目在 ${path}`);
      
      // 限制文件数量
      const maxFiles = 20;
      let processedFiles = 0;
      
      for (const item of items) {
        if (processedFiles >= maxFiles) {
          console.log(`已达到最大文件数限制 (${maxFiles})，停止处理`);
          break;
        }
        
        if (item.type === 'file') {
          await this.addFileToZip(zip, item, basePath, downloadedFiles, token);
          processedFiles++;
        } else if (item.type === 'dir' && depth < 3) { // 限制目录深度
          await this.addDirectoryToZip(
            zip, 
            owner, 
            repo, 
            item.path, 
            branch,
            token,
            downloadedFiles,
            basePath,
            depth + 1
          );
        }
      }
    } catch (error) {
      console.error(`获取目录内容失败 ${path}:`, error);
    }
  }

  private async addFileToZip(
    zip: JSZip, 
    file: any, 
    basePath: string,
    downloadedFiles: Set<string>,
    token: string
  ): Promise<void> {
    
    if (downloadedFiles.has(file.path)) {
      return; // 避免重复下载
    }
    
    try {
      console.log(`下载文件: ${file.name}`);
      
      // 使用download_url直接下载文件内容
      const response = await fetch(file.download_url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'GitHub-Dir-Download-Extension'
        }
      });
      
      if (!response.ok) {
        throw new Error(`下载文件失败: ${response.status}`);
      }
      
      const content = await response.blob();
      
      // 计算相对路径
      let relativePath = file.path;
      if (basePath && relativePath.startsWith(basePath + '/')) {
        relativePath = relativePath.substring(basePath.length + 1);
      } else if (basePath && relativePath.startsWith(basePath)) {
        relativePath = relativePath.substring(basePath.length);
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.substring(1);
        }
      }
      
      // 添加到ZIP
      zip.file(relativePath || file.name, content);
      downloadedFiles.add(file.path);
      
      console.log(`文件已添加到ZIP: ${relativePath || file.name}`);
    } catch (error) {
      console.error(`下载文件失败 ${file.name}:`, error);
    }
  }

  private async updateButtonState(state: string): Promise<void> {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        browser.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_BUTTON_STATE',
          state: state
        });
      }
    } catch (error) {
      console.log('更新按钮状态失败:', error);
    }
  }

  private async handleGetCurrentRepo(): Promise<any> {
    try {
      // 获取当前活动标签页
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.url) {
        return { success: false, error: '无法获取当前页面信息' };
      }

      // 简单的GitHub URL解析
      const url = tabs[0].url;
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?/);
      
      if (!githubMatch) {
        return { success: false, error: '不是GitHub页面' };
      }

      const [, owner, repo, branch = 'main', path = ''] = githubMatch;
      
      return {
        success: true,
        repoInfo: {
          owner,
          repo,
          branch,
          path
        }
      };
    } catch (error) {
      console.error('获取当前仓库信息失败:', error);
      return { success: false, error: '获取页面信息失败' };
    }
  }
}

new BackgroundScript();
