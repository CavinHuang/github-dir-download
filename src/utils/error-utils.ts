import type { AppError } from '../types/ui.js';
import { ErrorType } from '../types/ui.js';

export class ErrorHandler {
  static createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };
  }

  static handle(error: Error, context: string): AppError {
    console.error(`[${context}] Error:`, error);
    
    if (error.message.includes('rate limit')) {
      return this.createError(
        ErrorType.API_RATE_LIMIT,
        'GitHub API调用次数超限，请稍后重试',
        { originalError: error.message }
      );
    }
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return this.createError(
        ErrorType.INVALID_TOKEN,
        'GitHub Token无效，请重新设置',
        { originalError: error.message }
      );
    }
    
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return this.createError(
        ErrorType.INVALID_REPO,
        '仓库或文件夹不存在',
        { originalError: error.message }
      );
    }
    
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return this.createError(
        ErrorType.NETWORK_ERROR,
        '网络连接错误，请检查网络连接',
        { originalError: error.message }
      );
    }
    
    return this.createError(
      ErrorType.DOWNLOAD_FAILED,
      error.message || '未知错误',
      { originalError: error.message }
    );
  }

  static isRecoverable(error: AppError): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.API_RATE_LIMIT
    ].includes(error.type);
  }

  static getRetryDelay(error: AppError): number {
    switch (error.type) {
      case ErrorType.API_RATE_LIMIT:
        return 60000; // 1 minute
      case ErrorType.NETWORK_ERROR:
        return 5000; // 5 seconds
      default:
        return 0;
    }
  }

  static getUserMessage(error: AppError): string {
    return error.message;
  }
} 