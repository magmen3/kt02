const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');


let products = [
  {
    id: 1,
    name: "Беспроводные наушники",
    price: 4999,
    category: "electronics",
    stock: 25,
    description: "Качественные наушники с активным шумоподавлением",
    imageUrl: "",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Джинсы классические",
    price: 2999,
    category: "clothing",
    stock: 15,
    description: "Удобные джинсы из плотного хлопка",
    imageUrl: "",
    createdAt: new Date().toISOString()
  }
];
let nextId = 3;


const productCreateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  price: Joi.number().greater(0).required(),
  category: Joi.string().valid('electronics', 'clothing', 'food', 'other').required(),
  stock: Joi.number().integer().min(0).default(0),
  description: Joi.string().max(500).allow('', null)
});

const productUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  price: Joi.number().greater(0),
  category: Joi.string().valid('electronics', 'clothing', 'food', 'other'),
  stock: Joi.number().integer().min(0),
  description: Joi.string().max(500).allow('', null)
});


/**
 * @swagger
 * /products:
 *   get:
 *     summary: Получить список товаров с фильтрацией и пагинацией
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [electronics, clothing, food, other]
 *         description: Фильтр по категории
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Минимальная цена
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Максимальная цена
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Успешный ответ со списком и пагинацией
 */
router.get('/', (req, res) => {
  let { category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
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

  const total = result.length;
  page = parseInt(page);
  limit = parseInt(limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = result.slice(startIndex, startIndex + limit);

  res.json({
    data: paginatedData,
    total,
    page,
    limit
  });
});


/**
 * @swagger
 * /products/{id}:
 *   get:
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
 *         description: Объект товара
 *       404:
 *         description: Товар не найден
 */
router.get('/:id', (req, res, next) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    const error = new Error('Товар не найден');
    error.statusCode = 404;
    return next(error);
  }
  res.json(product);
});


/**
 * @swagger
 * /products:
 *   post:
 *     summary: Создать новый товар
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: Беспроводные наушники
 *               price:
 *                 type: number
 *                 example: 4999
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *                 example: electronics
 *               stock:
 *                 type: integer
 *                 example: 25
 *               description:
 *                 type: string
 *                 example: Качественные наушники
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *       400:
 *         description: Ошибка валидации
 */
router.post('/', validate(productCreateSchema), (req, res) => {
  const newProduct = {
    id: nextId++,
    name: req.body.name,
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock !== undefined ? req.body.stock : 0,
    description: req.body.description || '',
    imageUrl: '',
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});


/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Полностью обновить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *               stock:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар успешно обновлен
 *       404:
 *         description: Товар не найден
 */
router.put('/:id', validate(productCreateSchema), (req, res, next) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    const error = new Error('Товар не найден');
    error.statusCode = 404;
    return next(error);
  }

  products[index] = {
    id: products[index].id,
    name: req.body.name,
    price: req.body.price,
    category: req.body.category,
    stock: req.body.stock !== undefined ? req.body.stock : 0,
    description: req.body.description || '',
    imageUrl: products[index].imageUrl,
    createdAt: products[index].createdAt
  };

  res.json(products[index]);
});


/**
 * @swagger
 * /products/{id}:
 *   patch:
 *     summary: Частично обновить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *                 enum: [electronics, clothing, food, other]
 *               stock:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар успешно обновлен
 *       404:
 *         description: Товар не найден
 */
router.patch('/:id', validate(productUpdateSchema), (req, res, next) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    const error = new Error('Товар не найден');
    error.statusCode = 404;
    return next(error);
  }

  products[index] = {
    ...products[index],
    ...req.body
  };

  res.json(products[index]);
});


/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Удалить товар по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Товар успешно удален
 *       404:
 *         description: Товар не найден
 */
router.delete('/:id', (req, res, next) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) {
    const error = new Error('Товар не найден');
    error.statusCode = 404;
    return next(error);
  }

  const deleted = products.splice(index, 1);
  res.json({ message: 'Товар успешно удален', product: deleted[0] });
});


/**
 * @swagger
 * /products/{id}/image:
 *   post:
 *     summary: Загрузить изображение для товара
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
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Файл изображения для загрузки
 *     responses:
 *       200:
 *         description: Изображение успешно загружено
 *       400:
 *         description: Файл не предоставлен
 *       404:
 *         description: Товар не найден
 */
router.post('/:id/image', upload.single('image'), (req, res, next) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    const error = new Error('Товар не найден');
    error.statusCode = 404;
    return next(error);
  }

  if (!req.file) {
    const error = new Error('Файл изображения не был предоставлен');
    error.statusCode = 400;
    return next(error);
  }

  product.imageUrl = `/uploads/products/${req.file.filename}`;
  res.json({ message: 'Изображение успешно загружено', imageUrl: product.imageUrl, product });
});

module.exports = router;
