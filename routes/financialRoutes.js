const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All financial routes require authentication
router.use(authenticate);

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

// Get detailed budget breakdown for a project
// Accessible by admin, project_manager, sales_finance
router.get('/projects/:projectId/budget-breakdown',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getProjectBudgetBreakdown
);

// Get budget summary for all projects
// Accessible by admin, project_manager, sales_finance
router.get('/budget-summary',
  authorize('admin', 'project_manager', 'sales_finance'),
  financialController.getAllProjectsBudgetSummary
);

module.exports = router;