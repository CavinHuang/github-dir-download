# GitHub 文件夹下载器

<div align="center">
  <img src="public/icon-with-shadow.svg" alt="GitHub Dir Download" width="120" height="120">

  <h3>一键从GitHub仓库下载指定文件夹</h3>
  <p>支持Chrome和Firefox的现代化浏览器插件</p>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-green.svg)](https://chrome.google.com/webstore)
  [![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--ons-orange.svg)](https://addons.mozilla.org/firefox)

</div>

---

## ✨ 特性

### 🎯 核心功能
- **一键下载** - 在GitHub页面直接点击按钮下载文件夹
- **智能检测** - 自动识别GitHub仓库和文件夹页面
- **ZIP打包** - 自动将下载的文件打包为ZIP格式
- **实时进度** - 详细的下载进度和速度显示
- **批量下载** - 支持并发下载多个文件

### 🛠️ 高级功能
- **文件过滤** - 支持自定义排除规则和文件类型过滤
- **大小限制** - 可配置的文件大小和总大小限制
- **下载历史** - 完整的下载记录和重试功能
- **数据管理** - 设置导入导出和存储使用情况监控

### 🎨 用户体验
- **GitHub原生设计** - 完美融入GitHub页面风格
- **零配置启动** - 首次使用自动引导设置
- **响应式界面** - 适配不同屏幕尺寸
- **多语言支持** - 完整的中文界面

---

## 🚀 快速开始

### 安装插件

#### Chrome 浏览器
1. 访问 [Chrome Web Store](https://chrome.google.com/webstore)
2. 搜索 "GitHub 文件夹下载器"
3. 点击 "添加至 Chrome"

#### Firefox 浏览器
1. 访问 [Firefox Add-ons](https://addons.mozilla.org/firefox)
2. 搜索 "GitHub Dir Download"
3. 点击 "Add to Firefox"

### 设置GitHub Token

> **为什么需要Token？** GitHub API对未认证请求有严格的速率限制，使用Personal Access Token可以获得更高的API调用限额。

1. **生成Token**
   - 访问 [GitHub Settings → Personal access tokens](https://github.com/settings/tokens)
   - 点击 "Generate new token (classic)"
   - 设置Token名称（如：GitHub Dir Download）
   - 选择权限：勾选 `repo` （必需）
   - 点击 "Generate token" 并复制生成的Token

2. **配置插件**
   - 首次使用会自动弹出设置界面
   - 粘贴刚才复制的Token
   - 点击 "验证并保存"

### 开始使用

1. **访问GitHub仓库** - 打开任意GitHub仓库页面
2. **导航到文件夹** - 进入您想下载的文件夹
3. **点击下载按钮** - 页面上会自动出现"下载文件夹"按钮
4. **等待完成** - 插件会显示下载进度，完成后自动保存ZIP文件

---

## 📖 使用指南

### 基础操作

#### 下载整个仓库
1. 访问仓库首页（如：`https://github.com/user/repo`）
2. 点击自动注入的"下载仓库"按钮
3. 等待下载完成

#### 下载特定文件夹
1. 进入目标文件夹（如：`https://github.com/user/repo/tree/main/src`）
2. 点击"下载 src"按钮
3. 等待下载完成

### 高级设置

#### 下载限制配置
- **单文件大小限制** - 默认50MB，可调整1-1024MB
- **总下载大小限制** - 默认1GB，可调整1-10GB
- **最大文件数量** - 默认1000个，可调整1-10000个
- **并发下载数** - 默认3个，可调整1-20个

#### 文件过滤规则
支持通配符模式，每行一个规则：
```
*.log          # 排除所有日志文件
node_modules   # 排除node_modules文件夹
.git           # 排除git文件夹
temp/*         # 排除temp目录下所有文件
```

#### 数据管理
- **导出设置** - 将配置保存为JSON文件
- **导入设置** - 从JSON文件恢复配置
- **清除历史** - 删除所有下载记录
- **存储监控** - 查看浏览器存储使用情况

---

## 🔧 开发指南

### 技术栈
- **前端框架** - Svelte 5 + TypeScript
- **构建工具** - Vite + vite-plugin-web-extension
- **状态管理** - Svelte Stores
- **样式系统** - CSS + GitHub Design System
- **浏览器API** - WebExtension Polyfill
- **文件处理** - JSZip

### 调试指南

#### 查看 Background 脚本日志
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 找到扩展，点击"检查视图" → "Service Worker"
4. 在打开的控制台中查看所有 background 脚本的日志

#### 常见问题排查

**扩展上下文失效错误 (Extension context invalidated)**
- **原因**: 扩展重新加载、热更新或 Service Worker 重启
- **症状**: 控制台显示 "Extension context invalidated" 错误
- **解决方案**:
  1. 刷新 GitHub 页面
  2. 重新加载扩展程序
  3. 检查扩展是否正确安装

**Service Worker 不活跃**
- **解决方案**: 在扩展管理页面点击"重新加载"按钮

**日志没有显示**
- **检查**: Service Worker 是否启动
- **解决方案**: 触发一次扩展操作（如点击图标）来激活 Service Worker

### 项目结构
```
github-dir-download/
├── src/
│   ├── types/              # TypeScript类型定义
│   ├── constants/          # 常量配置
│   ├── utils/              # 工具函数库
│   ├── services/           # 核心服务层
│   ├── stores/             # Svelte状态管理
│   ├── components/         # UI组件
│   ├── pages/              # 页面入口
│   ├── content-script.ts   # 内容脚本
│   ├── background.ts       # 后台脚本
│   └── manifest.json       # 插件配置
├── public/                 # 静态资源
└── dist/                   # 构建输出
```

### 本地开发

#### 环境要求
- Node.js 16+
- pnpm 8+

#### 安装依赖
```bash
git clone https://github.com/github-dir-download/extension.git
cd extension
pnpm install
```

#### 开发模式
```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm check

# 代码格式化
pnpm format
```

#### 构建插件
```bash
# 生产构建
pnpm build

# 构建输出位于 dist/ 目录
```

#### 加载开发版本

**Chrome**
1. 打开 `chrome://extensions/`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `dist/` 目录

**Firefox**
1. 打开 `about:debugging`
2. 点击"此Firefox"
3. 点击"临时载入附加组件"
4. 选择 `dist/manifest.json`

### 代码规范

#### TypeScript
- 使用严格的类型检查
- 所有公共API必须有完整的类型定义
- 避免使用 `any` 类型

#### Svelte组件
- 组件名使用PascalCase
- Props使用完整的类型定义
- 事件使用createEventDispatcher

#### 样式
- 使用GitHub Design System的设计token
- 组件样式使用scoped CSS
- 响应式设计优先

---

## 🛡️ 隐私与安全

### 数据处理
- **本地存储** - 所有设置和Token仅存储在您的本地浏览器中
- **无服务器** - 不会向任何第三方服务器发送您的数据
- **GitHub API** - 仅与GitHub官方API通信

### 权限说明
- **activeTab** - 检测当前GitHub页面
- **downloads** - 下载ZIP文件到本地
- **storage** - 保存设置和Token
- **tabs** - 与内容脚本通信
- **github.com** - 访问GitHub页面和API

### 安全建议
- 定期更新Token
- 不要分享您的Personal Access Token
- 如发现Token泄露，请立即在GitHub中撤销

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 报告问题
1. 检查是否已有相关issue
2. 使用issue模板创建新问题
3. 提供详细的复现步骤和环境信息

### 提交代码
1. Fork本仓库
2. 创建feature分支
3. 遵循代码规范
4. 添加必要的测试
5. 提交Pull Request

### 开发规范
- 遵循现有的代码风格
- 编写清晰的提交信息
- 更新相关文档
- 确保所有测试通过

---

## 📋 更新日志

### v1.0.0 (2024-01)
- 🎉 首次发布
- ✨ 支持Chrome和Firefox
- 🎯 完整的GitHub文件夹下载功能
- 🎨 现代化的用户界面
- 🛠️ 高级设置和文件过滤
- 📊 下载进度和历史记录

---

## 📞 支持与反馈

### 获取帮助
- 📖 查看[使用文档](https://github.com/github-dir-download/extension/wiki)
- 💬 提交[Issue](https://github.com/github-dir-download/extension/issues)
- 📧 发送邮件至 support@github-dir-download.com

### 社区
- 🌟 [GitHub Repository](https://github.com/github-dir-download/extension)
- 💬 [Discussions](https://github.com/github-dir-download/extension/discussions)
- 🐦 [Twitter](https://twitter.com/github_dir_dl)

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。

---

## 🙏 致谢

感谢以下开源项目：
- [Svelte](https://svelte.dev/) - 现代化的前端框架
- [Vite](https://vitejs.dev/) - 快速的构建工具
- [JSZip](https://stuk.github.io/jszip/) - JavaScript ZIP库
- [GitHub Primer](https://primer.style/) - GitHub设计系统

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个⭐️</p>
  <p>Made with ❤️ by GitHub Dir Download Team</p>
</div>