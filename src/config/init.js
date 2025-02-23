const { sequelize, mongoConnect, testPostgresConnection } = require('./database');
const models = require('../models/sql');

const initializeDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await testPostgresConnection();

    // Sync all models with database
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
    }

    // Connect to MongoDB
    await mongoConnect();

    console.log('All database connections established successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

module.exports = initializeDatabase;
