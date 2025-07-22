// 导出所有stores和相关类型
export * from './tokenStore.js';
export * from './downloadStore.js';
export * from './settingsStore.js';
export * from './uiStore.js';

// 初始化所有stores的函数
import { token } from './tokenStore.js';
import { download } from './downloadStore.js';
import { settings } from './settingsStore.js';

export async function initializeStores(): Promise<void> {
  try {
    // 并行初始化所有stores
    await Promise.all([
      token.init(),
      download.init(),
      settings.init()
    ]);
    console.log('所有stores初始化完成');
  } catch (error) {
    console.error('stores初始化失败:', error);
  }
} 