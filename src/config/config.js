module.exports = {
  // ... other config
  auth: {
    // ... other auth config
    bypassAdminCheck: process.env.BYPASS_ADMIN_CHECK === 'true' || false
  }
};
