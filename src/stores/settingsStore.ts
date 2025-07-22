import { writable, derived } from 'svelte/store';
import type { UserSettings } from '../types/storage.js';
import { DEFAULT_SETTINGS } from '../types/storage.js';
import { SettingsManager } from '../services/storage/SettingsManager.js';
import { ErrorHandler } from '../utils/error-utils.js';

export interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  storageUsage: { used: number; total: number } | null;
}

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  error: null,
  storageUsage: null
};

// 创建可写的store
const settingsStore = writable<SettingsState>(initialState);

// 获取SettingsManager实例
const settingsManager = SettingsManager.getInstance();

// 导出的store操作
export const settings = {
  // 订阅store状态
  subscribe: settingsStore.subscribe,

  // 初始化：从存储中加载设置
  async init(): Promise<void> {
    try {
      settingsStore.update(state => ({ ...state, isLoading: true, error: null }));
      
      const [savedSettings, storageUsage] = await Promise.all([
        settingsManager.getSettings(),
        settingsManager.getStorageUsage()
      ]);

      settingsStore.update(state => ({
        ...state,
        settings: savedSettings,
        isLoading: false,
        storageUsage,
        isDirty: false
      }));
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'settingsStore.init');
      settingsStore.update(state => ({
        ...state,
        isLoading: false,
        error: appError.message
      }));
    }
  },

  // 更新设置（本地更新，不立即保存）
  updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
    settingsStore.update(state => ({
      ...state,
      settings: {
        ...state.settings,
        [key]: value
      },
      isDirty: true,
      error: null
    }));
  },

  // 批量更新设置
  updateSettings(newSettings: Partial<UserSettings>): void {
    settingsStore.update(state => ({
      ...state,
      settings: {
        ...state.settings,
        ...newSettings
      },
      isDirty: true,
      error: null
    }));
  },

  // 保存设置到存储
  async save(): Promise<{ success: boolean; error?: string }> {
    try {
      settingsStore.update(state => ({ ...state, isSaving: true, error: null }));

      const currentState = await new Promise<SettingsState>(resolve => {
        const unsubscribe = settingsStore.subscribe(state => {
          unsubscribe();
          resolve(state);
        });
      });

      await settingsManager.updateSettings(currentState.settings);
      
      // 更新存储使用情况
      const storageUsage = await settingsManager.getStorageUsage();

      settingsStore.update(state => ({
        ...state,
        isSaving: false,
        isDirty: false,
        storageUsage
      }));

      return { success: true };
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'settingsStore.save');
      settingsStore.update(state => ({
        ...state,
        isSaving: false,
        error: appError.message
      }));
      return { success: false, error: appError.message };
    }
  },

  // 重置设置为默认值
  async resetToDefaults(): Promise<{ success: boolean; error?: string }> {
    try {
      settingsStore.update(state => ({ ...state, isSaving: true, error: null }));

      await settingsManager.resetSettings();
      
      settingsStore.update(state => ({
        ...state,
        settings: DEFAULT_SETTINGS,
        isSaving: false,
        isDirty: false
      }));

      return { success: true };
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'settingsStore.resetToDefaults');
      settingsStore.update(state => ({
        ...state,
        isSaving: false,
        error: appError.message
      }));
      return { success: false, error: appError.message };
    }
  },

  // 丢弃未保存的更改
  async discardChanges(): Promise<void> {
    try {
      const savedSettings = await settingsManager.getSettings();
      settingsStore.update(state => ({
        ...state,
        settings: savedSettings,
        isDirty: false,
        error: null
      }));
    } catch (error) {
      console.error('丢弃更改失败:', error);
    }
  },

  // 导出设置
  async exportSettings(): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const data = await settingsManager.exportData();
      return { success: true, data };
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'settingsStore.exportSettings');
      return { success: false, error: appError.message };
    }
  },

  // 导入设置
  async importSettings(jsonData: string): Promise<{ success: boolean; error?: string }> {
    try {
      settingsStore.update(state => ({ ...state, isSaving: true, error: null }));

      await settingsManager.importData(jsonData);
      
      // 重新加载设置
      const newSettings = await settingsManager.getSettings();
      const storageUsage = await settingsManager.getStorageUsage();

      settingsStore.update(state => ({
        ...state,
        settings: newSettings,
        isSaving: false,
        isDirty: false,
        storageUsage
      }));

      return { success: true };
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'settingsStore.importSettings');
      settingsStore.update(state => ({
        ...state,
        isSaving: false,
        error: appError.message
      }));
      return { success: false, error: appError.message };
    }
  },

  // 刷新存储使用情况
  async refreshStorageUsage(): Promise<void> {
    try {
      const storageUsage = await settingsManager.getStorageUsage();
      settingsStore.update(state => ({
        ...state,
        storageUsage
      }));
    } catch (error) {
      console.error('刷新存储使用情况失败:', error);
    }
  },

  // 清除错误
  clearError(): void {
    settingsStore.update(state => ({ ...state, error: null }));
  }
};

// 派生状态：是否有未保存的更改
export const hasUnsavedChanges = derived(
  settingsStore,
  $settings => $settings.isDirty
);

// 派生状态：是否正在处理
export const isProcessing = derived(
  settingsStore,
  $settings => $settings.isLoading || $settings.isSaving
);

// 派生状态：存储使用百分比
export const storageUsagePercentage = derived(
  settingsStore,
  $settings => {
    if (!$settings.storageUsage) return 0;
    return Math.round(($settings.storageUsage.used / $settings.storageUsage.total) * 100);
  }
);

// 派生状态：是否接近存储限制
export const isStorageNearLimit = derived(
  settingsStore,
  $settings => {
    if (!$settings.storageUsage) return false;
    const percentage = ($settings.storageUsage.used / $settings.storageUsage.total) * 100;
    return percentage > 80; // 超过80%时警告
  }
);

// 派生状态：下载限制文本
export const downloadLimitsText = derived(
  settingsStore,
  $settings => {
    const s = $settings.settings;
    return {
      maxFileSize: `${Math.round(s.maxFileSize / (1024 * 1024))}MB`,
      maxTotalSize: `${Math.round(s.maxTotalSize / (1024 * 1024 * 1024))}GB`,
      maxFiles: s.maxFiles.toString(),
      concurrentDownloads: s.concurrentDownloads.toString()
    };
  }
); 