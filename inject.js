// Inject html2canvas script if not already present
if (!document.querySelector('#html2canvas-script')) {
    const script = document.createElement('script');
    script.id = 'html2canvas-script';
    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    document.head.appendChild(script);
}
