const WebSocket = require('ws');
const { register } = require('../config/metrics');
const { logger } = require('../config/logger');

class MetricsWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/metrics',
      clientTracking: true,
      maxPayload: 50 * 1024, // 50KB max payload
    });
    this.clients = new Set();
    this.setupWebSocket();
    this.startMetricsUpdates();
    this.setupHeartbeat();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      logger.info(`New WebSocket connection from ${req.socket.remoteAddress}`);
      
      // Set up client
      ws.isAlive = true;
      ws.ip = req.socket.remoteAddress;
      this.clients.add(ws);

      // Handle pong messages
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          logger.error('WebSocket message error:', error);
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        logger.info(`Client disconnected: ${ws.ip}`);
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${ws.ip}:`, error);
        this.clients.delete(ws);
      });

      // Send initial metrics
      this.sendMetrics(ws);
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          logger.info(`Terminating inactive client: ${ws.ip}`);
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Check every 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  async getMetrics() {
    try {
      return await register.metrics();
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return null;
    }
  }

  async sendMetrics(ws) {
    try {
      const metrics = await this.getMetrics();
      if (metrics && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'metrics', 
          data: metrics,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      logger.error(`Error sending metrics to client ${ws.ip}:`, error);
    }
  }

  async broadcastMetrics() {
    if (this.clients.size > 0) {
      const metrics = await this.getMetrics();
      if (!metrics) return;

      const data = JSON.stringify({ 
        type: 'metrics', 
        data: metrics,
        timestamp: Date.now()
      });

      const deadClients = new Set();

      this.clients.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          } else if (client.readyState === WebSocket.CLOSED) {
            deadClients.add(client);
          }
        } catch (error) {
          logger.error(`Error broadcasting to client ${client.ip}:`, error);
          deadClients.add(client);
        }
      });

      // Clean up dead clients
      deadClients.forEach(client => {
        this.clients.delete(client);
      });
    }
  }

  startMetricsUpdates() {
    // Send updates every 5 seconds
    const interval = setInterval(() => this.broadcastMetrics(), 5000);

    // Clean up on process exit
    process.on('SIGTERM', () => {
      clearInterval(interval);
      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    });
  }
}

module.exports = MetricsWebSocket; 