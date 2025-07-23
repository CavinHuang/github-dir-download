// GitHub文件夹下载器 - 简化的内容脚本

let downloadButton = null;
let currentRepoInfo = null;
let lastUrl = window.location.href; // 全局变量用于URL检测
let currentPath;

// 保存原始的history方法
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

// 重写history方法来监听SPA导航
history.pushState = function() {
  originalPushState.apply(history, arguments);
  console.log('GitHub Dir Download: pushState调用');
  window.dispatchEvent(new Event('locationchange'));
};

history.replaceState = function() {
  originalReplaceState.apply(history, arguments);
  console.log('GitHub Dir Download: replaceState调用');
  window.dispatchEvent(new Event('locationchange'));
};

// 初始化
if (window.location.hostname === 'github.com') {
  console.log('GitHub Dir Download: 开始初始化');
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
  
  // 主要依赖background的tabs API进行URL监听
  // 监听自定义locationchange事件（由history API重写触发）
  window.addEventListener('locationchange', () => {
    console.log('GitHub Dir Download: locationchange事件');
    setTimeout(onPageReady, 200);
  });
  
  // 监听popstate事件（浏览器前进/后退）
  window.addEventListener('popstate', () => {
    console.log('GitHub Dir Download: popstate事件');
    setTimeout(onPageReady, 200);
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

  const shouldShow = shouldShowDownloadButton()
  console.log('shouldShow', shouldShow);  
  
  if (repoInfo && shouldShow) {
    currentRepoInfo = repoInfo;
    if(currentPath !== repoInfo.path) {
      currentPath = repoInfo.path;
      removeDownloadButton();
    }
    injectDownloadButton();
    currentPath = repoInfo.path;
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

function  shouldShowDownloadButton() {
  const pathname = window.location.pathname;
  console.log('shouldShowDownloadButton', pathname);
  
  // 排除的页面
  const excludePatterns = [
    '/issues', '/pull/', '/pulls', '/actions', '/settings',
    '/wiki', '/projects', '/security', '/pulse', '/community', '/graphs'
  ];
  
  if (excludePatterns.some(pattern => pathname.includes(pattern))) {
    return false;
  }

  console.log('页面可以路径校验通过', pathname);
  
  // 只在仓库根目录或树形文件夹页面显示
  const isRepoRoot = /^\/[^\/]+\/[^\/]+\/?$/.test(pathname);
  const isTreeView = /^\/[^\/]+\/[^\/]+\/tree\//.test(pathname);
  const isBlobView = /^\/[^\/]+\/[^\/]+\/blob\//.test(pathname);

  console.log('isRepoRoot', isRepoRoot);
  console.log('isTreeView', isTreeView);
  console.log('isBlobView', isBlobView);
  
  return (isRepoRoot || isTreeView) && !isBlobView;
}

function injectDownloadButton() {
  console.log('injectDownloadButton', downloadButton, currentRepoInfo);
  if (downloadButton || !currentRepoInfo) return;
  
  // 寻找注入位置 - 优先使用repository-details-container
  const targetSelectors = [
    '#repository-details-container',
    '.react-code-view-header-element--wide .d-flex.gap-2',
    '.file-navigation .d-flex.gap-2',
    '.Box-header .d-flex.gap-2',
    '[data-testid="breadcrumbs"] + div .d-flex',
    '.UnderlineNav-actions .d-flex',
    '.repository-content .d-flex.flex-wrap.gap-2',
    '.js-repo-nav .d-flex'
  ];
  
  let targetContainer = null;
  for (const selector of targetSelectors) {
    targetContainer = document.querySelector(selector);
    if (targetContainer) break;
  }

  console.log('targetContainer', targetContainer);
  
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
  }
  downloadButton = null;
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
    case 'URL_CHANGED':
      console.log('GitHub Dir Download: 收到background的URL变化通知', message.url);
      lastUrl = message.url; // 更新lastUrl避免备用检测重复触发
      setTimeout(onPageReady, 100);
      sendResponse({ success: true });
      break;
      
    case 'PAGE_LOADED':
      console.log('GitHub Dir Download: 收到background的页面加载通知');
      setTimeout(onPageReady, 100);
      sendResponse({ success: true });
      break;
      
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
  // 轻量级MutationObserver作为补充检测
  const observer = new MutationObserver((mutations) => {
    // 防抖机制，避免频繁触发
    if (observer.timeout) return;
    
    observer.timeout = setTimeout(() => {
      observer.timeout = null;
      
      // 检查是否有重要DOM变化
      const hasImportantChange = mutations.some(mutation => 
        mutation.type === 'childList' && 
        mutation.addedNodes.length > 0 &&
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches('#repo-content-turbo-frame') || 
           node.matches('.repository-content'))
        )
      );
      
      if (hasImportantChange) {
        console.log('GitHub Dir Download: DOM重要变化检测');
        setTimeout(analyzeCurrentPage, 300);
      }
    }, 500);
  });
  
  // 观察主内容区域
  const targetNode = document.querySelector('.application-main') || document.body;
  observer.observe(targetNode, {
    childList: true,
    subtree: false
  });
  
  console.log('GitHub Dir Download: 轻量级Observer已启动');
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

