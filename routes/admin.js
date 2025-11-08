const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  forceLogoutUser
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(authenticate);

// Get all users (admin and project managers can view users)
router.get('/users', authorize('admin', 'project_manager'), getAllUsers);

// Create a new user
router.post('/users', createUser);

// Update a user
router.put('/users/:id', updateUser);

// Delete a user
router.delete('/users/:id', deleteUser);

// Force logout a user
router.post('/users/:id/logout', forceLogoutUser);

// Other admin routes require admin role
router.use(authorize('admin'));

module.exports = router;