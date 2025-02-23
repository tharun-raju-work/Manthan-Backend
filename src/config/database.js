const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('./logger');

// Get environment variables with defaults
const env = process.env.NODE_ENV || 'development';
const config = {
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'manthan_dev',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  dialect: 'postgres',
  logging: msg => logger.debug('Database', msg),
  pool: {
    max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.POSTGRES_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
};

let sequelize;
try {
  sequelize = new Sequelize(config);
} catch (error) {
  logger.error('Database', 'Failed to initialize Sequelize', error);
  sequelize = null;
}

const mongoConnect = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      logger.warn('Database', 'MongoDB URL not provided, skipping connection');
      return false;
    }
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 100
    });
    return true;
  } catch (error) {
    logger.error('Database', 'MongoDB connection failed', error);
    return false;
  }
};

const testConnection = async () => {
  try {
    if (sequelize) {
      await sequelize.authenticate();
      logger.info('Database', 'PostgreSQL connection successful');
    }

    if (process.env.MONGODB_URL) {
      await mongoConnect();
      logger.info('Database', 'MongoDB connection successful');
    }

    return true;
  } catch (error) {
    logger.error('Database', 'Database connection test failed', error);
    return false;
  }
};

const initializeDatabase = async () => {
  try {
    await testConnection();

    // Sync models in development
    if (process.env.NODE_ENV === 'development' && sequelize) {
      await sequelize.sync({ alter: true });
      logger.info('Database', 'Models synchronized successfully');
    }

    return true;
  } catch (error) {
    logger.error('Database', 'Database initialization failed', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Sequelize,
  mongoConnect,
  testConnection,
  initializeDatabase,
  config
};
