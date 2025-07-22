export class FileUtils {
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static calculateSpeed(bytesTransferred: number, timeElapsed: number): number {
    if (timeElapsed === 0) return 0;
    return bytesTransferred / (timeElapsed / 1000); // bytes per second
  }

  static formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  static estimateTimeRemaining(totalBytes: number, transferredBytes: number, speed: number): number {
    if (speed === 0) return 0;
    const remainingBytes = totalBytes - transferredBytes;
    return remainingBytes / speed; // seconds
  }

  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return Math.round(seconds) + 's';
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  static isValidFileName(fileName: string): boolean {
    // Check for invalid characters in file names
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    return !invalidChars.test(fileName) && fileName.length > 0 && fileName.length <= 255;
  }

  static sanitizeFileName(fileName: string): string {
    // Replace invalid characters with underscores
    return fileName.replace(/[<>:"|?*\x00-\x1f]/g, '_').slice(0, 255);
  }

  static getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'xml': 'application/xml',
      'csv': 'text/csv',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static generateFileName(repoOwner: string, repoName: string, path: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = path ? path.replace(/\//g, '-') : 'root';
    return `${repoOwner}-${repoName}-${folderName}-${timestamp}.zip`;
  }
} 