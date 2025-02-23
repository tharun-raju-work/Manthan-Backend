const fs = require('fs');
const path = require('path');

// Default to empty objects if SSL files are not found
let ssl = {};

if (process.env.NODE_ENV === 'production' && process.env.SSL_ENABLED === 'true') {
  try {
    ssl = {
      key: process.env.SSL_KEY_PATH ? fs.readFileSync(process.env.SSL_KEY_PATH) : undefined,
      cert: process.env.SSL_CERT_PATH ? fs.readFileSync(process.env.SSL_CERT_PATH) : undefined,
      ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined
    };
  } catch (error) {
    console.warn('SSL files not found, running without SSL');
  }
}

module.exports = ssl;
