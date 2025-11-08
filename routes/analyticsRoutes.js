const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All analytics routes require authentication
router.use(authenticate);

// Get dashboard KPIs
// Accessible by admin, project_manager, sales_finance
router.get('/kpis',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getDashboardKPIs
);

// Get project progress data for all active projects
// Accessible by admin, project_manager, sales_finance
router.get('/projects/progress',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getProjectProgressData
);

// Get resource utilization data by team member
// Accessible by admin, project_manager, sales_finance
router.get('/resources/utilization',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getResourceUtilizationData
);

// Get cost vs revenue comparison data
// Accessible by admin, project_manager, sales_finance
router.get('/financial/comparison',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getCostRevenueComparisonData
);

// Get billable vs non-billable hours breakdown
// Accessible by admin, project_manager, sales_finance
router.get('/hours/billable',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getBillableHoursData
);

// Get tasks completed count
// Accessible by admin, project_manager, sales_finance
router.get('/tasks/completed',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getTasksCompletedCount
);

// Get financial summary data
// Accessible by admin, project_manager, sales_finance
router.get('/financial-summary',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getFinancialSummary
);

// Get comprehensive analytics data (all analytics in one response)
// Accessible by admin, project_manager, sales_finance
router.get('/comprehensive',
  authorize('admin', 'project_manager', 'sales_finance'),
  analyticsController.getComprehensiveAnalytics
);

module.exports = router;