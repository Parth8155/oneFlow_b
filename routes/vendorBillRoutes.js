const express = require('express');
const router = express.Router();
const vendorBillController = require('../controllers/vendorBillController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All routes require authentication
router.use(authenticate);

// GET /api/vendor-bills - Get all vendor bills with advanced filtering and search
router.get('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), vendorBillController.getAllVendorBills);

// POST /api/vendor-bills - Create a new vendor bill
router.post('/', authorize('admin', 'sales_finance'), vendorBillController.createVendorBill);

// GET /api/vendor-bills/:id - Get a specific vendor bill by ID
router.get('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), vendorBillController.getVendorBillById);

// PUT /api/vendor-bills/:id - Update a vendor bill
router.put('/:id', authorize('admin', 'sales_finance'), vendorBillController.updateVendorBill);

// DELETE /api/vendor-bills/:id - Delete a vendor bill
router.delete('/:id', authorize('admin', 'sales_finance'), vendorBillController.deleteVendorBill);

// PUT /api/vendor-bills/:id/link-project - Link vendor bill to a project
router.put('/:id/link-project', authorize('admin', 'sales_finance'), vendorBillController.linkVendorBillToProject);

// PUT /api/vendor-bills/:id/link-purchase-order - Link vendor bill to a purchase order
router.put('/:id/link-purchase-order', authorize('admin', 'sales_finance'), vendorBillController.linkVendorBillToPurchaseOrder);

module.exports = router;