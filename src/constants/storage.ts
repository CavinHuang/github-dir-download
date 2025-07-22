export const STORAGE_KEYS = {
  TOKEN: 'github_token',
  SETTINGS: 'user_settings',
  DOWNLOAD_HISTORY: 'download_history',
  LAST_VALIDATION: 'last_token_validation',
} as const;

export const STORAGE_DEFAULTS = {
  MAX_HISTORY_RECORDS: 100,
  TOKEN_VALIDATION_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
} as const; 