const swaggerJsdoc = require('swagger-jsdoc');
const pkg = require('../../package.json');

const servers = {
  development: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  staging: [
    {
      url: 'https://staging-api.manthan.com',
      description: 'Staging server'
    }
  ],
  production: [
    {
      url: 'https://api.manthan.com',
      description: 'Production server'
    }
  ]
};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Manthan API Documentation',
      version: pkg.version,
      description: 'API documentation for Manthan Backend',
      contact: {
        name: 'API Support',
        email: 'support@manthan.com',
        url: 'https://manthan.com/support'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: servers[process.env.NODE_ENV || 'development'],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string'
            },
            code: {
              type: 'string'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            username: {
              type: 'string'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            isAdmin: {
              type: 'boolean'
            },
            isActive: {
              type: 'boolean'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            ownerId: {
              type: 'string',
              format: 'uuid'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',
    './src/models/**/*.js',
    './src/controllers/*.js'
  ]
};

module.exports = swaggerJsdoc(options); 