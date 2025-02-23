const csrf = require('csurf');
const logger = require('../config/logger');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

const handleCSRF = (req, res, next) => {
  csrfProtection(req, res, (err) => {
    if (err) {
      logger.warn('CSRF validation failed:', err);
      return res.status(403).json({
        error: 'CSRF validation failed',
        code: 'CSRF_ERROR',
      });
    }
    next();
  });
};

module.exports = handleCSRF;
