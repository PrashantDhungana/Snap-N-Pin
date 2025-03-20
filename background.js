// Keep track of tabs where content script is injected
const injectedTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  // Check if content script is already injected
  if (!injectedTabs.has(tab.id)) {
    // First time injection
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      css: `
        .snap-n-pin-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          cursor: crosshair;
          z-index: 2147483647;
        }
        .snap-n-pin-selection {
          position: absolute;
          border: 2px solid #1a73e8;
          background: transparent;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }
        .snap-n-pin-selection::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 1px solid white;
          pointer-events: none;
        }
      `
    });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    injectedTabs.add(tab.id);
  }
  
  // Send message to start screenshot process
  chrome.tabs.sendMessage(tab.id, { action: 'startScreenshot' });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'capture') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Required for async response
  }
});

// Clean up when tab is closed or refreshed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});
