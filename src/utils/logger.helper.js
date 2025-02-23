const logger = require('../config/logger');

const logError = (context, error) => {
  logger.error({
    context,
    ...(typeof error === 'string' ? { message: error } : error)
  });
};

const logInfo = (context, message, meta = {}) => {
  logger.info({
    context,
    message,
    ...meta
  });
};

const logWarn = (context, message, meta = {}) => {
  logger.warn({
    context,
    message,
    ...meta
  });
};

const logDebug = (context, message, meta = {}) => {
  logger.debug({
    context,
    message,
    ...meta
  });
};

module.exports = {
  logError,
  logInfo,
  logWarn,
  logDebug
}; 