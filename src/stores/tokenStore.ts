import { writable, derived } from 'svelte/store';
import type { GitHubUser, RateLimit, TokenInfo } from '../types/github.js';
import { TokenManager } from '../services/storage/TokenManager.js';
import { ErrorHandler } from '../utils/error-utils.js';
import { ErrorType } from '../types/ui.js';

export interface TokenState {
  token: string | null;
  isValid: boolean;
  isValidating: boolean;
  userInfo: GitHubUser | null;
  rateLimit: RateLimit | null;
  lastValidated: number | null;
  error: string | null;
}

const initialState: TokenState = {
  token: null,
  isValid: false,
  isValidating: false,
  userInfo: null,
  rateLimit: null,
  lastValidated: null,
  error: null
};

// 创建可写的store
const tokenStore = writable<TokenState>(initialState);

// 获取TokenManager实例
const tokenManager = TokenManager.getInstance();

// 导出的store操作
export const token = {
  // 订阅store状态
  subscribe: tokenStore.subscribe,

  // 初始化：从存储中加载token
  async init(): Promise<void> {
    try {
      tokenStore.update(state => ({ ...state, isValidating: true, error: null }));
      
      const savedToken = await tokenManager.getToken();
      if (savedToken) {
        const isValid = await tokenManager.validateToken(savedToken);
        
        if (isValid) {
          const tokenInfo = await tokenManager.getTokenInfo();
          
          tokenStore.update(state => ({
            ...state,
            token: savedToken,
            isValid: true,
            isValidating: false,
            userInfo: tokenInfo ? {
              login: tokenInfo.login,
              id: 0, // TokenInfo中没有id，可以设为0或从其他API获取
              avatar_url: '',
              name: tokenInfo.login
            } : null,
            rateLimit: tokenInfo?.rateLimit || null,
            lastValidated: Date.now(),
            error: null
          }));
        } else {
          // Token无效，清除存储
          await tokenManager.clearToken();
          tokenStore.update(state => ({
            ...state,
            token: null,
            isValid: false,
            isValidating: false,
            error: 'Token已失效，请重新设置'
          }));
        }
      } else {
        tokenStore.update(state => ({
          ...state,
          isValidating: false
        }));
      }
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'tokenStore.init');
      tokenStore.update(state => ({
        ...state,
        isValidating: false,
        error: appError.message
      }));
    }
  },

  // 设置新token
  async setToken(newToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      tokenStore.update(state => ({ ...state, isValidating: true, error: null }));

      // 验证token
      const isValid = await tokenManager.validateToken(newToken);
      if (!isValid) {
        tokenStore.update(state => ({
          ...state,
          isValidating: false,
          error: 'Token无效，请检查后重试'
        }));
        return { success: false, error: 'Token无效' };
      }

      // 保存token
      await tokenManager.saveToken(newToken);
      
      // 获取用户信息和限制
      const tokenInfo = await tokenManager.getTokenInfo();
      
      tokenStore.update(state => ({
        ...state,
        token: newToken,
        isValid: true,
        isValidating: false,
        userInfo: tokenInfo ? {
          login: tokenInfo.login,
          id: 0,
          avatar_url: '',
          name: tokenInfo.login
        } : null,
        rateLimit: tokenInfo?.rateLimit || null,
        lastValidated: Date.now(),
        error: null
      }));

      return { success: true };
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'tokenStore.setToken');
      tokenStore.update(state => ({
        ...state,
        isValidating: false,
        error: appError.message
      }));
      return { success: false, error: appError.message };
    }
  },

  // 清除token
  async clearToken(): Promise<void> {
    try {
      await tokenManager.clearToken();
      tokenStore.set(initialState);
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'tokenStore.clearToken');
      tokenStore.update(state => ({
        ...state,
        error: appError.message
      }));
    }
  },

  // 刷新token信息
  async refresh(): Promise<void> {
    try {
      tokenStore.update(state => ({ ...state, isValidating: true, error: null }));
      
      const currentToken = await tokenManager.getToken();
      if (!currentToken) {
        tokenStore.update(state => ({
          ...state,
          isValidating: false,
          error: '未找到Token'
        }));
        return;
      }

      const isValid = await tokenManager.validateToken(currentToken);
      if (!isValid) {
        await this.clearToken();
        return;
      }

      const tokenInfo = await tokenManager.getTokenInfo();
      
      tokenStore.update(state => ({
        ...state,
        isValid: true,
        isValidating: false,
        userInfo: tokenInfo ? {
          login: tokenInfo.login,
          id: 0,
          avatar_url: '',
          name: tokenInfo.login
        } : state.userInfo,
        rateLimit: tokenInfo?.rateLimit || null,
        lastValidated: Date.now(),
        error: null
      }));
    } catch (error) {
      const appError = ErrorHandler.handle(error as Error, 'tokenStore.refresh');
      tokenStore.update(state => ({
        ...state,
        isValidating: false,
        error: appError.message
      }));
    }
  },

  // 检查权限
  async checkScopes(): Promise<boolean> {
    try {
      return await tokenManager.hasRequiredScopes();
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  },

  // 清除错误
  clearError(): void {
    tokenStore.update(state => ({ ...state, error: null }));
  }
};

// 派生状态：是否已设置有效token
export const isTokenReady = derived(
  tokenStore,
  $token => $token.isValid && $token.token !== null && !$token.isValidating
);

// 派生状态：是否需要设置token
export const needsTokenSetup = derived(
  tokenStore,
  $token => !$token.isValid && !$token.isValidating && $token.token === null
);

// 派生状态：API调用剩余次数
export const apiRemaining = derived(
  tokenStore,
  $token => $token.rateLimit?.remaining || 0
);

// 派生状态：是否接近API限制
export const isNearRateLimit = derived(
  tokenStore,
  $token => {
    if (!$token.rateLimit) return false;
    return $token.rateLimit.remaining < 100; // 少于100次调用时警告
  }
); 