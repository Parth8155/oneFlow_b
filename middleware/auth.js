const { verifyToken } = require('../services/authService');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if user is logged out
    const user = await User.findByPk(decoded.id);
    if (!user || user.logged_out) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User is logged out'
      });
    }

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Access denied',
      message: error.message
    });
  }
};

module.exports = {
  authenticate
};