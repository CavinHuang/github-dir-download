const fs = require('fs-extra');
const path = require('path');

/**
 * 生成不同尺寸的图标文件
 * 从SVG转换为PNG格式
 */

// 检查是否安装了sharp或jimp
let imageProcessor = null;

try {
  imageProcessor = require('sharp');
  console.log('使用 Sharp 进行图像处理...');
} catch (error) {
  try {
    const Jimp = require('jimp');
    imageProcessor = { type: 'jimp', lib: Jimp };
    console.log('使用 Jimp 进行图像处理...');
  } catch (jimpError) {
    console.log('未找到图像处理库，将安装 sharp...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install sharp', { stdio: 'inherit' });
      imageProcessor = require('sharp');
      console.log('Sharp 安装成功！');
    } catch (installError) {
      console.error('无法安装图像处理库，请手动安装：npm install sharp');
      process.exit(1);
    }
  }
}

async function generateIcons() {
  const iconDir = path.join(__dirname, '../src/icon');
  const svgPath = path.join(iconDir, 'icon-simple.svg');
  
  // 检查SVG文件是否存在
  if (!await fs.pathExists(svgPath)) {
    console.error('SVG文件不存在:', svgPath);
    return;
  }
  
  const sizes = [16, 32, 48, 96, 128];
  console.log('🎨 开始生成图标...');
  
  if (imageProcessor.type === 'jimp') {
    await generateWithJimp(svgPath, iconDir, sizes);
  } else {
    await generateWithSharp(svgPath, iconDir, sizes);
  }
  
  console.log('✅ 图标生成完成！');
  
  // 生成图标使用指南
  await generateIconGuide(iconDir);
}

async function generateWithSharp(svgPath, iconDir, sizes) {
  const svgBuffer = await fs.readFile(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(iconDir, `${size}.png`);
    
    await imageProcessor(svgBuffer)
      .resize(size, size)
      .png({
        quality: 100,
        compressionLevel: 6,
        palette: false
      })
      .toFile(outputPath);
    
    console.log(`✓ 生成 ${size}x${size} 图标`);
  }
}

async function generateWithJimp(svgPath, iconDir, sizes) {
  console.log('注意: Jimp 不直接支持SVG，建议使用在线工具转换或安装 sharp');
  console.log('您可以手动将SVG文件转换为PNG格式的图标');
  console.log(`SVG文件位置: ${svgPath}`);
  console.log('需要的尺寸:', sizes.map(s => `${s}x${s}`).join(', '));
}

async function generateIconGuide(iconDir) {
  const guide = `# 图标使用指南

## 📁 图标文件

- \`icon-simple.svg\` - 图标

## 🖼️ PNG尺寸

- \`16.png\` - 16x16 (工具栏图标)
- \`32.png\` - 32x32 (扩展列表图标)  
- \`48.png\` - 48x48 (扩展管理页面)
- \`96.png\` - 96x96 (Chrome Web Store)
- \`128.png\` - 128x128 (详细页面)

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
- **主要图标**: 使用 \`icon-modern.svg\` 
- **简化场景**: 使用 \`icon-simple.svg\`
- **特殊效果**: 使用 \`icon.svg\` (包含动画)

## 🔄 重新生成

运行以下命令重新生成PNG图标：

\`\`\`bash
node scripts/generate-icons.js
\`\`\`

## 📋 清单检查

- [ ] 所有尺寸的PNG文件已生成
- [ ] 图标在浅色背景下清晰可见
- [ ] 图标在深色背景下清晰可见  
- [ ] 小尺寸图标 (16px) 仍然可识别
- [ ] 符合平台图标设计规范

---

*图标设计遵循GitHub设计系统和浏览器扩展最佳实践*
`;

  await fs.writeFile(path.join(iconDir, 'README.md'), guide);
  console.log('📖 图标使用指南已生成');
}

if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = generateIcons;