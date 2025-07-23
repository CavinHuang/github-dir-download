// GitHub文件夹下载器 - 简化的内容脚本

let downloadButton = null;
let currentRepoInfo = null;

// 初始化
if (isGitHubPage()) {
  init();
}

function init() {
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageReady);
  } else {
    onPageReady();
  }
  
  // 监听background消息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 监听页面变化（GitHub SPA导航）
  window.addEventListener('locationchange', () => {
    setTimeout(onPageReady, 500);
  });
  
  // 监听popstate事件（后退/前进）
  window.addEventListener('popstate', () => {
    setTimeout(onPageReady, 500);
  });
  
  // 启动MutationObserver监听页面变化
  startPageObserver();
}

function isGitHubPage() {
  return window.location.hostname === 'github.com';
}

function onPageReady() {
  analyzeCurrentPage();
  injectStyles();
  
  // 通知background启用图标
  chrome.runtime.sendMessage({ type: 'ENABLE_ICON' });
}

function analyzeCurrentPage() {
  const url = window.location.href;
  const repoInfo = parseGitHubURL(url);
  
  if (repoInfo && shouldShowDownloadButton()) {
    currentRepoInfo = repoInfo;
    injectDownloadButton();
  } else {
    currentRepoInfo = null;
    removeDownloadButton();
  }
}

function parseGitHubURL(url) {
  // 基本的GitHub URL解析
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?/);
  if (!match) return null;
  
  const [, owner, repo, branch = 'main', path = ''] = match;
  return { owner, repo, branch, path };
}

function shouldShowDownloadButton() {
  const pathname = window.location.pathname;
  
  // 排除的页面
  const excludePatterns = [
    '/issues', '/pull/', '/pulls', '/actions', '/settings',
    '/wiki', '/projects', '/security', '/pulse', '/community', '/graphs'
  ];
  
  if (excludePatterns.some(pattern => pathname.includes(pattern))) {
    return false;
  }
  
  // 只在仓库根目录或树形文件夹页面显示
  const isRepoRoot = /^\/[^\/]+\/[^\/]+\/?$/.test(pathname);
  const isTreeView = /^\/[^\/]+\/[^\/]+\/tree\//.test(pathname);
  const isBlobView = /^\/[^\/]+\/[^\/]+\/blob\//.test(pathname);
  
  return (isRepoRoot || isTreeView) && !isBlobView;
}

function injectDownloadButton() {
  if (downloadButton || !currentRepoInfo) return;
  
  // 寻找注入位置
  const targetSelectors = [
    '.react-code-view-header-element--wide .d-flex.gap-2',
    '.file-navigation .d-flex',
    '.Box-header .d-flex',
    '[data-testid="breadcrumbs"] + div .d-flex'
  ];
  
  let targetContainer = null;
  for (const selector of targetSelectors) {
    targetContainer = document.querySelector(selector);
    if (targetContainer) break;
  }
  
  if (!targetContainer) {
    // 备用方案：创建悬浮按钮
    createFloatingButton();
    return;
  }
  
  // 创建下载按钮
  downloadButton = createDownloadButton();
  targetContainer.appendChild(downloadButton);
  
  console.log('GitHub Dir Download: 按钮已注入');
}

function createDownloadButton() {
  const button = document.createElement('button');
  button.className = 'github-dir-download-btn';
  button.textContent = getButtonText();
  button.addEventListener('click', handleDownloadClick);
  return button;
}

function createFloatingButton() {
  downloadButton = createDownloadButton();
  downloadButton.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    z-index: 9999 !important;
    background: #1f883d !important;
    color: white !important;
    border: none !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    font-size: 14px !important;
    cursor: pointer !important;
  `;
  
  document.body.appendChild(downloadButton);
  console.log('GitHub Dir Download: 使用悬浮按钮');
}

function getButtonText() {
  if (!currentRepoInfo) return '下载文件夹';
  
  if (currentRepoInfo.path) {
    const pathParts = currentRepoInfo.path.split('/');
    const folderName = pathParts[pathParts.length - 1];
    return `下载 ${folderName}`;
  }
  
  return '下载仓库';
}

function removeDownloadButton() {
  if (downloadButton && downloadButton.parentNode) {
    downloadButton.parentNode.removeChild(downloadButton);
    downloadButton = null;
  }
}

async function handleDownloadClick() {
  if (!currentRepoInfo) return;
  
  updateButtonState('downloading');
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'START_DOWNLOAD',
      repoInfo: currentRepoInfo,
      path: currentRepoInfo.path
    });
    
    if (response && response.success) {
      console.log('GitHub Dir Download: 下载开始');
    } else {
      console.error('GitHub Dir Download: 下载失败', response?.error);
      showError(response?.error || '下载失败');
      updateButtonState('ready');
    }
  } catch (error) {
    console.error('GitHub Dir Download: 请求失败', error);
    showError('网络错误');
    updateButtonState('ready');
  }
}

function updateButtonState(state) {
  if (!downloadButton) return;
  
  downloadButton.className = `github-dir-download-btn ${state}`;
  
  switch (state) {
    case 'downloading':
      downloadButton.innerHTML = '<span class="loading-spinner"></span> 下载中...';
      downloadButton.disabled = true;
      break;
    case 'ready':
      downloadButton.textContent = getButtonText();
      downloadButton.disabled = false;
      break;
    case 'error':
      downloadButton.textContent = '下载失败';
      downloadButton.disabled = true;
      break;
  }
}

function showError(message) {
  // 简单的错误提示
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    background: #d1242f;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  tooltip.textContent = message;
  
  document.body.appendChild(tooltip);
  
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.remove();
    }
  }, 3000);
}

function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'START_DOWNLOAD_PROCESS':
      // 开始实际的下载处理
      processDownload(message.token, message.repoInfo, message.path);
      sendResponse({ success: true });
      break;
    case 'UPDATE_BUTTON_STATE':
      updateButtonState(message.state);
      sendResponse({ success: true });
      break;
    default:
      sendResponse({ success: false, error: '未知消息类型' });
  }
}

async function processDownload(token, repoInfo, path) {
  try {
    // 导入必要的库（需要在manifest中预加载）
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
      throw new Error('缺少必要的库文件');
    }
    
    updateButtonState('downloading');
    
    // 获取文件列表
    const files = await getRepoFiles(token, repoInfo, path);
    
    // 下载文件内容
    const fileContents = await downloadFiles(token, files);
    
    // 创建ZIP
    const zip = new JSZip();
    fileContents.forEach(file => {
      zip.file(file.path, file.content, { base64: true });
    });
    
    // 生成并下载ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = path || repoInfo.repo;
    saveAs(zipBlob, `${filename}.zip`);
    
    updateButtonState('ready');
    
  } catch (error) {
    console.error('下载处理失败:', error);
    showError(error.message);
    updateButtonState('ready');
  }
}

async function getRepoFiles(token, repoInfo, path) {
  const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${path || ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API错误: ${response.status}`);
  }
  
  const items = await response.json();
  const files = [];
  
  for (const item of items) {
    if (item.type === 'file') {
      files.push({
        path: item.path,
        download_url: item.download_url,
        sha: item.sha
      });
    } else if (item.type === 'dir') {
      // 递归获取文件夹内容
      const subFiles = await getRepoFiles(token, repoInfo, item.path);
      files.push(...subFiles);
    }
  }
  
  return files;
}

async function downloadFiles(token, files) {
  const fileContents = [];
  
  for (const file of files) {
    try {
      const response = await fetch(file.download_url);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      fileContents.push({
        path: file.path,
        content: base64
      });
    } catch (error) {
      console.error(`下载文件失败: ${file.path}`, error);
    }
  }
  
  return fileContents;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function startPageObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldReanalyze = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target === document.body) {
        shouldReanalyze = true;
      }
    });
    
    if (shouldReanalyze) {
      setTimeout(analyzeCurrentPage, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function injectStyles() {
  if (document.getElementById('github-dir-download-styles')) return;
  
  const styles = `
    .github-dir-download-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.375rem !important;
      padding: 0.375rem 0.75rem !important;
      background: #1f883d !important;
      color: white !important;
      border: 1px solid #1f883d !important;
      border-radius: 6px !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      text-decoration: none !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      margin-left: 0.5rem !important;
    }

    .github-dir-download-btn:hover {
      background: #1a7f37 !important;
      border-color: #1a7f37 !important;
    }

    .github-dir-download-btn:disabled {
      background: #8c959f !important;
      border-color: #8c959f !important;
      cursor: not-allowed !important;
      opacity: 0.6 !important;
    }

    .github-dir-download-btn.downloading {
      background: #6f42c1 !important;
      border-color: #6f42c1 !important;
    }

    .github-dir-download-btn.error {
      background: #d1242f !important;
      border-color: #d1242f !important;
    }

    .github-dir-download-btn .loading-spinner {
      width: 0.875rem !important;
      height: 0.875rem !important;
      border: 2px solid transparent !important;
      border-top: 2px solid currentColor !important;
      border-radius: 50% !important;
      animation: github-dir-download-spin 1s linear infinite !important;
    }

    @keyframes github-dir-download-spin {
      to { transform: rotate(360deg); }
    }
  `;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'github-dir-download-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

// 监听自定义locationchange事件（用于SPA导航检测）
(function() {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    window.dispatchEvent(new Event('locationchange'));
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    window.dispatchEvent(new Event('locationchange'));
  };
})();