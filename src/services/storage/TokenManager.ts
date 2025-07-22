import browser from 'webextension-polyfill';
import type { TokenInfo, RateLimit } from '../../types/github.js';
import { STORAGE_KEYS, STORAGE_DEFAULTS } from '../../constants/storage.js';
import { GITHUB_API } from '../../constants/api.js';
import { URLUtils } from '../../utils/url-utils.js';
import { ErrorHandler } from '../../utils/error-utils.js';

export class TokenManager {
  private static instance: TokenManager;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  async saveToken(token: string): Promise<void> {
    try {
      if (!URLUtils.isValidGitHubToken(token)) {
        throw new Error('无效的GitHub Token格式');
      }

      await browser.storage.sync.set({
        [STORAGE_KEYS.TOKEN]: token,
        [STORAGE_KEYS.LAST_VALIDATION]: Date.now()
      });
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'TokenManager.saveToken');
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const result = await browser.storage.sync.get(STORAGE_KEYS.TOKEN);
      return result[STORAGE_KEYS.TOKEN] || null;
    } catch (error) {
      console.error('获取Token失败:', error);
      return null;
    }
  }

  async clearToken(): Promise<void> {
    try {
      await browser.storage.sync.remove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.LAST_VALIDATION
      ]);
    } catch (error) {
      throw ErrorHandler.handle(error as Error, 'TokenManager.clearToken');
    }
  }

  async validateToken(token?: string): Promise<boolean> {
    try {
      const tokenToValidate = token || await this.getToken();
      if (!tokenToValidate) {
        return false;
      }

      // 检查是否需要重新验证（避免频繁API调用）
      if (!token) {
        const lastValidation = await this.getLastValidation();
        const now = Date.now();
        if (lastValidation && (now - lastValidation) < STORAGE_DEFAULTS.TOKEN_VALIDATION_INTERVAL) {
          return true; // 假设在间隔时间内token仍然有效
        }
      }

      const response = await fetch(`${GITHUB_API.BASE_URL}${GITHUB_API.USER_ENDPOINT}`, {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Dir-Download-Extension/1.0.0'
        }
      });

      const isValid = response.ok;
      
      if (isValid && !token) {
        // 只有在验证现有token时才更新验证时间
        await browser.storage.sync.set({
          [STORAGE_KEYS.LAST_VALIDATION]: Date.now()
        });
      }

      return isValid;
    } catch (error) {
      console.error('验证Token失败:', error);
      return false;
    }
  }

  async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const token = await this.getToken();
      if (!token) {
        return null;
      }

      const [userResponse, rateLimitResponse] = await Promise.all([
        fetch(`${GITHUB_API.BASE_URL}${GITHUB_API.USER_ENDPOINT}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Dir-Download-Extension/1.0.0'
          }
        }),
        fetch(`${GITHUB_API.BASE_URL}${GITHUB_API.RATE_LIMIT_ENDPOINT}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'GitHub-Dir-Download-Extension/1.0.0'
          }
        })
      ]);

      if (!userResponse.ok || !rateLimitResponse.ok) {
        return null;
      }

      const userData = await userResponse.json();
      const rateLimitData = await rateLimitResponse.json();

      return {
        login: userData.login,
        scopes: this.extractScopesFromHeaders(userResponse.headers),
        rateLimit: rateLimitData.rate
      };
    } catch (error) {
      console.error('获取Token信息失败:', error);
      return null;
    }
  }

  private async getLastValidation(): Promise<number | null> {
    try {
      const result = await browser.storage.sync.get(STORAGE_KEYS.LAST_VALIDATION);
      return result[STORAGE_KEYS.LAST_VALIDATION] || null;
    } catch (error) {
      return null;
    }
  }

  private extractScopesFromHeaders(headers: Headers): string[] {
    const scopesHeader = headers.get('x-oauth-scopes');
    if (!scopesHeader) {
      return [];
    }
    return scopesHeader.split(',').map(scope => scope.trim()).filter(Boolean);
  }

  async hasRequiredScopes(): Promise<boolean> {
    try {
      const tokenInfo = await this.getTokenInfo();
      if (!tokenInfo) {
        return false;
      }

      // 检查是否有repo权限
      return tokenInfo.scopes.includes('repo') || tokenInfo.scopes.includes('public_repo');
    } catch (error) {
      console.error('检查权限失败:', error);
      return false;
    }
  }
} 