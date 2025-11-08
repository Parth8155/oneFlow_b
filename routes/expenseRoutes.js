const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const { uploadReceipt } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// GET /api/expenses - Get all expenses with advanced filtering and search
router.get('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), expenseController.getAllExpenses);

// POST /api/expenses - Create a new expense (with optional receipt upload)
router.post('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), uploadReceipt.single('receipt'), expenseController.createExpense);

// GET /api/expenses/:id - Get a specific expense by ID
router.get('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), expenseController.getExpenseById);

// PUT /api/expenses/:id - Update an expense (with optional receipt upload)
router.put('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), uploadReceipt.single('receipt'), expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete an expense
router.delete('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), expenseController.deleteExpense);

// PUT /api/expenses/:id/approve - Approve an expense (Project Manager or Admin/Sales Finance only)
router.put('/:id/approve', authorize('admin', 'sales_finance', 'project_manager'), expenseController.approveExpense);

// PUT /api/expenses/:id/reject - Reject an expense (Project Manager or Admin/Sales Finance only)
router.put('/:id/reject', authorize('admin', 'sales_finance', 'project_manager'), expenseController.rejectExpense);

// PUT /api/expenses/:id/link-project - Link expense to a project
router.put('/:id/link-project', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), expenseController.linkExpenseToProject);

module.exports = router;