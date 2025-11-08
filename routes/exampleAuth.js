// Example usage of authorization middleware
// This file demonstrates how to use the authorization middleware in routes

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  authorize,
  requirePermission,
  canManageProjects,
  canApproveExpenses,
  canCreateFinancialDocuments,
  isProjectMember,
  ROLES
} = require('../middleware/authorization');

// Example route that requires authentication only
router.get('/public-data', authenticate, (req, res) => {
  res.json({ message: 'This data requires authentication' });
});

// Example route that requires specific roles
router.post('/admin-only', authenticate, authorize(ROLES.ADMIN), (req, res) => {
  res.json({ message: 'Only admins can access this' });
});

// Example route that requires project manager or admin
router.post('/projects', authenticate, canManageProjects, (req, res) => {
  // Controller logic for creating projects
  res.json({ message: 'Project created successfully' });
});

// Example route that requires expense approval permissions
router.put('/expenses/:id/approve', authenticate, canApproveExpenses, (req, res) => {
  // Controller logic for approving expenses
  res.json({ message: 'Expense approved successfully' });
});

// Example route that requires financial document creation permissions
router.post('/sales-orders', authenticate, canCreateFinancialDocuments, (req, res) => {
  // Controller logic for creating sales orders
  res.json({ message: 'Sales order created successfully' });
});

// Example route that checks project membership
router.get('/projects/:projectId/tasks', authenticate, isProjectMember, (req, res) => {
  // Controller logic for getting project tasks
  res.json({ message: 'Project tasks retrieved successfully' });
});

// Example using specific permission check
router.delete('/projects/:id', authenticate, requirePermission('DELETE_PROJECT'), (req, res) => {
  // Controller logic for deleting projects
  res.json({ message: 'Project deleted successfully' });
});

module.exports = router;