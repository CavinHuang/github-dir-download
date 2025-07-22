export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  USER_ENDPOINT: '/user',
  REPOS_ENDPOINT: '/repos',
  RATE_LIMIT_ENDPOINT: '/rate_limit',
  CONTENTS_ENDPOINT: (owner: string, repo: string, path: string) => 
    `/repos/${owner}/${repo}/contents/${path}`,
  BLOB_ENDPOINT: (owner: string, repo: string, sha: string) => 
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
} as const;

export const API_HEADERS = {
  ACCEPT: 'application/vnd.github.v3+json',
  USER_AGENT: 'GitHub-Dir-Download-Extension/1.0.0',
} as const;

export const DOWNLOAD_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024, // 1GB
  MAX_FILES: 1000,
  CONCURRENT_DOWNLOADS: 5,
  API_RATE_LIMIT_BUFFER: 10, // 保留的API调用次数
  RETRY_DELAY: 1000, // 重试延迟(ms)
  MAX_RETRIES: 3,
} as const;

export const GITHUB_SCOPES = {
  REQUIRED: ['repo'] as const,
  OPTIONAL: ['user:email'] as const,
} as const; 