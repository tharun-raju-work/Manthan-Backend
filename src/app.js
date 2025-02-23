const express = require('express');
const https = require('https');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

const sslConfig = require('./config/ssl');
const { performanceMonitoring, errorTracking } = require('./config/monitoring');
const handleCSRF = require('./middleware/csrf');
const { generalLimiter } = require('./middleware/rateLimiter');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
app.use(generalLimiter);

// CSRF protection
app.use(handleCSRF);

// Compression
app.use(compression());

// Monitoring
app.use(performanceMonitoring);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
// ... other routes

// Error handling
app.use(errorTracking);

// Create HTTPS server
const server = https.createServer(sslConfig, app);

server.listen(process.env.PORT, () => {
  logger.info(`Server running on port ${process.env.PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
