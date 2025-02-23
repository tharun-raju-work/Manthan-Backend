const config = require('./database');

module.exports = {
  development: {
    username: config.development.username,
    password: config.development.password,
    database: config.development.database,
    host: config.development.host,
    port: config.development.port,
    dialect: 'postgres',
    seederStorage: 'sequelize',
    seederStorageTableName: 'SequelizeData'
  },
  test: {
    ...config.test,
    dialect: 'postgres'
  },
  production: {
    ...config.production,
    dialect: 'postgres'
  }
}; 