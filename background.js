// Keep track of tabs where content script is injected
const injectedTabs = new Set();

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    initiateScreenshot('save');
  } else if (command === 'pin-screenshot') {
    initiateScreenshot('pin');
  }
});

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'capture') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl });
    });
    return true; // Required for async response
  } else if (request.type === 'initScreenshot') {
    if (request.mode === 'fullpage') {
      captureFullPage();
    } else {
      initiateScreenshot(request.mode);
      // Close popup immediately for non-fullpage captures
      chrome.runtime.sendMessage({ type: 'captureComplete' });
    }
  } else if (request.type === 'captureFullPage') {
    captureFullPage();
  }
});

// Function to initiate screenshot process
async function initiateScreenshot(mode) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;

    if (mode === 'fullpage') {
      await captureFullPage();
      return;
    }

    if (!injectedTabs.has(tabId)) {
      await chrome.scripting.insertCSS({
        target: { tabId },
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
        target: { tabId },
        files: ['content.js']
      });
      
      injectedTabs.add(tabId);
    }
    
    // Send message to start screenshot process
    chrome.tabs.sendMessage(tabId, { 
      action: 'startScreenshot',
      mode: mode 
    });
  } catch (error) {
    console.error('Failed to initiate screenshot:', error);
  }
}

// Clean up when tab is closed or refreshed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});

async function captureFullPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Notify capture start
    chrome.runtime.sendMessage({ type: 'captureStarted' });

    // Get page dimensions and handle fixed elements
    const pageInfo = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Store original styles to restore later
        const elementsToRestore = [];
        
        // Store original scrollbar state
        const originalOverflow = document.documentElement.style.overflow;
        const originalBodyOverflow = document.body.style.overflow;
        
        // Handle fixed/sticky elements and scrollbars
        const hideFixedElementsAndScrollbars = () => {
          // Hide scrollbars
          document.documentElement.style.overflow = 'hidden';
          document.body.style.overflow = 'hidden';

          const elements = document.querySelectorAll('*');
          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
              elementsToRestore.push({
                element: el,
                originalPosition: el.style.position,
                originalDisplay: el.style.display
              });
              el.style.position = 'absolute';
              if (el.tagName === 'HEADER' || el.tagName === 'NAV' || 
                  el.classList.contains('header') || el.classList.contains('nav')) {
                el.style.display = 'none';
              }
            }
          });
        };

        // Restore fixed elements and scrollbars
        const restoreFixedElementsAndScrollbars = () => {
          // Restore scrollbars
          document.documentElement.style.overflow = originalOverflow;
          document.body.style.overflow = originalBodyOverflow;

          elementsToRestore.forEach(({ element, originalPosition, originalDisplay }) => {
            element.style.position = originalPosition;
            if (originalDisplay) {
              element.style.display = originalDisplay;
            }
          });
        };

        window.snapNPinUtils = {
          hideFixedElementsAndScrollbars,
          restoreFixedElementsAndScrollbars,
          elementsToRestore
        };

        return {
          viewportHeight: window.innerHeight,
          totalHeight: Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          ),
          viewportWidth: window.innerWidth,
          totalWidth: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth
          )
        };
      }
    });

    const { viewportHeight, totalHeight, viewportWidth } = pageInfo[0].result;
    const captures = [];
    
    // Hide fixed elements and scrollbars before starting capture
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.scrollTo(0, 0);
        window.snapNPinUtils.hideFixedElementsAndScrollbars();
        const canvas = document.createElement('canvas');
        canvas.id = 'fullPageCanvas';
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
      }
    });

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Calculate the number of full captures needed
    const numberOfCaptures = Math.ceil(totalHeight / viewportHeight);
    
    // Modified capture loop
    for (let i = 0; i < numberOfCaptures; i++) {
      const currentScroll = i * viewportHeight;
      
      // For the last capture, adjust scroll position to capture the bottom perfectly
      if (i === numberOfCaptures - 1) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (totalHeight, viewportHeight) => {
            window.scrollTo(0, totalHeight - viewportHeight);
          },
          args: [totalHeight, viewportHeight]
        });
      } else {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (scrollPos) => window.scrollTo(0, scrollPos),
          args: [currentScroll]
        });
      }

      await delay(300);

      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png'
      });
      captures.push({
        dataUrl,
        scrollPos: i === numberOfCaptures - 1 ? totalHeight - viewportHeight : currentScroll
      });

      await delay(500);
    }

    // Updated stitching process
    const stitchResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (captures, totalHeight, viewportHeight, viewportWidth) => {
        const canvas = document.getElementById('fullPageCanvas');
        canvas.width = viewportWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        return new Promise((resolve) => {
          let loadedImages = 0;
          captures.forEach(({ dataUrl, scrollPos }) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, scrollPos);
              loadedImages++;
              if (loadedImages === captures.length) {
                const finalDataUrl = canvas.toDataURL('image/png');
                canvas.remove();
                window.snapNPinUtils.restoreFixedElementsAndScrollbars();
                resolve(finalDataUrl);
              }
            };
            img.src = dataUrl;
          });
        });
      },
      args: [captures, totalHeight, viewportHeight, viewportWidth]
    });

    // Open the screenshot in a new tab
    chrome.tabs.create({
      url: `viewer.html?image=${encodeURIComponent(stitchResult[0].result)}`
    });

    // Notify capture complete
    chrome.runtime.sendMessage({ type: 'captureComplete' });

    // Reset scroll position and restore elements and scrollbars
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.scrollTo(0, 0);
        if (window.snapNPinUtils && window.snapNPinUtils.restoreFixedElementsAndScrollbars) {
          window.snapNPinUtils.restoreFixedElementsAndScrollbars();
        }
      }
    });

  } catch (error) {
    console.error('Full page capture failed:', error);
    // Notify capture failed
    chrome.runtime.sendMessage({ 
      type: 'captureComplete', 
      error: 'Screenshot failed. Please try again.' 
    });
    
    // Ensure elements and scrollbars are restored even if there's an error
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.snapNPinUtils && window.snapNPinUtils.restoreFixedElementsAndScrollbars) {
          window.snapNPinUtils.restoreFixedElementsAndScrollbars();
        }
      }
    });
  }
}
