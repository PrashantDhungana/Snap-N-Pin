document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveToComputer');
  const pinBtn = document.getElementById('pinToTop');
  const fullPageBtn = document.getElementById('fullPageScreenshot');
  const progressDiv = document.getElementById('captureProgress');
  const menuItems = document.querySelectorAll('.menu-item');

  // Helper to show/hide loading state
  const setLoadingState = (loading) => {
    progressDiv.style.display = loading ? 'block' : 'none';
    menuItems.forEach(item => {
      if (loading) {
        item.classList.add('loading');
      } else {
        item.classList.remove('loading');
      }
    });
  };

  // Save to Computer option
  saveBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'initScreenshot', mode: 'save' });
    window.close();
  });

  // Pin to Top option
  pinBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'initScreenshot', mode: 'pin' });
    window.close();
  });

  // Full page screenshot with loading state
  fullPageBtn.addEventListener('click', () => {
    setLoadingState(true);
    chrome.runtime.sendMessage({ type: 'initScreenshot', mode: 'fullpage' });
  });

  // Listen for capture completion
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'captureComplete') {
      setLoadingState(false);
      window.close();
    }
  });
});
