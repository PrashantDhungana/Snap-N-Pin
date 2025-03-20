// Ensure we only have one instance of ScreenshotTool
class ScreenshotTool {
  constructor() {
    this.overlay = null;
    this.selection = null;
    this.startX = 0;
    this.startY = 0;
    this.isSelecting = false;
    this.originalScreenshot = null;
  }

  async init() {
    // Capture the screenshot first
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
    this.cropScreenshot(rect);
  }

  async cropScreenshot(rect) {
    try {
      // Create an image from the original screenshot
      const img = new Image();
      img.src = this.originalScreenshot;
      await new Promise((resolve) => (img.onload = resolve));

      // Create a canvas to crop the screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Draw the cropped region
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

      // Convert to blob and download
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
    screenshotTool = new ScreenshotTool();
    screenshotTool.init();
  }
});
