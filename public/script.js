document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const formatBtn = document.getElementById('formatBtn');
  const uploadStatus = document.getElementById('uploadStatus');
  const fileInfo = document.getElementById('fileInfo');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const statusText = document.getElementById('statusText');

  let selectedFile = null;

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  uploadZone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-btn') || e.target.closest('label')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'docx') {
      showError('Поддерживается только формат DOCX');
      return;
    }

    selectedFile = file;
    uploadStatus.style.display = 'block';
    fileInfo.textContent = `${file.name} (${formatSize(file.size)})`;
    statusText.textContent = 'Файл готов к обработке';
    statusText.className = 'status-text';
    progressBar.style.display = 'none';
    formatBtn.disabled = false;
  }

  formatBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    formatBtn.disabled = true;
    formatBtn.textContent = 'Обработка...';
    progressBar.style.display = 'block';
    progressFill.style.width = '30%';
    statusText.textContent = 'Форматируем документ по ГОСТ 7.32...';
    statusText.className = 'status-text';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      progressFill.style.width = '60%';

      const response = await fetch('/api/format', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Ошибка сервера');
      }

      progressFill.style.width = '100%';
      statusText.textContent = 'Готово! Скачивание начнётся автоматически...';
      statusText.className = 'status-text success';

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `formatted_${selectedFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      formatBtn.textContent = 'Форматировать по ГОСТ 7.32';
      formatBtn.disabled = false;
    } catch (err) {
      progressFill.style.width = '0%';
      progressBar.style.display = 'none';
      showError(err.message);
      formatBtn.textContent = 'Форматировать по ГОСТ 7.32';
      formatBtn.disabled = false;
    }
  });

  function showError(msg) {
    uploadStatus.style.display = 'block';
    statusText.textContent = msg;
    statusText.className = 'status-text error';
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  }
});

// FAQ toggle
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isActive = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
  if (!isActive) {
    item.classList.add('active');
  }
}
