import { writable, derived } from 'svelte/store';
import type { ViewType, UIState, AppError, Notification } from '../types/ui.js';
import { ErrorType } from '../types/ui.js';

const initialState: UIState = {
  currentView: 'setup',
  isLoading: false,
  error: null,
  notifications: [],
  theme: 'auto'
};

// 创建可写的store
const uiStore = writable<UIState>(initialState);

// 导出的store操作
export const ui = {
  // 订阅store状态
  subscribe: uiStore.subscribe,

  // 设置当前视图
  setView(view: ViewType): void {
    uiStore.update(state => ({
      ...state,
      currentView: view,
      error: null // 切换视图时清除错误
    }));
  },

  // 设置加载状态
  setLoading(isLoading: boolean): void {
    uiStore.update(state => ({
      ...state,
      isLoading
    }));
  },

  // 设置错误
  setError(error: AppError | null): void {
    uiStore.update(state => ({
      ...state,
      error,
      isLoading: false // 出错时停止加载
    }));
  },

  // 创建并显示错误
  showError(type: ErrorType, message: string, details?: any): void {
    const error: AppError = {
      type,
      message,
      details,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };
    this.setError(error);
  },

  // 清除错误
  clearError(): void {
    uiStore.update(state => ({
      ...state,
      error: null
    }));
  },

  // 添加通知
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): void {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    uiStore.update(state => ({
      ...state,
      notifications: [...state.notifications, newNotification]
    }));

    // 自动移除通知（如果设置了duration）
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, notification.duration);
    }
  },

  // 显示成功通知
  showSuccess(title: string, message: string, duration: number = 3000): void {
    this.addNotification({
      type: 'success',
      title,
      message,
      duration
    });
  },

  // 显示警告通知
  showWarning(title: string, message: string, duration: number = 5000): void {
    this.addNotification({
      type: 'warning',
      title,
      message,
      duration
    });
  },

  // 显示信息通知
  showInfo(title: string, message: string, duration: number = 4000): void {
    this.addNotification({
      type: 'info',
      title,
      message,
      duration
    });
  },

  // 显示错误通知
  showErrorNotification(title: string, message: string, duration: number = 6000): void {
    this.addNotification({
      type: 'error',
      title,
      message,
      duration
    });
  },

  // 移除通知
  removeNotification(id: string): void {
    uiStore.update(state => ({
      ...state,
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  // 清除所有通知
  clearNotifications(): void {
    uiStore.update(state => ({
      ...state,
      notifications: []
    }));
  },

  // 设置主题
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    uiStore.update(state => ({
      ...state,
      theme
    }));
  },

  // 重置UI状态
  reset(): void {
    uiStore.set(initialState);
  },

  // 批量更新状态
  updateState(updates: Partial<UIState>): void {
    uiStore.update(state => ({
      ...state,
      ...updates
    }));
  }
};

// 派生状态：是否显示错误
export const hasError = derived(
  uiStore,
  $ui => $ui.error !== null
);

// 派生状态：错误信息
export const errorMessage = derived(
  uiStore,
  $ui => $ui.error?.message || ''
);

// 派生状态：是否有通知
export const hasNotifications = derived(
  uiStore,
  $ui => $ui.notifications.length > 0
);

// 派生状态：通知数量
export const notificationCount = derived(
  uiStore,
  $ui => $ui.notifications.length
);

// 派生状态：最新通知
export const latestNotification = derived(
  uiStore,
  $ui => $ui.notifications[0] || null
);

// 派生状态：错误通知
export const errorNotifications = derived(
  uiStore,
  $ui => $ui.notifications.filter(n => n.type === 'error')
);

// 派生状态：当前视图是否为设置页面
export const isSetupView = derived(
  uiStore,
  $ui => $ui.currentView === 'setup'
);

// 派生状态：当前视图是否为主页面
export const isMainView = derived(
  uiStore,
  $ui => $ui.currentView === 'main'
);

// 派生状态：当前视图是否为进度页面
export const isProgressView = derived(
  uiStore,
  $ui => $ui.currentView === 'progress'
);

// 派生状态：当前视图是否为设置页面
export const isSettingsView = derived(
  uiStore,
  $ui => $ui.currentView === 'settings'
);

// 派生状态：页面标题
export const pageTitle = derived(
  uiStore,
  $ui => {
    switch ($ui.currentView) {
      case 'setup':
        return 'GitHub Token 设置';
      case 'main':
        return 'GitHub 文件夹下载';
      case 'progress':
        return '下载进度';
      case 'settings':
        return '设置';
      default:
        return 'GitHub 文件夹下载';
    }
  }
); 