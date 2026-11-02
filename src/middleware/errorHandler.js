const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Размер файла превышает допустимый лимит в 2 МБ.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message && err.message.includes('Разрешены только файлы')) {
    return res.status(400).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
};

module.exports = errorHandler;