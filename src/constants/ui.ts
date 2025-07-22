export const UI_CONSTANTS = {
  NOTIFICATION_DURATION: 5000, // 5 seconds
  PROGRESS_UPDATE_INTERVAL: 500, // 500ms
  BUTTON_SELECTOR: '.Box-header .d-flex',
  BUTTON_ID: 'github-dir-download-btn',
  BUTTON_CLASS: 'btn btn-sm btn-outline',
} as const;

export const MESSAGES = {
  TOKEN_REQUIRED: '请设置GitHub Personal Access Token',
  TOKEN_INVALID: 'GitHub Token无效，请重新设置',
  DOWNLOAD_STARTED: '开始下载文件夹',
  DOWNLOAD_COMPLETED: '文件夹下载完成',
  DOWNLOAD_FAILED: '下载失败',
  RATE_LIMIT_EXCEEDED: 'GitHub API调用次数超限',
  NETWORK_ERROR: '网络连接错误',
  INVALID_REPO: '无效的仓库或文件夹',
} as const;

export const GITHUB_PATTERNS = {
  REPO_URL: /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/(?:tree|blob)\/([^\/]+)(?:\/(.*))?)?$/,
  FOLDER_URL: /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)(?:\/(.*))?$/,
} as const; 