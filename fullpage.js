class FullPageScreenshot {
  constructor() {
    this.screenshots = [];
    this.originalScrollPosition = 0;
    this.originalOverflowStyle = '';
  }

  async capture() {
    try {
      // Save initial scroll position and overflow style
      this.originalScrollPosition = window.scrollY;
      this.originalOverflowStyle = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      const fullHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const viewportHeight = window.innerHeight;
      const totalSteps = Math.ceil(fullHeight / viewportHeight);

      // Capture screenshots
      for (let i = 0; i < totalSteps; i++) {
        window.scrollTo(0, i * viewportHeight);
        // Wait for any lazy-loaded images to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const dataUrl = await this.captureViewport();
        this.screenshots.push(dataUrl);
      }

      // Restore original scroll position and overflow
      window.scrollTo(0, this.originalScrollPosition);
      document.documentElement.style.overflow = this.originalOverflowStyle;

      // Stitch screenshots and open result in new tab
      await this.stitchAndDisplay();
    } catch (error) {
      console.error('Full page screenshot failed:', error);
      // Restore original state
      window.scrollTo(0, this.originalScrollPosition);
      document.documentElement.style.overflow = this.originalOverflowStyle;
    }
  }

  async captureViewport() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'capture' }, (response) => {
        resolve(response.dataUrl);
      });
    });
  }

  async stitchAndDisplay() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const viewportHeight = window.innerHeight;
    
    // Create temporary images to get dimensions
    const tempImages = await Promise.all(
      this.screenshots.map(dataUrl => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = dataUrl;
        });
      })
    );

    // Set canvas dimensions
    canvas.width = tempImages[0].width;
    canvas.height = viewportHeight * tempImages.length;

    // Draw images to canvas
    tempImages.forEach((img, index) => {
      ctx.drawImage(img, 0, index * viewportHeight);
    });

    // Open result in new tab
    const resultTab = window.open();
    resultTab.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; background: #f0f0f0; min-height: 100vh; }
            .controls { position: fixed; top: 20px; right: 20px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            button { margin: 0 5px; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; background: #1a73e8; color: white; }
            button:hover { background: #1557b0; }
            img { max-width: 100%; display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="controls">
            <button onclick="downloadImage('png')">Save as PNG</button>
            <button onclick="downloadImage('jpeg')">Save as JPEG</button>
            <button onclick="downloadImage('pdf')">Save as PDF</button>
          </div>
          <img src="${canvas.toDataURL('image/png')}" />
          <script>
            function downloadImage(format) {
              const img = document.querySelector('img');
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              ctx.drawImage(img, 0, 0);

              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              if (format === 'pdf') {
                const pdf = new jsPDF({
                  orientation: canvas.width > canvas.height ? 'l' : 'p',
                  unit: 'px',
                  format: [canvas.width, canvas.height]
                });
                pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', 0, 0, canvas.width, canvas.height);
                pdf.save(\`screenshot-\${timestamp}.pdf\`);
              } else {
                const a = document.createElement('a');
                a.href = canvas.toDataURL(\`image/\${format}\`);
                a.download = \`screenshot-\${timestamp}.\${format}\`;
                a.click();
              }
            }
          </script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        </body>
      </html>
    `);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startFullPageScreenshot') {
    const screenshotTool = new FullPageScreenshot();
    screenshotTool.capture();
  } else if (request.type === 'initFullPageScreenshot') {
    // Use promise-based approach instead of await
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        const tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, { action: 'startFullPageScreenshot' });
      })
      .catch(error => {
        console.error('Failed to initiate full page screenshot:', error);
      });
  }
}); 