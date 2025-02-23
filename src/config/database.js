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

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    dialectOptions: config.dialectOptions
  }
);

// MongoDB Configuration
const mongoConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 100,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
      retryWrites: true,
      writeConcern: {
        w: 'majority'
      }
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database', 'PostgreSQL connection successful');
    return true;
  } catch (error) {
    logger.error('Database', 'PostgreSQL connection error', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

// Simplified database initialization
const initializeDatabase = async () => {
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to PostgreSQL');
    }

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database', 'Models synchronized successfully');
    }

    return true;
  } catch (error) {
    logger.error('Database', 'Database initialization failed', {
      error: error.message,
      stack: error.stack
    });
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
