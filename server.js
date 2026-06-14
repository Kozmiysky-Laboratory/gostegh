const express = require('express');
const multer = require('multer');
const path = require('path');
const { processDocx } = require('./lib/docxProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/format', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.docx') {
      return res.status(400).json({ error: 'Поддерживается только формат DOCX' });
    }

    const resultBuffer = await processDocx(req.file.buffer);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="formatted_${req.file.originalname}"`,
    });
    res.send(resultBuffer);
  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: 'Ошибка обработки файла' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GOSTegh server running at http://localhost:${PORT}`);
});
