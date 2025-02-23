const initializeLimiters = require('./rate-limit.middleware');

let invitationLimiter;

const getInvitationLimiter = async () => {
  if (!invitationLimiter) {
    const limiters = await initializeLimiters();
    invitationLimiter = limiters.invitation;
  }
  return invitationLimiter;
};

// Export middleware function
module.exports = async (req, res, next) => {
  const limiter = await getInvitationLimiter();
  return limiter(req, res, next);
}; 