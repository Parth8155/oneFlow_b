// Role hierarchy and permissions
const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  SALES_FINANCE: 'sales_finance',
  TEAM_MEMBER: 'team_member'
};

// Permission matrix defining what each role can do
const PERMISSIONS = {
  // User management
  CREATE_USER: [ROLES.ADMIN],
  UPDATE_USER: [ROLES.ADMIN],
  DELETE_USER: [ROLES.ADMIN],
  VIEW_ALL_USERS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],

  // Project management
  CREATE_PROJECT: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  UPDATE_PROJECT: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  DELETE_PROJECT: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_ALL_PROJECTS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE, ROLES.TEAM_MEMBER],
  MANAGE_PROJECT_MEMBERS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],

  // Task management
  CREATE_TASK: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  UPDATE_TASK: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  DELETE_TASK: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_TASKS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE, ROLES.TEAM_MEMBER],

  // Timesheet management
  CREATE_TIMESHEET: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  UPDATE_TIMESHEET: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  DELETE_TIMESHEET: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_TIMESHEETS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE, ROLES.TEAM_MEMBER],

  // Financial document management
  CREATE_SALES_ORDER: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  UPDATE_SALES_ORDER: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  DELETE_SALES_ORDER: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  VIEW_SALES_ORDERS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE],

  CREATE_PURCHASE_ORDER: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  UPDATE_PURCHASE_ORDER: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  DELETE_PURCHASE_ORDER: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_PURCHASE_ORDERS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE],

  CREATE_CUSTOMER_INVOICE: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  UPDATE_CUSTOMER_INVOICE: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  DELETE_CUSTOMER_INVOICE: [ROLES.ADMIN, ROLES.SALES_FINANCE],
  VIEW_CUSTOMER_INVOICES: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE],

  CREATE_VENDOR_BILL: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  UPDATE_VENDOR_BILL: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  DELETE_VENDOR_BILL: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_VENDOR_BILLS: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE],

  CREATE_EXPENSE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  UPDATE_EXPENSE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER],
  DELETE_EXPENSE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  APPROVE_EXPENSE: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  VIEW_EXPENSES: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SALES_FINANCE, ROLES.TEAM_MEMBER]
};

// Check if user has required role(s)
const hasRole = (userRole, requiredRoles) => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No specific roles required
  }

  // Admin has access to everything
  if (userRole === ROLES.ADMIN) {
    return true;
  }

  return requiredRoles.includes(userRole);
};

// Check if user has permission for specific action
const hasPermission = (userRole, permission) => {
  const allowedRoles = PERMISSIONS[permission];
  return hasRole(userRole, allowedRoles);
};

// Middleware function to check roles
const authorize = (...requiredRoles) => {
  return (req, res, next) => {
    try {
      // User info should be attached by auth middleware
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const userRole = req.user.role;

      if (!hasRole(userRole, requiredRoles)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authorization check failed'
      });
    }
  };
};

// Middleware function to check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const userRole = req.user.role;

      if (!hasPermission(userRole, permission)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions for this action'
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Permission check failed'
      });
    }
  };
};

// Check if user is project manager or admin
const isProjectManagerOrAdmin = (req, res, next) => {
  return authorize(ROLES.ADMIN, ROLES.PROJECT_MANAGER)(req, res, next);
};

// Check if user is sales/finance or admin
const isSalesFinanceOrAdmin = (req, res, next) => {
  return authorize(ROLES.ADMIN, ROLES.SALES_FINANCE)(req, res, next);
};

// Check if user can manage projects
const canManageProjects = (req, res, next) => {
  return requirePermission('CREATE_PROJECT')(req, res, next);
};

// Check if user can approve expenses
const canApproveExpenses = (req, res, next) => {
  return requirePermission('APPROVE_EXPENSE')(req, res, next);
};

// Check if user can create financial documents
const canCreateFinancialDocuments = (req, res, next) => {
  const userRole = req.user.role;
  const financialPermissions = [
    'CREATE_SALES_ORDER',
    'CREATE_PURCHASE_ORDER',
    'CREATE_CUSTOMER_INVOICE',
    'CREATE_VENDOR_BILL'
  ];

  const hasAnyFinancialPermission = financialPermissions.some(permission =>
    hasPermission(userRole, permission)
  );

  if (!hasAnyFinancialPermission) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Insufficient permissions to create financial documents'
    });
  }

  next();
};

// Check if user can manage tasks
const canManageTasks = (req, res, next) => {
  return requirePermission('CREATE_TASK')(req, res, next);
};

// Check if user can manage timesheets
const canManageTimesheets = (req, res, next) => {
  return requirePermission('CREATE_TIMESHEET')(req, res, next);
};

// Middleware to check if user is a member of a specific project
const isProjectMember = async (req, res, next) => {
  try {
    const { ProjectMember, Project } = require('../models');
    const userId = req.user.id;
    const projectId = req.params.projectId || req.body.project_id || req.params.id;

    if (!projectId) {
      return next(); // Skip check if no project ID
    }

    // Check if user is a member of the project or is admin/project manager
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.PROJECT_MANAGER) {
      return next();
    }

    const membership = await ProjectMember.findOne({
      where: {
        project_id: projectId,
        user_id: userId
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this project'
      });
    }

    next();
  } catch (error) {
    console.error('Project membership check error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify project membership'
    });
  }
};

// Middleware to check if user owns a resource or has admin permissions
const isOwnerOrAdmin = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    const userId = req.user.id;
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    // Admin can access everything
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Check if user owns the resource
    if (resourceUserId && parseInt(resourceUserId) === parseInt(userId)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own resources'
    });
  };
};

module.exports = {
  ROLES,
  PERMISSIONS,
  authorize,
  requirePermission,
  hasRole,
  hasPermission,
  isProjectManagerOrAdmin,
  isSalesFinanceOrAdmin,
  canManageProjects,
  canApproveExpenses,
  canCreateFinancialDocuments,
  canManageTasks,
  canManageTimesheets,
  isProjectMember,
  isOwnerOrAdmin
};