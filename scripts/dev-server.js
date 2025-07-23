const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 开发服务器 - 监听文件变化并自动重新构建
 */

class DevServer {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.distDir = path.join(__dirname, '../dist');
    this.devDir = path.join(this.distDir, 'dev');
    this.isBuilding = false;
  }

  async start() {
    console.log('🚀 Starting development server...');
    
    // 初始构建
    await this.build();
    
    // 监听文件变化
    this.watchFiles();
    
    console.log('✅ Development server started');
    console.log(`   📁 Dev build: ${this.devDir}`);
    console.log('   👀 Watching for changes...');
    console.log('   Press Ctrl+C to stop');
  }

  async build() {
    if (this.isBuilding) return;
    
    this.isBuilding = true;
    console.log('🔨 Building development version...');
    
    try {
      // 确保输出目录存在
      await fs.ensureDir(this.devDir);
      
      // 复制源文件
      await fs.copy(this.srcDir, this.devDir);
      
      // 添加开发模式标识
      const manifestPath = path.join(this.devDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.name += ' (Development)';
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
      
      console.log('✅ Development build completed');
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
    } finally {
      this.isBuilding = false;
    }
  }

  watchFiles() {
    const chokidar = require('chokidar');
    
    // 监听src目录的变化
    const watcher = chokidar.watch(this.srcDir, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      console.log(`📝 File changed: ${path.relative(this.srcDir, filePath)}`);
      this.build();
    });

    watcher.on('add', (filePath) => {
      console.log(`➕ File added: ${path.relative(this.srcDir, filePath)}`);
      this.build();
    });

    watcher.on('unlink', (filePath) => {
      console.log(`➖ File removed: ${path.relative(this.srcDir, filePath)}`);
      this.build();
    });

    // 优雅关闭
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development server...');
      watcher.close();
      process.exit(0);
    });
  }
}

// 安装chokidar依赖（如果没有的话）
function ensureDependencies() {
  try {
    require('chokidar');
  } catch (error) {
    console.log('📦 Installing development dependencies...');
    execSync('npm install --save-dev chokidar', { stdio: 'inherit' });
  }
}

async function main() {
  try {
    ensureDependencies();
    const server = new DevServer();
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start development server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DevServer;