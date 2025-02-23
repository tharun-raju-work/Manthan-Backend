const serverManager = require('../config/server');
const logger = require('../config/logger');

(async () => {
  try {
    await serverManager.cleanup();
    logger.info('Server', 'Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Server', 'Cleanup failed', error);
    process.exit(1);
  }
})(); 