import type { RepoInfo, RepoAnalysis, GitHubContent, FileTreeNode } from '../../types/github.js';
import { GitHubClient } from './GitHubClient.js';
import { DOWNLOAD_LIMITS } from '../../constants/api.js';
import { FileUtils } from '../../utils/file-utils.js';
import { ErrorHandler } from '../../utils/error-utils.js';

export class RepoAnalyzer {
  private githubClient: GitHubClient;

  constructor(githubClient: GitHubClient) {
    this.githubClient = githubClient;
  }

  async analyzeRepo(repoInfo: RepoInfo): Promise<RepoAnalysis> {
    try {
      // 获取所有文件
      const allFiles = await this.githubClient.getAllFilesInDirectory(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.path,
        repoInfo.branch,
        DOWNLOAD_LIMITS.MAX_FILES
      );

      // 分析文件
      const analysis = this.analyzeFiles(allFiles);
      
      return {
        ...analysis,
        estimatedDownloadTime: this.estimateDownloadTime(analysis.totalSize)
      };
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'RepoAnalyzer.analyzeRepo');
    }
  }

  async estimateDownloadSize(repoInfo: RepoInfo): Promise<number> {
    try {
      const files = await this.githubClient.getAllFilesInDirectory(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.path,
        repoInfo.branch,
        DOWNLOAD_LIMITS.MAX_FILES
      );

      return files.reduce((total: number, file: GitHubContent) => total + (file.size || 0), 0);
    } catch (error) {
      console.error('估算下载大小失败:', error);
      return 0;
    }
  }

  async getFileTree(repoInfo: RepoInfo): Promise<FileTreeNode[]> {
    try {
      const contents = await this.githubClient.getRepoContents(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.path,
        repoInfo.branch
      );

      const tree: FileTreeNode[] = [];

      for (const item of contents) {
        const node: FileTreeNode = {
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size
        };

        if (item.type === 'dir') {
          // 递归获取子目录（限制深度避免无限递归）
          node.children = await this.getSubDirectory(repoInfo, item.path, 1, 3);
        }

        tree.push(node);
      }

      return tree;
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'RepoAnalyzer.getFileTree');
    }
  }

  private async getSubDirectory(
    repoInfo: RepoInfo,
    path: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<FileTreeNode[]> {
    if (currentDepth > maxDepth) {
      return [];
    }

    try {
      const contents = await this.githubClient.getRepoContents(
        repoInfo.owner,
        repoInfo.repo,
        path,
        repoInfo.branch
      );

      const children: FileTreeNode[] = [];

      for (const item of contents) {
        const node: FileTreeNode = {
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size
        };

        if (item.type === 'dir') {
          node.children = await this.getSubDirectory(repoInfo, item.path, currentDepth + 1, maxDepth);
        }

        children.push(node);
      }

      return children;
    } catch (error) {
      console.warn(`获取子目录失败 ${path}:`, error);
      return [];
    }
  }

  private analyzeFiles(files: GitHubContent[]): Omit<RepoAnalysis, 'estimatedDownloadTime'> {
    const fileTypes: Record<string, number> = {};
    let totalSize = 0;
    const largeFiles: GitHubContent[] = [];

    for (const file of files) {
      if (file.type !== 'file') continue;

      const size = file.size || 0;
      totalSize += size;

      // 分析文件类型
      const extension = this.getFileExtension(file.name);
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;

      // 标记大文件（>10MB）
      if (size > 10 * 1024 * 1024) {
        largeFiles.push(file);
      }
    }

    // 按大小排序大文件
    largeFiles.sort((a, b) => (b.size || 0) - (a.size || 0));

    return {
      totalFiles: files.length,
      totalSize,
      fileTypes,
      largeFiles: largeFiles.slice(0, 10) // 只保留前10个最大的文件
    };
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return 'no-extension';
    
    const extension = filename.slice(lastDotIndex + 1).toLowerCase();
    return extension || 'no-extension';
  }

  private estimateDownloadTime(totalSize: number): number {
    // 假设平均下载速度为1MB/s
    const averageSpeed = 1024 * 1024; // 1MB/s in bytes
    return Math.ceil(totalSize / averageSpeed);
  }

  async validateRepoAccess(repoInfo: RepoInfo): Promise<{ 
    accessible: boolean; 
    error?: string;
    suggestions?: string[];
  }> {
    try {
      // 尝试访问仓库根目录
      await this.githubClient.getRepoContents(
        repoInfo.owner,
        repoInfo.repo,
        '',
        repoInfo.branch
      );

      // 如果指定了路径，验证路径是否存在
      if (repoInfo.path) {
        await this.githubClient.getRepoContents(
          repoInfo.owner,
          repoInfo.repo,
          repoInfo.path,
          repoInfo.branch
        );
      }

      return { accessible: true };
    } catch (error) {
      const errorMessage = (error as any).message || '未知错误';
      const suggestions: string[] = [];

      if (errorMessage.includes('404')) {
        suggestions.push('检查仓库名称和分支是否正确');
        suggestions.push('确认仓库是公开的或您有访问权限');
        if (repoInfo.path) {
          suggestions.push('检查文件夹路径是否存在');
        }
      } else if (errorMessage.includes('403')) {
        suggestions.push('检查GitHub Token权限');
        suggestions.push('确认Token有访问此仓库的权限');
      }

      return {
        accessible: false,
        error: errorMessage,
        suggestions
      };
    }
  }

  // 检查下载限制
  checkDownloadLimits(analysis: RepoAnalysis): {
    canDownload: boolean;
    warnings: string[];
    blockers: string[];
  } {
    const warnings: string[] = [];
    const blockers: string[] = [];

    // 检查文件数量
    if (analysis.totalFiles > DOWNLOAD_LIMITS.MAX_FILES) {
      blockers.push(`文件数量(${analysis.totalFiles})超过限制(${DOWNLOAD_LIMITS.MAX_FILES})`);
    } else if (analysis.totalFiles > DOWNLOAD_LIMITS.MAX_FILES * 0.8) {
      warnings.push(`文件数量较多(${analysis.totalFiles})，下载可能较慢`);
    }

    // 检查总大小
    if (analysis.totalSize > DOWNLOAD_LIMITS.MAX_TOTAL_SIZE) {
      blockers.push(`总大小(${FileUtils.formatFileSize(analysis.totalSize)})超过限制(${FileUtils.formatFileSize(DOWNLOAD_LIMITS.MAX_TOTAL_SIZE)})`);
    } else if (analysis.totalSize > DOWNLOAD_LIMITS.MAX_TOTAL_SIZE * 0.8) {
      warnings.push(`文件总大小较大(${FileUtils.formatFileSize(analysis.totalSize)})，下载可能较慢`);
    }

    // 检查大文件
    const oversizeFiles = analysis.largeFiles.filter(
      file => (file.size || 0) > DOWNLOAD_LIMITS.MAX_FILE_SIZE
    );
    
    if (oversizeFiles.length > 0) {
      warnings.push(`包含${oversizeFiles.length}个超大文件，可能无法下载`);
    }

    return {
      canDownload: blockers.length === 0,
      warnings,
      blockers
    };
  }
} 