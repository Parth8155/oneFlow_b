const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');

// All routes require authentication
router.use(authenticate);

// GET /api/timesheets - List timesheets with filters
router.get('/', timesheetController.getAllTimesheets);

// POST /api/timesheets - Create new timesheet
router.post('/', timesheetController.createTimesheet);

// GET /api/timesheets/:id - Get timesheet details
router.get('/:id', timesheetController.getTimesheetById);

// PUT /api/timesheets/:id - Update timesheet
router.put('/:id', timesheetController.updateTimesheet);

// DELETE /api/timesheets/:id - Delete timesheet
router.delete('/:id', authorize('admin', 'project_manager'), timesheetController.deleteTimesheet);

// GET /api/timesheets/task/:taskId - Get timesheets for a specific task
router.get('/task/:taskId', timesheetController.getTimesheetsByTask);

module.exports = router;