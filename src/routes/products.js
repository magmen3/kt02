
const express = require('express');
const router = express.Router();
const Joi = require('joi');

const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

// ======================================
// ТОВАРЫ
// ======================================

let products = [
  {
    id: 1,
    name: 'Беспроводные наушники',
    price: 4999,
    category: 'electronics',
    stock: 25,
    description: 'Качественные наушники с активным шумоподавлением',
    imageUrl: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Джинсы классические',
    price: 2999,
    category: 'clothing',
    stock: 15,
    description: 'Удобные джинсы из плотного хлопка',
    imageUrl: '',
    createdAt: new Date().toISOString()
  }
];

let nextId = 3;

// ======================================
// JOI VALIDATION
// ======================================

const productCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  price: Joi.number().greater(0).required(),
  category: Joi.string()
    .valid('electronics', 'clothing', 'food', 'other')
    .required(),
  stock: Joi.number().integer().min(0).default(0),
  description: Joi.string().max(500).allow('', null).default('')
});

const productUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  price: Joi.number().greater(0),
  category: Joi.string()
    .valid('electronics', 'clothing', 'food', 'other'),
  stock: Joi.number().integer().min(0),
  description: Joi.string().max(500).allow('', null)
}).min(1);

// ======================================
// HELPERS
// ======================================

const findProduct = id =>
  products.find(p => p.id === Number(id));

const notFoundError = () => {
  const error = new Error('Товар не найден');
  error.statusCode = 404;
  return error;
};

const removeEmptyPatchFields = (req, res, next) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (value === '' && key !== 'description') {
      delete req.body[key];
    }
  }
  next();
};

// ======================================
// GET /products
// СПИСОК ТОВАРОВ
// ======================================

/**
 * @swagger
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Получить список товаров
 *     description: Список с фильтрацией, поиском и пагинацией.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electronics, clothing, food, other]
 *         description: Категория товара
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Минимальная цена
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Максимальная цена
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по названию
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Количество товаров
 *     responses:
 *       200:
 *         description: Список успешно получен
 *       400:
 *         description: Некорректные параметры
 */

router.get('/', (req, res) => {
  let {
    category,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 10
  } = req.query;

  page = Number(page);
  limit = Number(limit);

  if (
    !Number.isInteger(page) || page < 1 ||
    !Number.isInteger(limit) || limit < 1 || limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: 'Некорректные параметры пагинации'
    });
  }

  if (
    minPrice !== undefined &&
    (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Некорректная минимальная цена'
    });
  }

  if (
    maxPrice !== undefined &&
    (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Некорректная максимальная цена'
    });
  }

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Минимальная цена больше максимальной'
    });
  }

  let result = [...products];

  if (category) {
    result = result.filter(p => p.category === category);
  }

  if (minPrice !== undefined) {
    result = result.filter(p => p.price >= Number(minPrice));
  }

  if (maxPrice !== undefined) {
    result = result.filter(p => p.price <= Number(maxPrice));
  }

  if (search) {
    result = result.filter(p =>
      p.name.toLowerCase().includes(String(search).toLowerCase())
    );
  }

  const total = result.length;
  const totalPages = Math.ceil(total / limit);

  const data = result.slice(
    (page - 1) * limit,
    page * limit
  );

  res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  });
});

// ======================================
// GET /products/:id
// ПОЛУЧИТЬ ТОВАР
// ======================================

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Получить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *       404:
 *         description: Товар не найден
 */

router.get('/:id', (req, res, next) => {
  const product = findProduct(req.params.id);

  if (!product) return next(notFoundError());

  res.json({
    success: true,
    product
  });
});

// ======================================
// POST /products
// СОЗДАТЬ ТОВАР
// ======================================

/**
 * @swagger
 * /products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Создать товар
 *     description: Заполните поля формы для создания товара.
 *     operationId: createProduct
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Название товара
 *               price:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Цена
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *                 description: Категория
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Количество на складе
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Описание
 *     responses:
 *       201:
 *         description: Товар создан
 *       400:
 *         description: Ошибка валидации
 */

router.post('/', validate(productCreateSchema), (req, res) => {
  const newProduct = {
    id: nextId++,
    name: req.body.name,
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock ?? 0,
    description: req.body.description ?? '',
    imageUrl: '',
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: 'Товар успешно создан',
    product: newProduct
  });
});

// ======================================
// PUT /products/:id
// ПОЛНОЕ ОБНОВЛЕНИЕ
// ======================================

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Полностью обновить товар
 *     description: Заполните все основные поля товара.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               price:
 *                 type: number
 *                 exclusiveMinimum: 0
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Товар не найден
 */

router.put('/:id', validate(productCreateSchema), (req, res, next) => {
  const index = products.findIndex(
    p => p.id === Number(req.params.id)
  );

  if (index === -1) return next(notFoundError());

  products[index] = {
    ...products[index],
    name: req.body.name,
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock ?? 0,
    description: req.body.description ?? ''
  };

  res.json({
    success: true,
    message: 'Товар полностью обновлен',
    product: products[index]
  });
});

// ======================================
// PATCH /products/:id
// ЧАСТИЧНОЕ ОБНОВЛЕНИЕ
// ======================================

/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     tags:
 *       - Products
 *     summary: Изменить отдельные параметры товара
 *     description: >
 *       Заполните только те поля, которые хотите изменить.
 *       Остальные параметры останутся без изменений.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Новое название
 *               price:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 description: Новая цена
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *                 description: Новая категория
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 description: Новое количество
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Новое описание
 *     responses:
 *       200:
 *         description: Параметры обновлены
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Товар не найден
 */

router.patch(
  '/:id',
  removeEmptyPatchFields,
  validate(productUpdateSchema),
  (req, res, next) => {
    const index = products.findIndex(
      p => p.id === Number(req.params.id)
    );

    if (index === -1) return next(notFoundError());

    products[index] = {
      ...products[index],
      ...req.body
    };

    res.json({
      success: true,
      message: 'Параметры товара успешно обновлены',
      product: products[index]
    });
  }
);

// ======================================
// DELETE /products/:id
// УДАЛЕНИЕ ТОВАРА
// ======================================

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Удалить товар
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Товар удален
 *       404:
 *         description: Товар не найден
 */

router.delete('/:id', (req, res, next) => {
  const index = products.findIndex(
    p => p.id === Number(req.params.id)
  );

  if (index === -1) return next(notFoundError());

  const deleted = products.splice(index, 1)[0];

  res.json({
    success: true,
    message: 'Товар успешно удален',
    product: deleted
  });
});

// ======================================
// POST /products/:id/image
// ЗАГРУЗКА ИЗОБРАЖЕНИЯ
// ======================================

/**
 * @swagger
 * /products/{id}/image:
 *   post:
 *     tags:
 *       - Products
 *     summary: Загрузить изображение товара
 *     description: Выберите файл изображения на устройстве.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Файл изображения
 *     responses:
 *       200:
 *         description: Изображение загружено
 *       400:
 *         description: Файл не предоставлен
 *       404:
 *         description: Товар не найден
 */

router.post('/:id/image', upload.single('image'), (req, res, next) => {
  const product = findProduct(req.params.id);

  if (!product) return next(notFoundError());

  if (!req.file) {
    const error = new Error('Файл изображения не был предоставлен');
    error.statusCode = 400;
    return next(error);
  }

  product.imageUrl = `/uploads/products/${req.file.filename}`;

  res.json({
    success: true,
    message: 'Изображение успешно загружено',
    imageUrl: product.imageUrl,
    product
  });
});

// ======================================
// EXPORT
// ======================================

module.exports = router;
