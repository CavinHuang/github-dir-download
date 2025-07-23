# 发布系统更新说明

## 🔄 更新概述

基于用户需求，我们简化了发布系统，不再生成CRX和XPI格式的扩展包，改为提供通用ZIP包供用户手动安装。

## 📦 更新内容

### 1. GitHub Actions 工作流更新

#### `release.yml` 主要变更：
- ❌ 移除Chrome CRX构建步骤
- ❌ 移除Firefox XPI构建步骤  
- ✅ 保留通用ZIP包构建
- ✅ 保留源代码包构建
- 🔄 更新构建流程，只调用 `npm run build:zip`

#### `auto-release.yml` 状态：
- ✅ 无需更新，仍正常工作
- ✅ 继续负责智能版本检测和标签创建

### 2. 构建脚本更新

#### `package.json` 脚本简化：
```json
{
  "scripts": {
    "build": "npm run clean && npm run build:zip",
    "build:zip": "node scripts/build-universal.js"
  }
}
```

#### 构建脚本状态：
- `build-chrome.js` - 已注释CRX生成代码
- `build-firefox.js` - 已注释XPI生成代码
- `build-universal.js` - 正常工作，生成通用ZIP和源码包

### 3. Release Notes 生成器更新

#### `generate-release-notes.py` 主要变更：
- 🎨 更新下载区域为图表化展示
- 📦 只显示通用ZIP包和源代码包
- 🛠️ 更新安装说明为手动安装步骤
- 🔧 更新技术规格说明

### 4. README 文档更新

#### 主要变更：
- 📥 **安装区域**: 更新为手动安装说明
- 🏗️ **构建说明**: 简化构建命令
- 📦 **发布产物**: 只展示两种格式
- 🔧 **技术规格**: 更新Manifest版本说明

## 🎯 当前发布流程

### 自动发布流程：
1. **代码推送** → 无自动构建
2. **创建标签** → 触发 `release.yml`
3. **自动构建** → 生成通用ZIP包和源码包  
4. **创建Release** → 附带智能生成的说明
5. **用户下载** → 手动安装扩展

### 手动发布流程：
```bash
# 1. 交互式发布
npm run release

# 2. 或手动触发GitHub Actions
# 在GitHub页面: Actions → Auto Release → Run workflow
```

## 📋 发布产物

每次发布生成两个文件：

| 文件 | 用途 | 目标用户 |
|------|------|----------|
| `github-dir-download-{version}-universal.zip` | 浏览器扩展包 | 终端用户 |
| `github-dir-download-{version}-source.zip` | 完整源代码 | 开发者 |

## 🛠️ 安装方法

### Chrome & Edge:
1. 下载通用ZIP包并解压
2. 打开 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」

### Firefox:
1. 下载通用ZIP包并解压
2. 打开 `about:debugging`
3. 点击「此Firefox」
4. 点击「临时载入附加组件」

## ✅ 验证清单

- [x] `release.yml` 已更新，移除CRX/XPI构建
- [x] `auto-release.yml` 无需更新
- [x] `package.json` 脚本已简化
- [x] `generate-release-notes.py` 已更新
- [x] `README.md` 已更新安装说明
- [x] 构建脚本已注释多余代码
- [x] 发布产物说明已更新

## 🚀 优势

1. **简化维护** - 减少构建复杂度
2. **通用兼容** - 一个包支持所有浏览器
3. **用户控制** - 用户自主选择安装方式
4. **减少依赖** - 不依赖浏览器商店政策
5. **开发友好** - 源码包便于定制开发

## 📝 注意事项

- 用户需要手动安装，无法通过浏览器商店一键安装
- Firefox中的安装是临时的，浏览器重启后需重新加载
- Chrome中需要开启开发者模式
- 这是开发版安装方式，适合技术用户

---

*更新完成时间: 2024年7月*