import browser from 'webextension-polyfill';
import type { UserSettings, DownloadRecord } from '../../types/storage.js';
import { DEFAULT_SETTINGS } from '../../types/storage.js';
import { STORAGE_KEYS, STORAGE_DEFAULTS } from '../../constants/storage.js';
import { ErrorHandler } from '../../utils/error-utils.js';

export class SettingsManager {
  private static instance: SettingsManager;

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  async getSettings(): Promise<UserSettings> {
    try {
      const result = await browser.storage.sync.get(STORAGE_KEYS.SETTINGS);
      const savedSettings = result[STORAGE_KEYS.SETTINGS];
      
      if (!savedSettings) {
        // 如果没有保存的设置，返回默认设置并保存
        await this.updateSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      // 合并保存的设置和默认设置（处理新增的设置项）
      return {
        ...DEFAULT_SETTINGS,
        ...savedSettings
      };
    } catch (error) {
      console.error('获取设置失败:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = {
        ...currentSettings,
        ...settings
      };

      // 验证设置值
      this.validateSettings(newSettings);

      await browser.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: newSettings
      });
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.updateSettings');
    }
  }

  async resetSettings(): Promise<void> {
    try {
      await browser.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
      });
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.resetSettings');
    }
  }

  async getDownloadHistory(): Promise<DownloadRecord[]> {
    try {
      const result = await browser.storage.sync.get(STORAGE_KEYS.DOWNLOAD_HISTORY);
      return result[STORAGE_KEYS.DOWNLOAD_HISTORY] || [];
    } catch (error) {
      console.error('获取下载历史失败:', error);
      return [];
    }
  }

  async addDownloadRecord(record: DownloadRecord): Promise<void> {
    try {
      const history = await this.getDownloadHistory();
      
      // 添加新记录到开头
      history.unshift(record);
      
      // 限制历史记录数量
      if (history.length > STORAGE_DEFAULTS.MAX_HISTORY_RECORDS) {
        history.splice(STORAGE_DEFAULTS.MAX_HISTORY_RECORDS);
      }

      await browser.storage.sync.set({
        [STORAGE_KEYS.DOWNLOAD_HISTORY]: history
      });
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.addDownloadRecord');
    }
  }

  async clearDownloadHistory(): Promise<void> {
    try {
      await browser.storage.sync.remove(STORAGE_KEYS.DOWNLOAD_HISTORY);
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.clearDownloadHistory');
    }
  }

  async exportData(): Promise<string> {
    try {
      const [settings, history] = await Promise.all([
        this.getSettings(),
        this.getDownloadHistory()
      ]);

      const data = {
        settings,
        downloadHistory: history,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.exportData');
    }
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      // 验证数据结构
      if (!data.settings || !Array.isArray(data.downloadHistory)) {
        throw new Error('无效的数据格式');
      }

      // 验证设置
      this.validateSettings(data.settings);

      // 导入设置和历史记录
      await Promise.all([
        this.updateSettings(data.settings),
        browser.storage.sync.set({
          [STORAGE_KEYS.DOWNLOAD_HISTORY]: data.downloadHistory.slice(0, STORAGE_DEFAULTS.MAX_HISTORY_RECORDS)
        })
      ]);
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'SettingsManager.importData');
    }
  }

  private validateSettings(settings: UserSettings): void {
    if (settings.maxFileSize <= 0 || settings.maxFileSize > 1024 * 1024 * 1024) {
      throw new Error('最大文件大小必须在1B到1GB之间');
    }
    
    if (settings.maxTotalSize <= 0 || settings.maxTotalSize > 10 * 1024 * 1024 * 1024) {
      throw new Error('最大总大小必须在1B到10GB之间');
    }
    
    if (settings.maxFiles <= 0 || settings.maxFiles > 10000) {
      throw new Error('最大文件数量必须在1到10000之间');
    }
    
    if (settings.concurrentDownloads <= 0 || settings.concurrentDownloads > 20) {
      throw new Error('并发下载数量必须在1到20之间');
    }

    if (!Array.isArray(settings.excludePatterns)) {
      throw new Error('排除模式必须是数组');
    }
  }

  // 获取存储使用情况
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    try {
      if (browser.storage.sync.getBytesInUse) {
        const used = await browser.storage.sync.getBytesInUse();
        // Chrome sync storage限制为100KB
        return { used, total: 102400 };
      }
      return { used: 0, total: 102400 };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return { used: 0, total: 102400 };
    }
  }
} 