const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All financial routes require authentication
router.use(authenticate);

// Get comprehensive financial analytics for a project
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/analytics',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectFinancialAnalytics
);

// Get all financial documents linked to a project
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/documents',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectFinancialDocuments
);

// Get project revenue
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/revenue',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectRevenue
);

// Get project cost
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/cost',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectCost
);

// Get project profit
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/profit',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectProfit
);

// Get budget usage percentage
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/budget-usage',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getBudgetUsagePercentage
);

module.exports = router;