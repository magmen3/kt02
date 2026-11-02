module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: error.details.map(item => ({
        field: item.path.join('.'),
        message: item.message
      }))
    });
  }

  req.body = value;
  next();
};
