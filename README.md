# 🚀 GitHub文件夹下载器

一键从GitHub仓库下载指定文件夹，自动打包为ZIP文件的浏览器扩展。

[![Release](https://img.shields.io/github/v/release/github-dir-download/extension)](https://github.com/github-dir-download/extension/releases)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Mozilla Add-on](https://img.shields.io/badge/Firefox-Add--on-orange)](https://addons.mozilla.org/firefox)
[![License](https://img.shields.io/github/license/github-dir-download/extension)](LICENSE)

<div align="center">
  <img src="src/icon/icon-simple.svg" alt="GitHub Dir Download" width="120" height="120">
  <h3>🚀 一键下载GitHub文件夹为ZIP</h3>
  <p>支持Chrome、Firefox、Edge的现代化浏览器扩展</p>
</div>

## ✨ 特性

- 🎯 **一键下载**: 在GitHub页面直接点击下载按钮
- 📁 **文件夹下载**: 支持下载整个仓库或指定文件夹
- 🗜️ **自动打包**: 自动打包为ZIP文件，保持目录结构
- 🔒 **安全可靠**: 使用GitHub官方API，支持私有仓库
- 🌐 **跨浏览器**: 支持Chrome、Firefox、Edge等主流浏览器
- ⚡ **轻量快速**: 简洁设计，无多余功能，运行高效

## 📥 安装

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="src/icon/icon-simple.svg" width="64" height="64"><br>
        <h3>🌟 Chrome & Edge</h3>
        <p>1. 下载通用ZIP包并解压<br>
        2. 打开 <code>chrome://extensions/</code><br>
        3. 开启「开发者模式」<br>
        4. 点击「加载已解压的扩展程序」</p>
      </td>
      <td align="center" width="50%">
        <img src="src/icon/icon-simple.svg" width="64" height="64"><br>
        <h3>🦊 Firefox</h3>
        <p>1. 下载通用ZIP包并解压<br>
        2. 打开 <code>about:debugging</code><br>
        3. 点击「此Firefox」<br>
        4. 点击「临时载入附加组件」</p>
      </td>
    </tr>
  </table>
</div>

> **注意**: 由于浏览器安全限制，扩展需要手动安装。我们提供通用ZIP包，支持所有现代浏览器。

## 🔧 使用方法

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%">
        <img src="src/icon/icon-simple.svg" width="48" height="48"><br>
        <h4>1️⃣ 设置Token</h4>
        <p>点击扩展图标，输入<br>GitHub Personal Access Token</p>
      </td>
      <td align="center" width="33%">
        <img src="src/icon/icon-simple.svg" width="48" height="48"><br>
        <h4>2️⃣ 访问页面</h4>
        <p>打开任意GitHub<br>仓库或文件夹页面</p>
      </td>
      <td align="center" width="33%">
        <img src="src/icon/icon-simple.svg" width="48" height="48"><br>
        <h4>3️⃣ 一键下载</h4>
        <p>点击注入的下载按钮<br>自动打包为ZIP文件</p>
      </td>
    </tr>
  </table>
</div>

### 📋 详细步骤

**设置GitHub Token:**
- 访问 [GitHub Personal Access Tokens](https://github.com/settings/tokens) 创建新Token
- 选择权限：`repo`（私有仓库）或 `public_repo`（公开仓库）
- 将Token粘贴到扩展设置中并保存

**开始下载:**
- 访问任意GitHub仓库或文件夹页面
- 点击页面上自动出现的「下载」按钮
- 等待下载完成，ZIP文件将自动保存

## 🛠️ 开发

### 环境要求
- Node.js 16+
- npm 或 yarn

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/github-dir-download/extension.git
cd extension

# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建所有版本
npm run build

# 构建扩展包
npm run build:zip       # 通用ZIP包
```

### 项目结构
```
src/
├── manifest.json       # 扩展配置
├── background.js       # 后台脚本
├── content-script.js   # 内容脚本
├── popup.html         # 弹出窗口界面
├── popup.js           # 弹出窗口脚本
├── style.css          # 样式文件
├── github-api.js      # GitHub API客户端
├── download.js        # 下载管理器
├── utils.js           # 工具函数
└── lib/              # 第三方库
    ├── jszip.min.js  # ZIP处理
    └── FileSaver.min.js # 文件保存
```

### 发布流程
```bash
# 交互式发布（推荐）
npm run release

# 手动构建
npm run build
```

## 🤖 自动化

### GitHub Actions
项目配置了完整的CI/CD流程：

- **自动构建**: 推送代码时自动构建通用版本
- **自动发布**: 创建tag时自动发布到GitHub Releases
- **定时检查**: 每周日检查是否需要发布新版本
- **智能打包**: 生成通用ZIP包和源代码包

### 发布产物
每次发布会自动生成：

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="src/icon/icon-simple.svg" width="64" height="64"><br>
        <h4>📦 通用扩展包</h4>
        <code>github-dir-download-{version}-universal.zip</code><br>
        <small>支持Chrome、Firefox、Edge等浏览器</small>
      </td>
      <td align="center" width="50%">
        <img src="src/icon/icon-simple.svg" width="64" height="64"><br>
        <h4>📄 源代码包</h4>
        <code>github-dir-download-{version}-source.zip</code><br>
        <small>完整项目源代码，包含文档</small>
      </td>
    </tr>
  </table>
</div>

## 📋 技术规格

- **支持浏览器**: Chrome 88+, Firefox 91+, Edge 88+
- **Manifest版本**: V3 兼容
- **权限要求**: 存储、标签页访问、GitHub域名访问
- **文件大小**: ~50KB
- **依赖库**: JSZip, FileSaver.js

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md)。

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🙋 支持

- 📖 [使用文档](https://github.com/github-dir-download/extension/wiki)
- 🐛 [报告问题](https://github.com/github-dir-download/extension/issues/new?template=bug_report.md)
- 💡 [功能建议](https://github.com/github-dir-download/extension/issues/new?template=feature_request.md)
- 💬 [讨论区](https://github.com/github-dir-download/extension/discussions)

## ⭐ Star History

如果这个项目对您有帮助，请给我们一个Star！

[![Star History Chart](https://api.star-history.com/svg?repos=github-dir-download/extension&type=Date)](https://star-history.com/#github-dir-download/extension&Date)

---

<div align="center">
  <p>Made with ❤️ by GitHub Dir Download Team</p>
  <p>
    <a href="https://github.com/github-dir-download/extension">GitHub</a> •
    <a href="https://github.com/github-dir-download/extension/releases">Releases</a> •
    <a href="https://github.com/github-dir-download/extension/wiki">Wiki</a>
  </p>
</div>