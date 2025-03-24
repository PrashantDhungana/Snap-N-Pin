document.addEventListener('DOMContentLoaded', () => {
  // Save to Computer option
  document.getElementById('saveToComputer').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'initScreenshot', mode: 'save' });
    window.close(); // Close popup after selection
  });

  // Pin to Top option
  document.getElementById('pinToTop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'initScreenshot', mode: 'pin' });
    window.close(); // Close popup after selection
  });

  // Updated fullpage screenshot listener
  document.getElementById('fullPageScreenshot').addEventListener('click', async () => {
    chrome.runtime.sendMessage({ type: 'captureFullPage' });
    window.close();
  });
});
