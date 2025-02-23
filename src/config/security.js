const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const securityConfig = (app) => {
  // Basic security headers
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
  }));

  // Rate limiting
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/health')
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 failed attempts per hour
    message: 'Too many failed login attempts, please try again later.',
  });

  app.use('/api', globalLimiter);
  app.use('/api/auth/login', authLimiter);

  // Data sanitization
  app.use(mongoSanitize()); // Against NoSQL injection
  app.use(xss()); // Against XSS

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'status',
      'sort',
      'page',
      'limit',
      'fields'
    ]
  }));

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

module.exports = securityConfig; 