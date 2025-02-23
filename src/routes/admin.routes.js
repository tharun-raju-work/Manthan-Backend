const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const redisClient = require('../config/redis');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const logger = require('../config/logger');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin operations and system management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/v1/admin/redis/status:
 *   get:
 *     summary: Get Redis server status
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Redis status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     info:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/redis/status',
  auth.required,       // Require authentication
  auth.requireAdmin,   // Require admin role
  AdminController.getRedisStatus
);

/**
 * @swagger
 * /api/v1/admin/redis/flush:
 *   post:
 *     summary: Flush Redis database
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Redis database flushed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/redis/flush',
  auth.required,
  auth.requireAdmin,
  AdminController.flushRedis
);

// Helper to parse Redis INFO command output
function parseRedisInfo(info) {
  const sections = {};
  let currentSection = 'server';

  info.split('\n').forEach(line => {
    if (line.startsWith('#')) {
      currentSection = line.substring(1).trim().toLowerCase();
      sections[currentSection] = {};
    } else if (line.includes(':')) {
      const [key, value] = line.split(':');
      if (key && value) {
        sections[currentSection][key.trim()] = value.trim();
      }
    }
  });

  return sections;
}

// Helper to parse Redis CLIENT LIST output
function parseClientList(list) {
  return list.split('\n')
    .filter(line => line.length > 0)
    .map(line => {
      const client = {};
      line.split(' ').forEach(item => {
        const [key, value] = item.split('=');
        if (key && value) {
          client[key] = value;
        }
      });
      return client;
    });
}

// Get database tables info
router.get('/database/tables', auth.requireAdmin, async (req, res) => {
  try {
    // Get all tables
    const tables = await sequelize.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
        pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `, { type: QueryTypes.SELECT });

    res.json({
      status: 'success',
      data: tables
    });
  } catch (error) {
    logger.error('Admin', 'Database info error', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get database information',
      error: error.message
    });
  }
});

// Get table structure
router.get('/database/tables/:tableName', auth.requireAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;

    // Get table columns
    const columns = await sequelize.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = :tableName
      ORDER BY ordinal_position;
    `, {
      replacements: { tableName },
      type: QueryTypes.SELECT
    });

    // Get table constraints
    const constraints = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_name = :tableName;
    `, {
      replacements: { tableName },
      type: QueryTypes.SELECT
    });

    res.json({
      status: 'success',
      data: {
        tableName,
        columns,
        constraints
      }
    });
  } catch (error) {
    console.error('Table info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get table information',
      error: error.message
    });
  }
});

module.exports = router; 