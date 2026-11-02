const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const productRouter = require('./routes/products');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KT02 API Documentation',
      version: '1.0.0',
      description: 'Бэкэнд документация для kt02',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/routes/*.js'], 
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(express.json());
app.use(logger);


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.use('/products', productRouter);


app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Сервер успешно запущен на порту ${config.port} в режиме ${config.nodeEnv}`);
});
