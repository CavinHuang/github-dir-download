#!/usr/bin/env python3
"""
自动生成GitHub Release说明的脚本
"""

import sys
import json
import subprocess
import re
from datetime import datetime

def get_git_log_since_last_tag():
    """获取自上一个tag以来的git提交记录"""
    try:
        # 获取最新的两个tag
        tags_result = subprocess.run(['git', 'tag', '--sort=-version:refname'], 
                                   capture_output=True, text=True, check=True)
        tags = tags_result.stdout.strip().split('\n')
        
        if len(tags) < 2 or not tags[0]:
            # 如果没有之前的tag，获取所有提交
            log_result = subprocess.run(['git', 'log', '--pretty=format:%H|%s|%an|%ad', '--date=short'], 
                                      capture_output=True, text=True, check=True)
        else:
            # 获取自上一个tag以来的提交
            prev_tag = tags[1] if len(tags) > 1 else tags[0]
            log_result = subprocess.run(['git', 'log', f'{prev_tag}..HEAD', '--pretty=format:%H|%s|%an|%ad', '--date=short'], 
                                      capture_output=True, text=True, check=True)
        
        return log_result.stdout.strip().split('\n') if log_result.stdout.strip() else []
    except subprocess.CalledProcessError:
        return []

def categorize_commits(commits):
    """分类提交记录"""
    categories = {
        'features': [],
        'fixes': [],
        'improvements': [],
        'docs': [],
        'chore': [],
        'other': []
    }
    
    feature_keywords = ['feat', 'add', 'new', '新增', '添加', '功能']
    fix_keywords = ['fix', 'bug', 'patch', '修复', '修正', '解决']
    improvement_keywords = ['improve', 'enhance', 'update', 'refactor', '优化', '改进', '重构', '更新']
    docs_keywords = ['doc', 'docs', 'readme', '文档']
    chore_keywords = ['chore', 'build', 'ci', 'test', '构建', '测试']
    
    for commit in commits:
        if not commit:
            continue
            
        parts = commit.split('|')
        if len(parts) < 4:
            continue
            
        hash_val, message, author, date = parts[:4]
        message_lower = message.lower()
        
        categorized = False
        
        # 检查是否是功能
        for keyword in feature_keywords:
            if keyword in message_lower:
                categories['features'].append({
                    'hash': hash_val[:7],
                    'message': message,
                    'author': author,
                    'date': date
                })
                categorized = True
                break
        
        if not categorized:
            # 检查是否是修复
            for keyword in fix_keywords:
                if keyword in message_lower:
                    categories['fixes'].append({
                        'hash': hash_val[:7],
                        'message': message,
                        'author': author,
                        'date': date
                    })
                    categorized = True
                    break
        
        if not categorized:
            # 检查是否是改进
            for keyword in improvement_keywords:
                if keyword in message_lower:
                    categories['improvements'].append({
                        'hash': hash_val[:7],
                        'message': message,
                        'author': author,
                        'date': date
                    })
                    categorized = True
                    break
        
        if not categorized:
            # 检查是否是文档
            for keyword in docs_keywords:
                if keyword in message_lower:
                    categories['docs'].append({
                        'hash': hash_val[:7],
                        'message': message,
                        'author': author,
                        'date': date
                    })
                    categorized = True
                    break
        
        if not categorized:
            # 检查是否是杂项
            for keyword in chore_keywords:
                if keyword in message_lower:
                    categories['chore'].append({
                        'hash': hash_val[:7],
                        'message': message,
                        'author': author,
                        'date': date
                    })
                    categorized = True
                    break
        
        if not categorized:
            categories['other'].append({
                'hash': hash_val[:7],
                'message': message,
                'author': author,
                'date': date
            })
    
    return categories

def get_version_info(version):
    """获取版本信息"""
    version_number = version.replace('v', '')
    return {
        'version': version,
        'version_number': version_number,
        'date': datetime.now().strftime('%Y-%m-%d'),
        'timestamp': datetime.now().strftime('%Y年%m月%d日')
    }

def generate_release_notes(version):
    """生成Release说明"""
    version_info = get_version_info(version)
    commits = get_git_log_since_last_tag()
    categories = categorize_commits(commits)
    
    # 生成Markdown格式的Release说明
    notes = []
    
    # 标题和基本信息
    notes.append(f"# 🎉 GitHub文件夹下载器 {version_info['version']}")
    notes.append("")
    notes.append(f"发布日期：{version_info['timestamp']}")
    notes.append("")
    
    # 快速下载链接
    notes.append("## 📥 快速下载")
    notes.append("")
    notes.append("<div align=\"center\">")
    notes.append("  <table>")
    notes.append("    <tr>")
    notes.append("      <td align=\"center\" width=\"50%\">")
    notes.append("        <h3>📦 通用扩展包</h3>")
    notes.append(f"        <a href=\"../../releases/download/{version_info['version']}/github-dir-download-{version_info['version_number']}-universal.zip\">")
    notes.append("          <img src=\"src/icon/icon-simple.svg\" width=\"64\" height=\"64\"><br>")
    notes.append(f"          <strong>github-dir-download-{version_info['version_number']}-universal.zip</strong>")
    notes.append("        </a><br>")
    notes.append("        <small>支持Chrome、Firefox、Edge等浏览器</small>")
    notes.append("      </td>")
    notes.append("      <td align=\"center\" width=\"50%\">")
    notes.append("        <h3>📄 源代码包</h3>")
    notes.append(f"        <a href=\"../../releases/download/{version_info['version']}/github-dir-download-{version_info['version_number']}-source.zip\">")
    notes.append("          <img src=\"src/icon/icon-simple.svg\" width=\"64\" height=\"64\"><br>")
    notes.append(f"          <strong>github-dir-download-{version_info['version_number']}-source.zip</strong>")
    notes.append("        </a><br>")
    notes.append("        <small>完整项目源代码</small>")
    notes.append("      </td>")
    notes.append("    </tr>")
    notes.append("  </table>")
    notes.append("</div>")
    notes.append("")
    
    has_changes = False
    
    # 新功能
    if categories['features']:
        has_changes = True
        notes.append("## ✨ 新功能")
        notes.append("")
        for commit in categories['features']:
            notes.append(f"- {commit['message']} ([{commit['hash']}](../../commit/{commit['hash']}))")
        notes.append("")
    
    # 修复
    if categories['fixes']:
        has_changes = True
        notes.append("## 🐛 修复")
        notes.append("")
        for commit in categories['fixes']:
            notes.append(f"- {commit['message']} ([{commit['hash']}](../../commit/{commit['hash']}))")
        notes.append("")
    
    # 改进
    if categories['improvements']:
        has_changes = True
        notes.append("## 🚀 改进")
        notes.append("")
        for commit in categories['improvements']:
            notes.append(f"- {commit['message']} ([{commit['hash']}](../../commit/{commit['hash']}))")
        notes.append("")
    
    # 文档
    if categories['docs']:
        has_changes = True
        notes.append("## 📚 文档")
        notes.append("")
        for commit in categories['docs']:
            notes.append(f"- {commit['message']} ([{commit['hash']}](../../commit/{commit['hash']}))")
        notes.append("")
    
    # 其他变更
    if categories['other']:
        has_changes = True
        notes.append("## 🔧 其他变更")
        notes.append("")
        for commit in categories['other']:
            notes.append(f"- {commit['message']} ([{commit['hash']}](../../commit/{commit['hash']}))")
        notes.append("")
    
    # 如果没有显著变更，添加默认说明
    if not has_changes:
        notes.append("## 📋 本次更新")
        notes.append("")
        notes.append("- 版本更新和维护")
        notes.append("- 代码优化和性能改进")
        notes.append("")
    
    # 安装说明
    notes.append("## 📦 安装方法")
    notes.append("")
    notes.append("<div align=\"center\">")
    notes.append("  <table>")
    notes.append("    <tr>")
    notes.append("      <td align=\"center\" width=\"50%\">")
    notes.append("        <img src=\"src/icon/icon-simple.svg\" width=\"48\" height=\"48\"><br>")
    notes.append("        <h3>🌟 Chrome & Edge</h3>")
    notes.append("        <p>1. 下载通用ZIP包并解压<br>")
    notes.append("        2. 打开 <code>chrome://extensions/</code><br>")
    notes.append("        3. 开启「开发者模式」<br>")
    notes.append("        4. 点击「加载已解压的扩展程序」</p>")
    notes.append("      </td>")
    notes.append("      <td align=\"center\" width=\"50%\">")
    notes.append("        <img src=\"src/icon/icon-simple.svg\" width=\"48\" height=\"48\"><br>")
    notes.append("        <h3>🦊 Firefox</h3>")
    notes.append("        <p>1. 下载通用ZIP包并解压<br>")
    notes.append("        2. 打开 <code>about:debugging</code><br>")
    notes.append("        3. 点击「此Firefox」<br>")
    notes.append("        4. 点击「临时载入附加组件」</p>")
    notes.append("      </td>")
    notes.append("    </tr>")
    notes.append("  </table>")
    notes.append("</div>")
    notes.append("")
    
    # 使用方法
    notes.append("## 🔧 使用方法")
    notes.append("")
    notes.append("1. 安装扩展后，点击扩展图标")
    notes.append("2. 在弹出窗口中设置您的GitHub Personal Access Token")
    notes.append("3. 访问任意GitHub仓库或文件夹页面")
    notes.append("4. 点击页面上的「下载」按钮开始下载")
    notes.append("")
    
    # 技术规格
    notes.append("## 🔧 技术规格")
    notes.append("")
    notes.append("- **支持浏览器**: Chrome 88+, Firefox 91+, Edge 88+")
    notes.append("- **Manifest版本**: V3 兼容")
    notes.append("- **文件大小**: ~50KB")
    notes.append("- **权限要求**: 存储、标签页访问、GitHub域名访问")
    notes.append("- **依赖库**: JSZip, FileSaver.js")
    notes.append("")
    
    # 贡献者
    if commits:
        contributors = set()
        for category in categories.values():
            for commit in category:
                contributors.add(commit['author'])
        
        if contributors:
            notes.append("## 👥 贡献者")
            notes.append("")
            notes.append("感谢以下开发者对本版本的贡献：")
            notes.append("")
            for contributor in sorted(contributors):
                notes.append(f"- @{contributor}")
            notes.append("")
    
    # 反馈和支持
    notes.append("## 💬 反馈和支持")
    notes.append("")
    notes.append("- 🐛 [报告问题](../../issues/new)")
    notes.append("- 💡 [功能建议](../../issues/new)")
    notes.append("- 📖 [使用文档](../../blob/main/README.md)")
    notes.append("- ⭐ 如果这个扩展对您有帮助，请给我们一个Star！")
    notes.append("")
    
    return '\n'.join(notes)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-release-notes.py <version>")
        sys.exit(1)
    
    version = sys.argv[1]
    release_notes = generate_release_notes(version)
    print(release_notes)

if __name__ == '__main__':
    main()