const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Public routes
router.get('/health', (req, res) => res.json({ status: 'OK', message: 'Server is running' }));
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

module.exports = router;