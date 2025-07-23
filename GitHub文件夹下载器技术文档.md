# GitHub文件夹下载器技术文档

## 项目概述

GitZip for GitHub 是一个Chrome浏览器扩展，允许用户从GitHub仓库中选择性下载文件夹和文件，并将其打包为ZIP文件。该扩展通过在GitHub页面注入内容脚本，提供便捷的文件选择和下载功能。

## 技术架构

### 1. 扩展结构 (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "GitZip for github",
  "version": "1.0.4",
  "permissions": ["storage", "contextMenus"],
  "host_permissions": ["https://api.github.com/*"],
  "content_scripts": [
    {
      "matches": ["*://github.com/*"],
      "js": ["js/content/jszip.min.js", "js/content/FileSaver.min.js", "js/content/main.js"],
      "css": ["css/main.css"]
    }
  ]
}
```

**核心特性：**
- 使用Manifest V3标准
- 只需要storage和contextMenus权限
- 仅对github.com和GitHub API有访问权限
- 注入JSZip和FileSaver.js库处理文件打包和下载

### 2. 服务工作者 (background.js)

**主要功能：**
- **消息路由中心**：处理内容脚本发送的各种消息请求
- **图标管理**：根据页面状态启用/禁用扩展图标
- **存储管理**：存取GitHub API访问令牌
- **右键菜单**：动态创建和管理上下文菜单项
- **标签页监听**：监听标签页切换和更新事件

**核心消息处理：**
```javascript
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.action){
    case "showIcon": // 启用扩展图标
    case "getKey": // 获取存储的API令牌
    case "setKey": // 保存API令牌
    case "createContextNested": // 创建右键菜单
    case "updateContextNested": // 更新菜单状态
  }
});
```

### 3. 内容脚本核心逻辑 (main.js)

#### 3.1 URL解析系统
```javascript
var repoExp = new RegExp("^https://github.com/([^/]+)/([^/]+)(/(tree|blob)/([^/]+)(/(.*))?)?");

function resolveUrl(repoUrl) {
  // 解析GitHub URL，提取：
  // - author: 仓库所有者
  // - project: 仓库名称  
  // - branch: 分支名称
  // - type: 文件类型 (tree/blob)
  // - path: 文件路径
}
```

#### 3.2 文件选择机制
**三种选择模式：**
1. **双击模式** (`isOnlyDoubleClick`): 双击文件/文件夹进行选择
2. **单选模式** (`isOnlySingleCheck`): 鼠标悬停显示复选框
3. **混合模式** (`isBoth`): 同时支持双击和复选框

**UI组件注入：**
```javascript
function createMark(parent, height, title, type, href) {
  // 根据选择模式创建不同的标记元素
  // - 复选框模式：创建 div.gitzip-check-wrap 包含 input[type="checkbox"]
  // - 双击模式：创建 p.gitzip-check-mark 显示勾选标记
}
```

#### 3.3 下载管理系统 (Pool对象)

**进度管理器**：
- 右下角浮动面板显示下载进度
- 实时日志输出下载状态
- 错误处理和重试机制

**核心下载流程：**
```javascript
Pool.downloadPromiseProcess = function(resolvedUrl, infoAjaxItems) {
  // 1. 检查令牌和权限
  checkTokenAndScope()
  // 2. 获取文件信息
  .then(() => callAjax(getInfoUrl(...)))
  // 3. 递归获取文件夹内容
  .then(() => Promise.all(treeAjaxItems.map(...)))
  // 4. 下载文件内容
  .then(() => Promise.all(blobAjaxCollection.map(...)))
  // 5. 打包并下载
  .then(() => zipContents(...))
}
```

### 4. GitHub API集成

#### 4.1 API端点使用
- **Contents API**: `https://api.github.com/repos/{owner}/{repo}/contents/{path}`
- **Git Trees API**: `https://api.github.com/repos/{owner}/{repo}/git/trees/{sha}`
- **Rate Limit API**: `https://api.github.com/rate_limit`

#### 4.2 权限验证
```javascript
Pool.checkTokenAndScope = function() {
  // 检测是否为私有仓库
  var isPrivate = !!document.querySelector(".flex-auto .octicon-lock");
  
  // 验证令牌权限范围
  if (isPrivate && !scopes.includes("repo")) {
    throw "Your token cannot access private repo.";
  }
}
```

### 5. 文件处理系统

#### 5.1 Base64解码
```javascript
function base64toBlob(base64Data, contentType) {
  // 将GitHub API返回的base64内容转换为Blob对象
  // 支持大文件分片处理
}
```

#### 5.2 ZIP打包
```javascript
function zipContents(filename, contents) {
  var zip = new JSZip();
  contents.forEach(function(item) {
    zip.file(item.path, item.content, {createFolders: true, base64: true});
  });
  return zip.generateAsync({type: "blob"})
    .then(content => saveAs(content, filename + ".zip"));
}
```

### 6. 用户界面系统

#### 6.1 弹出窗口 (popup.html/popup.js)
- **令牌管理**：输入和保存GitHub API访问令牌
- **授权链接**：提供获取令牌的便捷链接
- **主题适配**：支持亮色/暗色主题自动切换

#### 6.2 设置页面 (options.html)
- 使用React构建的单页应用
- 配置文件选择行为和主题偏好
- 实时保存设置到chrome.storage.local

### 7. 事件系统

#### 7.1 页面监听
```javascript
// 监听页面变化
var lazyCaseObserver = new MutationObserver(function(mutations) {
  // 检测新增的文件/文件夹元素
  // 自动绑定选择事件
});

// 监听导航变化
window.addEventListener('popstate', () => {
  // 重新初始化页面元素
});
```

#### 7.2 右键菜单集成
- 动态创建多级菜单结构
- 根据选择状态更新菜单项
- 支持下载选中项、当前项、整个仓库

### 8. 主要技术特点

#### 8.1 兼容性设计
- 支持GitHub新旧UI界面
- 自动检测页面结构变化
- 响应式布局适配

#### 8.2 性能优化
- 批量API请求处理
- 异步文件下载
- 内存管理和垃圾回收

#### 8.3 用户体验
- 实时进度反馈
- 错误提示和处理指导
- 主题自适应

#### 8.4 安全机制
- 最小权限原则
- 令牌本地存储
- API限流处理

## 主要工作流程

### 1. 扩展初始化
1. 加载manifest配置
2. 注册服务工作者
3. 向GitHub页面注入内容脚本

### 2. 页面交互
1. 检测GitHub仓库页面
2. 解析当前URL和仓库信息
3. 为文件/文件夹添加选择标记
4. 绑定事件监听器

### 3. 文件选择
1. 用户通过复选框或双击选择文件
2. 更新选择状态和UI反馈
3. 显示/隐藏下载按钮

### 4. 下载处理
1. 验证API令牌和权限
2. 收集选中文件信息
3. 递归获取文件夹内容
4. 批量下载文件内容
5. 打包为ZIP并触发下载

### 5. 错误处理
1. API限流检测和提示
2. 权限不足处理
3. 网络错误重试机制
4. 用户友好的错误信息

## 总结

该扩展通过精心设计的架构，实现了GitHub文件夹下载的核心功能。主要优势包括：

1. **轻量级设计**：最小化权限需求，仅访问必要的API
2. **用户友好**：直观的选择界面和实时反馈
3. **高性能**：异步处理和批量操作
4. **高兼容性**：适配GitHub页面变化和不同主题
5. **安全可靠**：本地令牌存储和错误处理机制

该扩展展示了现代浏览器扩展开发的最佳实践，通过内容脚本注入、消息传递、API集成等技术，提供了流畅的用户体验。