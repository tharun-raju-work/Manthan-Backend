const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../config/swagger');

// Custom CSS to enhance Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info { margin: 20px 0 }
  .swagger-ui .scheme-container { margin: 20px 0 }
  .swagger-ui .info .title { font-size: 2.5em }
  .swagger-ui .info .title small { display: none }
`;

// Custom Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  customCss,
  customSiteTitle: "Manthan API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true
  }
};

// Mount Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpecs, swaggerUiOptions));

module.exports = router; 