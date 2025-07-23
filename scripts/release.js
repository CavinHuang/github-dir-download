const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 发布脚本 - 自动化发布流程
 */

async function main() {
  console.log('🚀 Starting release process...');
  
  try {
    // 检查是否在git仓库中
    checkGitRepository();
    
    // 检查工作目录是否干净
    checkWorkingDirectory();
    
    // 获取当前版本
    const currentVersion = getCurrentVersion();
    console.log(`📋 Current version: ${currentVersion}`);
    
    // 询问新版本号
    const newVersion = await promptNewVersion(currentVersion);
    console.log(`🏷️  New version: ${newVersion}`);
    
    // 更新版本号
    await updateVersion(newVersion);
    
    // 构建所有包
    await buildAllPackages();
    
    // 创建git tag
    createGitTag(newVersion);
    
    // 推送到远程仓库
    pushToRemote(newVersion);
    
    console.log('🎉 Release process completed successfully!');
    console.log('   GitHub Actions will automatically create the release.');
    
  } catch (error) {
    console.error('❌ Release process failed:', error.message);
    process.exit(1);
  }
}

function checkGitRepository() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (error) {
    throw new Error('Not in a git repository');
  }
}

function checkWorkingDirectory() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      throw new Error('Working directory is not clean. Please commit or stash your changes.');
    }
  } catch (error) {
    throw new Error('Failed to check git status');
  }
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = require(packageJsonPath);
  return packageJson.version;
}

async function promptNewVersion(currentVersion) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    console.log('\nAvailable version bumps:');
    console.log(`  1. Patch: ${major}.${minor}.${patch + 1} (bug fixes)`);
    console.log(`  2. Minor: ${major}.${minor + 1}.0 (new features)`);
    console.log(`  3. Major: ${major + 1}.0.0 (breaking changes)`);
    console.log(`  4. Custom version`);
    
    readline.question('\nSelect version bump (1-4): ', (answer) => {
      let newVersion;
      
      switch (answer.trim()) {
        case '1':
          newVersion = `${major}.${minor}.${patch + 1}`;
          break;
        case '2':
          newVersion = `${major}.${minor + 1}.0`;
          break;
        case '3':
          newVersion = `${major + 1}.0.0`;
          break;
        case '4':
          readline.question('Enter custom version: ', (customVersion) => {
            newVersion = customVersion.trim();
            readline.close();
            resolve(newVersion);
          });
          return;
        default:
          console.log('Invalid selection. Using patch version.');
          newVersion = `${major}.${minor}.${patch + 1}`;
      }
      
      readline.close();
      resolve(newVersion);
    });
  });
}

async function updateVersion(newVersion) {
  console.log(`📝 Updating version to ${newVersion}...`);
  
  // 更新package.json
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = require(packageJsonPath);
  packageJson.version = newVersion;
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  
  // 更新manifest.json
  const manifestPath = path.join(__dirname, '../src/manifest.json');
  const manifest = await fs.readJson(manifestPath);
  manifest.version = newVersion;
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  
  // 提交版本更新
  execSync('git add package.json src/manifest.json');
  execSync(`git commit -m "chore: bump version to ${newVersion}"`);
}

async function buildAllPackages() {
  console.log('🔨 Building all packages...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (error) {
    throw new Error('Build process failed');
  }
}

function createGitTag(version) {
  console.log(`🏷️  Creating git tag v${version}...`);
  
  try {
    execSync(`git tag -a v${version} -m "Release v${version}"`);
  } catch (error) {
    throw new Error('Failed to create git tag');
  }
}

function pushToRemote(version) {
  console.log('📤 Pushing to remote repository...');
  
  try {
    execSync('git push origin main');
    execSync(`git push origin v${version}`);
  } catch (error) {
    throw new Error('Failed to push to remote repository');
  }
}

if (require.main === module) {
  main();
}