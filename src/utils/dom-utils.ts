import { UI_CONSTANTS } from '../constants/ui.js';

export class DOMUtils {
  static waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  static createDownloadButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = UI_CONSTANTS.BUTTON_ID;
    button.className = UI_CONSTANTS.BUTTON_CLASS;
    button.innerHTML = `
      <svg class="octicon octicon-download" width="16" height="16" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"></path>
      </svg>
      ${text}
    `;
    button.title = '下载当前文件夹为ZIP文件';
    button.addEventListener('click', onClick);
    return button;
  }

  static updateButtonState(button: HTMLButtonElement, state: string): void {
    button.className = `${UI_CONSTANTS.BUTTON_CLASS} ${state}`;
    
    switch (state) {
      case 'analyzing':
        button.disabled = true;
        button.innerHTML = `<span class="loading-spinner"></span> 分析中...`;
        break;
      case 'downloading':
        button.disabled = true;
        button.innerHTML = `<span class="loading-spinner"></span> 下载中...`;
        break;
      case 'error':
        button.disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 11-2 0 1 1 0 012 0zM8 7.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z"/>
          </svg>
          错误
        `;
        break;
      case 'disabled':
        button.disabled = true;
        button.innerHTML = `下载文件夹`;
        break;
      default: // 'ready'
        button.disabled = false;
        button.innerHTML = `
          <svg class="octicon octicon-download" width="16" height="16" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M7.47 10.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 8.44V1.75a.75.75 0 00-1.5 0v6.69L4.78 5.97a.75.75 0 00-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"></path>
          </svg>
          下载文件夹
        `;
        break;
    }
  }

  static removeElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.remove();
    }
  }

  static addStyles(): void {
    const styles = `
      #${UI_CONSTANTS.BUTTON_ID} {
        margin-left: 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .loading-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #0969da;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
} 