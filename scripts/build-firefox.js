const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function buildFirefox() {
  console.log('🦊 Building Firefox extension...');
  
  const srcDir = path.join(__dirname, '../src');
  const distDir = path.join(__dirname, '../dist');
  const firefoxDir = path.join(distDir, 'firefox');
  
  // 确保输出目录存在
  await fs.ensureDir(distDir);
  await fs.ensureDir(firefoxDir);
  
  // 复制源文件到firefox目录
  await fs.copy(srcDir, firefoxDir);
  
  // 更新manifest.json为Firefox版本
  const manifestPath = path.join(firefoxDir, 'manifest.json');
  const manifest = await fs.readJson(manifestPath);
  
  // Firefox特定配置
  manifest.manifest_version = 2;
  
  // 转换action为browser_action (MV2)
  if (manifest.action) {
    manifest.browser_action = manifest.action;
    delete manifest.action;
  }
  
  // 转换background service_worker为scripts (MV2)
  if (manifest.background && manifest.background.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
      persistent: false
    };
  }
  
  // 合并host_permissions到permissions (MV2)
  if (manifest.host_permissions) {
    manifest.permissions = manifest.permissions || [];
    manifest.permissions.push(...manifest.host_permissions);
    delete manifest.host_permissions;
  }
  
  // 添加Firefox特定字段
  manifest.applications = {
    gecko: {
      strict_min_version: "91.0"
    }
  };
  
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  
  // 创建XPI文件（Firefox扩展包）
  // const xpiPath = path.join(distDir, 'github-dir-download-firefox.xpi');
  // await createZipFromDirectory(firefoxDir, xpiPath);
  
  console.log('✅ Firefox extension built successfully');
  // console.log(`   Output: ${xpiPath}`);
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
  buildFirefox().catch(console.error);
}

module.exports = buildFirefox;