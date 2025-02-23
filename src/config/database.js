const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
require('dotenv').config();

// PostgreSQL Configuration
const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  dialect: 'postgres',
  logging: false, // Disable logging in production
  pool: {
    max: 20, // Maximum number of connection in pool
    min: 5, // Minimum number of connection in pool
    acquire: 60000, // Maximum time, in milliseconds, that pool will try to get connection before throwing error
    idle: 10000, // Maximum time, in milliseconds, that a connection can be idle before being released
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
    statement_timeout: 1000, // Timeout for queries (in ms)
    idle_in_transaction_session_timeout: 10000, // Timeout for idle transactions (in ms)
  },
});

// MongoDB Configuration
const mongoConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      maxPoolSize: 100, // Maximum number of connections in pool
      minPoolSize: 5, // Minimum number of connections in pool
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      writeConcern: {
        w: 'majority', // Ensure writes are acknowledged by a majority of replicas
      },
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

// PostgreSQL connection test
const testPostgresConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  mongoConnect,
  testPostgresConnection,
};
