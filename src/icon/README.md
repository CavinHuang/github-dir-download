# 图标使用指南

## 📁 图标文件

- `icon-simple.svg` - 图标

## 🖼️ PNG尺寸

- `16.png` - 16x16 (工具栏图标)
- `32.png` - 32x32 (扩展列表图标)  
- `48.png` - 48x48 (扩展管理页面)
- `96.png` - 96x96 (Chrome Web Store)
- `128.png` - 128x128 (详细页面)

## 🎨 设计说明

### 图标元素
1. **GitHub标识** - 顶部的Octocat简化版，表明与GitHub的关联
2. **文件夹** - 中央的黄色文件夹，代表目录/文件夹
3. **下载箭头** - 绿色向下箭头，表明下载功能
4. **ZIP标识** - 底部蓝色ZIP标签，说明打包格式

### 颜色方案
- **背景**: GitHub深色 (#24292f)
- **文件夹**: GitHub警告色 (#ffd33d) 
- **下载**: GitHub成功色 (#1f883d)
- **ZIP**: GitHub链接色 (#0969da)
- **GitHub元素**: GitHub前景色 (#f6f8fa)

### 使用建议
- **主要图标**: 使用 `icon-modern.svg` 
- **简化场景**: 使用 `icon-simple.svg`
- **特殊效果**: 使用 `icon.svg` (包含动画)

## 🔄 重新生成

运行以下命令重新生成PNG图标：

```bash
node scripts/generate-icons.js
```

## 📋 清单检查

- [ ] 所有尺寸的PNG文件已生成
- [ ] 图标在浅色背景下清晰可见
- [ ] 图标在深色背景下清晰可见  
- [ ] 小尺寸图标 (16px) 仍然可识别
- [ ] 符合平台图标设计规范

---

*图标设计遵循GitHub设计系统和浏览器扩展最佳实践*
