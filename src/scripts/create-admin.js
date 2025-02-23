const { User } = require('../models/sql');
const logger = require('../config/logger');

async function createAdminUser() {
  try {
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'securepassword', // Will be hashed by model hooks
      username: 'admin',
      isAdmin: true,
      isActive: true
    });

    logger.info('Admin', 'Admin user created successfully', {
      id: admin.id,
      email: admin.email
    });
  } catch (error) {
    logger.error('Admin', 'Failed to create admin user', error);
  }
}

if (require.main === module) {
  createAdminUser();
} 