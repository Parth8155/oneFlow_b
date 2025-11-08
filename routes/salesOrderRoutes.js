const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All routes require authentication
router.use(authenticate);

// GET /api/sales-orders - Get all sales orders with advanced filtering and search
router.get('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), salesOrderController.getAllSalesOrders);

// POST /api/sales-orders - Create a new sales order
router.post('/', authorize('admin', 'sales_finance'), salesOrderController.createSalesOrder);

// GET /api/sales-orders/:id - Get a specific sales order by ID
router.get('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), salesOrderController.getSalesOrderById);

// PUT /api/sales-orders/:id - Update a sales order
router.put('/:id', authorize('admin', 'sales_finance'), salesOrderController.updateSalesOrder);

// DELETE /api/sales-orders/:id - Delete a sales order
router.delete('/:id', authorize('admin', 'sales_finance'), salesOrderController.deleteSalesOrder);

// PUT /api/sales-orders/:id/link-project - Link sales order to a project
router.put('/:id/link-project', authorize('admin', 'sales_finance'), salesOrderController.linkSalesOrderToProject);

module.exports = router;