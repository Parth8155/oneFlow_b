const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// GET /api/tasks - List tasks with filters
router.get('/', taskController.getAllTasks);

// POST /api/tasks - Create new task
router.post('/', authorize('admin', 'project_manager'), taskController.createTask);

// GET /api/tasks/:id - Get task details
router.get('/:id', taskController.getTaskById);

// PUT /api/tasks/:id - Update task
router.put('/:id', taskController.updateTask);

// POST /api/tasks/:id/log-hours - Log working hours for task
router.post('/:id/log-hours', taskController.logWorkingHours);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authorize('admin', 'project_manager'), taskController.deleteTask);

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', taskController.addTaskComment);

// GET /api/tasks/:id/comments - Get task comments
router.get('/:id/comments', taskController.getTaskComments);

// POST /api/tasks/:id/attachments - Upload attachment to task
router.post('/:id/attachments', upload.single('attachment'), taskController.uploadTaskAttachment);

module.exports = router;