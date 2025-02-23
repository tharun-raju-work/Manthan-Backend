const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const config = require('../config/sequelize');
const logger = require('../config/logger');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig);

const umzug = new Umzug({
  migrations: {
    path: path.join(__dirname, '../migrations'),
    params: [
      sequelize.getQueryInterface(),
      Sequelize
    ],
    pattern: /\.js$/
  },
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

const migrate = async () => {
  try {
    // Check pending migrations
    const pending = await umzug.pending();
    if (pending.length > 0) {
      logger.info('Migration', `Found ${pending.length} pending migrations`);
      
      // Run migrations
      await umzug.up();
      logger.info('Migration', 'All migrations completed successfully');
    } else {
      logger.info('Migration', 'No pending migrations');
    }

    // Get migration status
    const executed = await umzug.executed();
    logger.info('Migration', `Total executed migrations: ${executed.length}`);

    process.exit(0);
  } catch (error) {
    logger.error('Migration', 'Migration failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// Add migration status command
const status = async () => {
  const executed = await umzug.executed();
  const pending = await umzug.pending();

  console.log('Executed migrations:', executed.map(m => m.name));
  console.log('Pending migrations:', pending.map(m => m.name));
};

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'status':
    status();
    break;
  case 'up':
    migrate();
    break;
  case 'down':
    umzug.down().then(() => process.exit(0));
    break;
  default:
    migrate();
} 