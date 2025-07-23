const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

async function buildUniversal() {
  console.log('📦 Building universal ZIP package...');
  
  const srcDir = path.join(__dirname, '../src');
  const distDir = path.join(__dirname, '../dist');
  const universalDir = path.join(distDir, 'universal');
  
  // 确保输出目录存在
  await fs.ensureDir(distDir);
  await fs.ensureDir(universalDir);
  
  // 复制源文件到universal目录
  await fs.copy(srcDir, universalDir);
  
  // 创建通用ZIP包
  const zipPath = path.join(distDir, 'github-dir-download-universal.zip');
  await createZipFromDirectory(universalDir, zipPath);
  
  // 创建源代码包
  await createSourcePackage();
  
  console.log('✅ Universal package built successfully');
  console.log(`   Output: ${zipPath}`);
}

async function createSourcePackage() {
  console.log('📄 Creating source code package...');
  
  const projectRoot = path.join(__dirname, '..');
  const distDir = path.join(__dirname, '../dist');
  const sourceZipPath = path.join(distDir, 'github-dir-download-source.zip');
  
  const output = fs.createWriteStream(sourceZipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log('✅ Source package created');
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    
    // 添加源文件
    archive.directory(path.join(projectRoot, 'src'), 'src');
    archive.directory(path.join(projectRoot, 'scripts'), 'scripts');
    archive.directory(path.join(projectRoot, '.github'), '.github');
    
    // 添加项目文件
    archive.file(path.join(projectRoot, 'package.json'), { name: 'package.json' });
    archive.file(path.join(projectRoot, 'README.md'), { name: 'README.md' });
    archive.file(path.join(projectRoot, 'GitHub文件夹下载器技术文档.md'), { name: 'GitHub文件夹下载器技术文档.md' });
    archive.file(path.join(projectRoot, '重构计划.md'), { name: '重构计划.md' });
    
    // 检查是否存在LICENSE文件
    const licensePath = path.join(projectRoot, 'LICENSE');
    if (fs.existsSync(licensePath)) {
      archive.file(licensePath, { name: 'LICENSE' });
    }
    
    archive.finalize();
  });
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
  buildUniversal().catch(console.error);
}

module.exports = buildUniversal;