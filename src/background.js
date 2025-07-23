// GitHub文件夹下载器 - 简化的后台脚本
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: 收到消息', message.type);
  
  switch (message.type) {
    case 'ENABLE_ICON':
      // 启用扩展图标
      chrome.action.enable();
      sendResponse({ success: true });
      break;
      
    case 'GET_TOKEN':
      // 获取存储的GitHub Token
      getToken().then(token => {
        sendResponse({ success: true, token });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 异步响应
      
    case 'SET_TOKEN':
      // 保存GitHub Token
      setToken(message.token).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 异步响应
      
    case 'VALIDATE_TOKEN':
      // 验证Token
      validateToken(message.token).then(isValid => {
        sendResponse({ success: true, valid: isValid });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 异步响应
      
    case 'START_DOWNLOAD':
      // 开始下载
      handleDownload(message.repoInfo, message.path).then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // 异步响应
      
    default:
      sendResponse({ success: false, error: '未知消息类型' });
  }
});

// 监听标签页更新，处理GitHub页面的导航变化
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('github.com')) {
    // 启用图标
    chrome.action.enable(tabId);
    
    // 如果URL发生变化，通知content script
    if (changeInfo.url) {
      console.log('Background: GitHub页面URL变化', changeInfo.url);
      // 延迟发送消息，确保content script已加载
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'URL_CHANGED',
          url: changeInfo.url
        }).catch(error => {
          // 忽略错误，可能是content script还未加载
          console.log('Background: 发送URL变化消息失败', error.message);
        });
      }, 100);
    }
    
    // 当页面加载完成时也发送通知
    if (changeInfo.status === 'complete') {
      console.log('Background: GitHub页面加载完成');
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'PAGE_LOADED',
          url: tab.url
        }).catch(error => {
          console.log('Background: 发送页面加载消息失败', error.message);
        });
      }, 200);
    }
  }
});

// Token管理函数
async function getToken() {
  const result = await chrome.storage.sync.get('github_token');
  return result.github_token || null;
}

async function setToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token无效');
  }
  await chrome.storage.sync.set({ github_token: token });
}

async function validateToken(token) {
  if (!token) {
    token = await getToken();
  }
  if (!token) {
    return false;
  }
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Token验证失败:', error);
    return false;
  }
}

// 处理下载请求
async function handleDownload(repoInfo, path) {
  try {
    const token = await getToken();
    if (!token) {
      return { success: false, error: '未设置GitHub Token' };
    }
    
    // 向content script发送下载消息
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'START_DOWNLOAD_PROCESS',
        token,
        repoInfo,
        path
      });
    }
    
    return { success: true, message: '下载已开始' };
  } catch (error) {
    console.error('处理下载失败:', error);
    return { success: false, error: error.message };
  }
}