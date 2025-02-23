const fs = require('fs');
const path = require('path');
const { sequelize } = require('../../config/database');
const { logError } = require('../../utils/logger.helper');

const models = {};

// Read all model files and import them
const modelFiles = fs.readdirSync(__dirname)
  .filter(file => 
    file.indexOf('.') !== 0 && 
    file !== 'index.js' && 
    file.slice(-3) === '.js'
  );

// First, define all models
modelFiles.forEach(file => {
  try {
    const modelDefinition = require(path.join(__dirname, file));
    const model = modelDefinition(sequelize);
    if (model.name) {
      models[model.name] = model;
    }
  } catch (error) {
    logError(`Error loading model ${file}:`, error);
  }
});

// Then, set up associations after all models are defined
Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    try {
      model.associate(models);
    } catch (error) {
      logError(`Error setting up associations for model ${model.name}:`, error);
    }
  }
});

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    logError('Unable to connect to the database:', err);
  });

module.exports = {
  sequelize,
  ...models
};
