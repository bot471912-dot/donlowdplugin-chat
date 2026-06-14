const loader = document.getElementById('loader');
const content = document.getElementById('content');

function showOverlay() {
  loader.style.display = 'none';
  content.style.display = 'flex';
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    showOverlay();
    if (window.chattable && typeof window.chattable.initialize === 'function') {
      window.chattable.initialize();
    }
  }, 1200);
});
