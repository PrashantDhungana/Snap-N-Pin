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

      // Create a draggable container for the pinned screenshot
      const container = document.createElement('div');
      container.className = 'snap-n-pin-floating';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-radius: 8px;
        padding: 8px;
        cursor: move;
        resize: both;
        overflow: hidden;
        min-width: 100px;
        min-height: 100px;
      `;

      // Add controls
      const controls = document.createElement('div');
      controls.style.cssText = `
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
        justify-content: flex-end;
      `;

      // Close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
        border: none;
        background: none;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        color: #666;
      `;
      closeButton.addEventListener('click', () => container.remove());

      // Add the screenshot
      const pinnedImg = document.createElement('img');
      pinnedImg.src = canvas.toDataURL('image/png');
      pinnedImg.style.cssText = `
        max-width: 100%;
        height: auto;
        display: block;
      `;

      controls.appendChild(closeButton);
      container.appendChild(controls);
      container.appendChild(pinnedImg);
      document.body.appendChild(container);

      // Make it draggable
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;

      container.addEventListener('mousedown', (e) => {
        if (e.target === closeButton) return;
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
