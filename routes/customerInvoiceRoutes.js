const express = require('express');
const router = express.Router();
const customerInvoiceController = require('../controllers/customerInvoiceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All routes require authentication
router.use(authenticate);

// GET /api/customer-invoices - Get all customer invoices with advanced filtering and search
router.get('/', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), customerInvoiceController.getAllCustomerInvoices);

// POST /api/customer-invoices - Create a new customer invoice
router.post('/', authorize('admin', 'sales_finance'), customerInvoiceController.createCustomerInvoice);

// GET /api/customer-invoices/:id - Get a specific customer invoice by ID
router.get('/:id', authorize('admin', 'sales_finance', 'project_manager', 'team_member'), customerInvoiceController.getCustomerInvoiceById);

// PUT /api/customer-invoices/:id - Update a customer invoice
router.put('/:id', authorize('admin', 'sales_finance'), customerInvoiceController.updateCustomerInvoice);

// DELETE /api/customer-invoices/:id - Delete a customer invoice
router.delete('/:id', authorize('admin', 'sales_finance'), customerInvoiceController.deleteCustomerInvoice);

// PUT /api/customer-invoices/:id/link-project - Link customer invoice to a project
router.put('/:id/link-project', authorize('admin', 'sales_finance'), customerInvoiceController.linkCustomerInvoiceToProject);

// PUT /api/customer-invoices/:id/link-sales-order - Link customer invoice to a sales order
router.put('/:id/link-sales-order', authorize('admin', 'sales_finance'), customerInvoiceController.linkCustomerInvoiceToSalesOrder);

module.exports = router;