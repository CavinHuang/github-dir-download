const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const crx3 = require('crx3');

async function buildChrome() {
  console.log('🔨 Building Chrome extension...');
  
  const srcDir = path.join(__dirname, '../src');
  const distDir = path.join(__dirname, '../dist');
  const chromeDir = path.join(distDir, 'chrome');
  
  // 确保输出目录存在
  await fs.ensureDir(distDir);
  await fs.ensureDir(chromeDir);
  
  // 复制源文件到chrome目录
  await fs.copy(srcDir, chromeDir);
  
  // 更新manifest.json为Chrome版本
  const manifestPath = path.join(chromeDir, 'manifest.json');
  const manifest = await fs.readJson(manifestPath);
  
  // 确保Chrome特定配置
  manifest.manifest_version = 3;
  if (!manifest.action) {
    manifest.action = {
      default_popup: "popup.html",
      default_title: "GitHub 文件夹下载器"
    };
  }
  
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  
  // 创建CRX文件（需要私钥，这里先创建ZIP）
  const zipPath = path.join(distDir, 'github-dir-download-chrome.zip');
  await createZipFromDirectory(chromeDir, zipPath);
  
  // 重命名为.crx以便识别（实际使用时需要真正的签名）
  // const crxPath = path.join(distDir, 'github-dir-download-chrome.crx');
  // await fs.move(zipPath, crxPath);
  
  console.log('✅ Chrome extension built successfully');
  // console.log(`   Output: ${crxPath}`);
}

async function createZipFromDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve());
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

if (require.main === module) {
  buildChrome().catch(console.error);
}

module.exports = buildChrome;