document.addEventListener('DOMContentLoaded', () => {
  // Save to Computer option
  document.getElementById('saveToComputer').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshot', mode: 'save' });
      window.close(); // Close popup after selection
    });
  });

  // Pin to Top option
  document.getElementById('pinToTop').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startScreenshot', mode: 'pin' });
      window.close(); // Close popup after selection
    });
  });
});
