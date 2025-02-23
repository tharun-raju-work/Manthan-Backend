const net = require('net');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const PID_FILE = path.join(process.cwd(), '.server-pid');

const serverManager = {
  async checkExistingInstance() {
    try {
      // Check if PID file exists
      if (fs.existsSync(PID_FILE)) {
        const pid = fs.readFileSync(PID_FILE, 'utf8');
        
        try {
          // Check if process is still running
          process.kill(pid, 0);
          logger.error('Server', `Server is already running with PID ${pid}`);
          return true;
        } catch (e) {
          // Process not running, remove stale PID file
          fs.unlinkSync(PID_FILE);
        }
      }
      return false;
    } catch (error) {
      logger.error('Server', 'Error checking existing instance', error);
      return false;
    }
  },

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  },

  registerInstance() {
    // Write current PID to file
    fs.writeFileSync(PID_FILE, process.pid.toString());

    // Remove PID file on clean shutdown
    process.on('exit', () => {
      try {
        fs.unlinkSync(PID_FILE);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
  },

  async cleanup() {
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    } catch (error) {
      logger.error('Server', 'Error during cleanup', error);
    }
  }
};

module.exports = serverManager; 