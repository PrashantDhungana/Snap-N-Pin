// Ensure we only have one instance of ScreenshotTool
class ScreenshotTool {
  constructor(mode = 'save') {
    this.overlay = null;
    this.selection = null;
    this.startX = 0;
    this.startY = 0;
    this.isSelecting = false;
    this.originalScreenshot = null;
    this.mode = mode;
  }

  async init() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'capture' });
      if (!response || !response.dataUrl) {
        throw new Error('Failed to capture screenshot');
      }
      this.originalScreenshot = response.dataUrl;
      this.createOverlay();
      this.bindEvents();
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'snap-n-pin-overlay';
    document.body.appendChild(this.overlay);
  }

  createSelection() {
    this.selection = document.createElement('div');
    this.selection.className = 'snap-n-pin-selection';
    this.overlay.appendChild(this.selection);
  }

  bindEvents() {
    this.overlay.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.overlay.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.overlay.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.cleanup();
    }
  }

  handleMouseDown(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.createSelection();
  }

  handleMouseMove(e) {
    if (!this.isSelecting) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);

    this.selection.style.left = left + 'px';
    this.selection.style.top = top + 'px';
    this.selection.style.width = width + 'px';
    this.selection.style.height = height + 'px';
  }

  handleMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    const rect = this.selection.getBoundingClientRect();
    if (this.mode === 'save') {
      this.saveScreenshot(rect);
    } else if (this.mode === 'pin') {
      this.pinScreenshot(rect);
    }
  }

  async saveScreenshot(rect) {
    try {
      const img = new Image();
      img.src = this.originalScreenshot;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.drawImage(
        img,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );

      canvas.toBlob((blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot-${timestamp}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    } finally {
      this.cleanup();
    }
  }

  async pinScreenshot(rect) {
    try {
      const img = new Image();
      img.src = this.originalScreenshot;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.drawImage(
        img,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );

      // Create a video element for PiP
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      
      // Create a media stream from the canvas
      const stream = canvas.captureStream();
      video.srcObject = stream;

      // Style container for the video
      const container = document.createElement('div');
      const INITIAL_WIDTH = 200;  // minimum width
      const INITIAL_HEIGHT = 150; // minimum height

      container.className = 'snap-n-pin-floating';
      container.style.cssText = `
        position: absolute;
        top: ${rect.bottom}px;
        left: ${rect.right}px;
        z-index: 2147483647;
        background: rgba(32, 33, 36, 0.7);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        border-radius: 12px;
        padding: 8px;
        user-select: none;
        width: ${INITIAL_WIDTH}px;
        height: ${INITIAL_HEIGHT}px;
        min-width: ${INITIAL_WIDTH}px;
        min-height: ${INITIAL_HEIGHT}px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
      `;

      // Add boundary checking to ensure the container stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust position if container would overflow viewport
      if (rect.right + INITIAL_WIDTH > viewportWidth) {
        container.style.left = `${viewportWidth - INITIAL_WIDTH - 20}px`;
      }

      if (rect.bottom + INITIAL_HEIGHT > viewportHeight) {
        container.style.top = `${viewportHeight - INITIAL_HEIGHT - 20}px`;
      }

      // Add header with title and controls
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        padding: 4px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
        cursor: move;

      `;

      const title = document.createElement('div');
      title.textContent = 'Snip and Pin';
      title.style.cssText = `
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        margin: 0;
        padding: 4px 8px;

      `;

      const controls = document.createElement('div');
      controls.style.cssText = `
        display: flex;
        gap: 8px;
      `;

      // Save button
      const saveButton = document.createElement('button');
      saveButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      `;
      saveButton.title = 'Save Screenshot';
      saveButton.style.cssText = `
        border: none;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        transition: background-color 0.2s ease;
      `;
      saveButton.addEventListener('click', () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `screenshot-${timestamp}.png`;
        a.click();
      });

      // PiP button
      const pipButton = document.createElement('button');
      pipButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2"/>
          <rect x="12" y="12" width="8" height="8" rx="1"/>
        </svg>
      `;
      pipButton.title = 'Enter Picture-in-Picture';
      pipButton.style.cssText = `
        border: none;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        transition: background-color 0.2s ease;
      `;
      pipButton.addEventListener('click', async () => {
        try {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
            // Remove the container once in PiP mode
            container.remove();
          }
        } catch (error) {
          console.error('Failed to enter Picture-in-Picture mode:', error);
        }
      });

      // Copy button
      const copyButton = document.createElement('button');
      copyButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      copyButton.title = 'Copy to Clipboard';
      copyButton.style.cssText = `
        border: none;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        transition: background-color 0.2s ease;
      `;

      copyButton.addEventListener('click', async () => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          
          // Show success feedback
          const originalColor = copyButton.style.background;
          copyButton.style.background = 'rgba(75, 181, 67, 0.4)';
          this.showToast('Copied to clipboard');
          setTimeout(() => {
            copyButton.style.background = originalColor;
          }, 1000);
        } catch (error) {
          console.error('Failed to copy to clipboard:', error);
          this.showToast('Failed to copy to clipboard');
        }
      });

      // Close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;
      closeButton.title = 'Close';
      closeButton.style.cssText = `
        border: none;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        transition: background-color 0.2s ease;
      `;
      closeButton.addEventListener('click', () => {
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture();
        }
        container.remove();
      });

      // Add the screenshot as video
      video.style.cssText = `
        width: 100%;
        height: calc(100% - 44px);
        display: block;
        pointer-events: none;
        object-fit: contain;
        background: transparent;
        margin: 0;
        padding: 0;
      `;

      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.style.cssText = `
        position: absolute;
        right: 2px;
        bottom: 2px;
        width: 16px;
        height: 16px;
        cursor: se-resize;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      `;

      // Create resize handle icon using SVG
      resizeHandle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="rgba(255, 255, 255, 0.5)">
          <path d="M14,14 L14,11 L11,14 L14,14 Z M14,8 L8,14 L14,14 L14,8 Z"/>
        </svg>
      `;

      // Add hover effect for resize handle
      resizeHandle.addEventListener('mouseover', () => {
        resizeHandle.style.opacity = '1';
      });
      resizeHandle.addEventListener('mouseout', () => {
        resizeHandle.style.opacity = '0.7';
      });

      // Update button styles with increased transparency
      const buttonStyles = `
        border: none;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        transition: background-color 0.2s ease;
      `;

      // Create retake button
      const retakeButton = document.createElement('button');
      retakeButton.style.cssText = buttonStyles;
      retakeButton.title = 'Retake Screenshot';
      retakeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <path d="M12 8v8"/>
          <path d="M8 12l4 4 4-4"/>
        </svg>
      `;
      retakeButton.addEventListener('click', () => {
        // Remove current screenshot window
        container.remove();
        if (document.pictureInPictureElement === video) {
          document.exitPictureInPicture();
        }
        // Start new screenshot
        chrome.runtime.sendMessage({ type: 'initScreenshot', mode: this.mode });
      });

      // Add hover effects for all buttons including retake
      [saveButton, pipButton, closeButton, retakeButton, copyButton].forEach(button => {
        button.addEventListener('mouseover', () => {
          button.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        button.addEventListener('mouseout', () => {
          button.style.background = 'rgba(255, 255, 255, 0.08)';
        });
      });

      // Update controls order
      controls.innerHTML = ''; // Clear existing controls
      controls.appendChild(retakeButton);
      controls.appendChild(saveButton);
      controls.appendChild(pipButton);
      controls.appendChild(copyButton);
      controls.appendChild(closeButton);

      header.appendChild(title);
      header.appendChild(controls);
      container.appendChild(header);
      container.appendChild(video);
      container.appendChild(resizeHandle);
      document.body.appendChild(container);

      // Start playing the video (required for PiP)
      video.play();

      // Make it draggable
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;

      header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        initialX = e.clientX - container.offsetLeft;
        initialY = e.clientY - container.offsetTop;
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        container.style.left = `${currentX}px`;
        container.style.top = `${currentY}px`;
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Listen for PiP events
      video.addEventListener('enterpictureinpicture', (event) => {
        const pipWindow = event.pictureInPictureWindow;
        // Store the video element in a global variable to prevent garbage collection
        window._pipVideo = video;
      });

      video.addEventListener('leavepictureinpicture', () => {
        // Clean up
        window._pipVideo = null;
        video.remove();
      });

      // Resize functionality
      let isResizing = false;
      let originalWidth;
      let originalHeight;
      let originalMouseX;
      let originalMouseY;

      resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        originalWidth = container.offsetWidth;
        originalHeight = container.offsetHeight;
        originalMouseX = e.clientX;
        originalMouseY = e.clientY;
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        e.preventDefault();

        const width = originalWidth + (e.clientX - originalMouseX);
        const height = originalHeight + (e.clientY - originalMouseY);

        // Set minimum size
        if (width >= 200 && height >= 150) {
          container.style.width = `${width}px`;
          container.style.height = `${height}px`;
          video.style.width = '100%';
          video.style.height = `${height - 40}px`; // Subtract header height
        }
      });

      document.addEventListener('mouseup', () => {
        isResizing = false;
      });

      // Add double-click handler to header
      header.addEventListener('dblclick', (e) => {
        // Prevent double-click from triggering other events
        e.stopPropagation();
        
        // Reset container dimensions to initial size
        container.style.width = `${INITIAL_WIDTH}px`;
        container.style.height = `${INITIAL_HEIGHT}px`;
        
        // Reset video dimensions
        video.style.width = '100%';
        video.style.height = `${INITIAL_HEIGHT - 44}px`; // Subtract header height
      });

    } catch (error) {
      console.error('Screenshot pinning failed:', error);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.originalScreenshot = null;
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 200);
      }, 2000);
    });
  }
}

// Listen for messages from background script
let screenshotTool = null;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startScreenshot') {
    if (screenshotTool) {
      screenshotTool.cleanup();
    }
    screenshotTool = new ScreenshotTool(request.mode);
    screenshotTool.init();
  }
});
