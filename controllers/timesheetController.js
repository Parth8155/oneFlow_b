const { Timesheet, Task, Project, User, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const getAllTimesheets = async (req, res) => {
  try {
    const {
      user_id,
      project_id,
      task_id,
      start_date,
      end_date,
      is_billable,
      page = 1,
      limit = 20
    } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where clause based on filters
    let whereClause = {};

    // Apply user filter if provided
    if (user_id) {
      whereClause.user_id = user_id;
    }

    // Apply project filter if provided
    if (project_id) {
      whereClause.project_id = project_id;

      // Check if user has access to this project
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this project'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(project_id);
        if (!project || project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: project_id, user_id: userId }
          });
          if (!isMember) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this project'
            });
          }
        }
      }
    }

    // Apply task filter if provided
    if (task_id) {
      whereClause.task_id = task_id;
    }

    // Apply date range filter if provided
    if (start_date || end_date) {
      whereClause.date = {};
      if (start_date) {
        whereClause.date[Op.gte] = start_date;
      }
      if (end_date) {
        whereClause.date[Op.lte] = end_date;
      }
    }

    // Apply billable filter if provided
    if (is_billable !== undefined) {
      whereClause.is_billable = is_billable === 'true';
    }

    // Apply role-based filtering if no specific filters provided
    if (!user_id && !project_id) {
      if (userRole === 'team_member') {
        // Team members can only see their own timesheets
        whereClause.user_id = userId;
      } else if (userRole === 'project_manager') {
        // Project managers can see timesheets for projects they manage or are assigned to
        const managedProjects = await Project.findAll({
          where: { project_manager_id: userId },
          attributes: ['id']
        });
        const managedProjectIds = managedProjects.map(p => p.id);

        const assignedProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const assignedProjectIds = assignedProjects.map(pm => pm.project_id);

        const allProjectIds = [...new Set([...managedProjectIds, ...assignedProjectIds])];

        whereClause.project_id = { [Op.in]: allProjectIds };
      }
      // Admin and sales_finance can see all timesheets
    }

    // Pagination
    const offset = (page - 1) * limit;

    const timesheets = await Timesheet.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email', 'hourly_rate']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      timesheets: timesheets.rows,
      pagination: {
        total: timesheets.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(timesheets.count / limit)
      }
    });

  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve timesheets'
    });
  }
};

const createTimesheet = async (req, res) => {
  try {
    const { task_id, hours, date, is_billable, description } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!task_id || !hours || !date) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Task ID, hours, and date are required'
      });
    }

    // Validate hours
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Hours must be a positive number'
      });
    }

    // Validate date is not in the future
    const entryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (entryDate > today) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Date cannot be in the future'
      });
    }

    // Get task details and check access
    const task = await Task.findByPk(task_id, {
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'project_manager_id']
      }]
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
    }

    // Check permissions
    let canCreate = false;

    if (userRole === 'admin') {
      canCreate = true;
    } else if (userRole === 'project_manager') {
      // Project managers can create timesheets for their projects
      if (task.project.project_manager_id === userId) {
        canCreate = true;
      }
    } else if (userRole === 'team_member') {
      // Team members can only create timesheets for tasks assigned to them
      if (task.assigned_to === userId) {
        canCreate = true;
      }
    }

    if (!canCreate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to create timesheets for this task'
      });
    }

    // Get user hourly rate for cost calculation
    const user = await User.findByPk(userId, { attributes: ['hourly_rate'] });
    if (!user || !user.hourly_rate) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'User hourly rate is not set'
      });
    }

    // Calculate cost
    const cost = hoursNum * parseFloat(user.hourly_rate);

    // Create timesheet
    const timesheet = await Timesheet.create({
      task_id,
      user_id: userId,
      project_id: task.project_id,
      hours: hoursNum,
      date,
      is_billable: is_billable || false,
      description: description || null,
      cost
    });

    // Fetch the created timesheet with associations
    const createdTimesheet = await Timesheet.findByPk(timesheet.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email', 'hourly_rate']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'Timesheet created successfully',
      timesheet: createdTimesheet
    });

  } catch (error) {
    console.error('Create timesheet error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create timesheet'
    });
  }
};

const getTimesheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const timesheet = await Timesheet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email', 'hourly_rate']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!timesheet) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Timesheet not found'
      });
    }

    // Check access permissions
    if (userRole === 'team_member') {
      // Team members can only see their own timesheets
      if (timesheet.user_id !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view your own timesheets'
        });
      }
    } else if (userRole === 'project_manager') {
      // Project managers can see timesheets for projects they manage
      const project = await Project.findByPk(timesheet.project_id);
      if (project.project_manager_id !== userId) {
        const isMember = await ProjectMember.findOne({
          where: { project_id: timesheet.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this timesheet'
          });
        }
      }
    }

    res.json({
      timesheet
    });

  } catch (error) {
    console.error('Get timesheet by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve timesheet'
    });
  }
};

const updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, date, is_billable, description } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const timesheet = await Timesheet.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'task',
          include: [{
            model: Project,
            as: 'project',
            attributes: ['id', 'project_manager_id']
          }]
        },
        {
          model: User,
          as: 'user',
          attributes: ['hourly_rate']
        }
      ]
    });

    if (!timesheet) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Timesheet not found'
      });
    }

    // Check permissions
    let canUpdate = false;

    if (userRole === 'admin') {
      canUpdate = true;
    } else if (userRole === 'project_manager') {
      // Project managers can update timesheets for their projects
      if (timesheet.task.project.project_manager_id === userId) {
        canUpdate = true;
      }
    } else if (userRole === 'team_member') {
      // Team members can only update their own timesheets
      if (timesheet.user_id === userId) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this timesheet'
      });
    }

    // Validate hours if provided
    let hoursNum = timesheet.hours;
    if (hours !== undefined) {
      hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Hours must be a positive number'
        });
      }
    }

    // Validate date if provided
    let entryDate = timesheet.date;
    if (date) {
      entryDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (entryDate > today) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Date cannot be in the future'
        });
      }
    }

    // Recalculate cost if hours changed
    let cost = timesheet.cost;
    if (hours !== undefined) {
      cost = hoursNum * parseFloat(timesheet.user.hourly_rate);
    }

    // Update timesheet
    await timesheet.update({
      hours: hoursNum,
      date: date || timesheet.date,
      is_billable: is_billable !== undefined ? is_billable : timesheet.is_billable,
      description: description !== undefined ? description : timesheet.description,
      cost
    });

    // Fetch updated timesheet with associations
    const updatedTimesheet = await Timesheet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email', 'hourly_rate']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: 'Timesheet updated successfully',
      timesheet: updatedTimesheet
    });

  } catch (error) {
    console.error('Update timesheet error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update timesheet'
    });
  }
};

const deleteTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const timesheet = await Timesheet.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'task',
          include: [{
            model: Project,
            as: 'project',
            attributes: ['id', 'project_manager_id']
          }]
        }
      ]
    });

    if (!timesheet) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Timesheet not found'
      });
    }

    // Check permissions
    let canDelete = false;

    if (userRole === 'admin') {
      canDelete = true;
    } else if (userRole === 'project_manager') {
      // Project managers can delete timesheets for their projects
      if (timesheet.task.project.project_manager_id === userId) {
        canDelete = true;
      }
    } else if (userRole === 'team_member') {
      // Team members can only delete their own timesheets
      if (timesheet.user_id === userId) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this timesheet'
      });
    }

    // Delete timesheet
    await timesheet.destroy();

    res.json({
      message: 'Timesheet deleted successfully'
    });

  } catch (error) {
    console.error('Delete timesheet error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete timesheet'
    });
  }
};

const getTimesheetsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if task exists and user has access
    const task = await Task.findByPk(taskId, {
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'project_manager_id']
      }]
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
    }

    // Check access permissions
    if (userRole === 'team_member') {
      const isMember = await ProjectMember.findOne({
        where: { project_id: task.project_id, user_id: userId }
      });
      if (!isMember) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this task'
        });
      }
    } else if (userRole === 'project_manager') {
      if (task.project.project_manager_id !== userId) {
        const isMember = await ProjectMember.findOne({
          where: { project_id: task.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this task'
          });
        }
      }
    }

    const timesheets = await Timesheet.findAll({
      where: { task_id: taskId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'full_name', 'email', 'hourly_rate']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ],
      order: [['date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      timesheets
    });

  } catch (error) {
    console.error('Get timesheets by task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve timesheets'
    });
  }
};

module.exports = {
  getAllTimesheets,
  createTimesheet,
  getTimesheetById,
  updateTimesheet,
  deleteTimesheet,
  getTimesheetsByTask
};