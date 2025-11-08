const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { authorize, requirePermission } = require('../middleware/authorization');

// All project routes require authentication
router.use(authenticate);

// GET /api/projects - Get all projects (with role-based filtering)
router.get('/',
  authorize('admin', 'project_manager', 'sales_finance', 'team_member'),
  projectController.getAllProjects
);

// POST /api/projects - Create a new project
router.post('/',
  authorize('admin', 'project_manager'),
  projectController.createProject
);

// GET /api/projects/:id - Get project by ID
router.get('/:id',
  authorize('admin', 'project_manager', 'sales_finance', 'team_member'),
  projectController.getProjectById
);

// PUT /api/projects/:id - Update project
router.put('/:id',
  authorize('admin', 'project_manager'),
  projectController.updateProject
);

// DELETE /api/projects/:id - Delete project
router.delete('/:id',
  authorize('admin', 'project_manager'),
  projectController.deleteProject
);

// GET /api/projects/:id/members - Get project members
router.get('/:id/members',
  authorize('admin', 'project_manager', 'sales_finance', 'team_member'),
  projectController.getProjectMembers
);

// POST /api/projects/:id/members - Add project member
router.post('/:id/members',
  authorize('admin', 'project_manager'),
  projectController.addProjectMember
);

// DELETE /api/projects/:id/members/:userId - Remove project member
router.delete('/:id/members/:userId',
  authorize('admin', 'project_manager'),
  projectController.removeProjectMember
);

module.exports = router;