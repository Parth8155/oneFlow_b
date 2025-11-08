const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All routes require authentication
router.use(authenticate);

// GET /api/purchase-orders - Get all purchase orders with advanced filtering and search
router.get('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), purchaseOrderController.getAllPurchaseOrders);

// POST /api/purchase-orders - Create a new purchase order
router.post('/', authorize('admin', 'project_manager', 'sales_finance'), purchaseOrderController.createPurchaseOrder);

// GET /api/purchase-orders/:id - Get a specific purchase order by ID
router.get('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), purchaseOrderController.getPurchaseOrderById);

// PUT /api/purchase-orders/:id - Update a purchase order
router.put('/:id', authorize('admin', 'project_manager', 'sales_finance'), purchaseOrderController.updatePurchaseOrder);

// DELETE /api/purchase-orders/:id - Delete a purchase order
router.delete('/:id', authorize('admin', 'project_manager', 'sales_finance'), purchaseOrderController.deletePurchaseOrder);

// PUT /api/purchase-orders/:id/link-project - Link purchase order to a project
router.put('/:id/link-project', authorize('admin', 'project_manager', 'sales_finance'), purchaseOrderController.linkPurchaseOrderToProject);

module.exports = router;