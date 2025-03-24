// Get the screenshot data from URL parameters
window.onload = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const imageData = urlParams.get('image');
  if (imageData) {
    document.getElementById('screenshotImage').src = imageData;
  }

  // Add click event listener to the export button
  document.querySelector('.export-btn').addEventListener('click', toggleDropdown);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.matches('.export-btn')) {
      const dropdown = document.getElementById('exportDropdown');
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    }
  });

  // Add click event listeners for export options
  document.querySelectorAll('.dropdown-content a').forEach(item => {
    item.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      exportAs(format);
    });
  });
};

function toggleDropdown() {
  document.getElementById('exportDropdown').classList.toggle('show');
}

function exportAs(format) {
  const img = document.getElementById('screenshotImage');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1 : 0.8;
  
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${timestamp}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, mimeType, quality);
} 