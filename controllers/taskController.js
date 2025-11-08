const { Task, TaskComment, TaskAttachment, User, Project, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const getAllTasks = async (req, res) => {
  try {
    const { my_tasks, project_id, status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where clause based on filters
    let whereClause = {};

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['new', 'in_progress', 'blocked', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      whereClause.status = status;
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
    } else {
      // If no project filter, apply role-based filtering
      if (userRole === 'team_member') {
        // Team members can only see tasks they're assigned to or tasks in projects they're members of
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        if (my_tasks === 'true') {
          // Only show tasks assigned to the user
          whereClause.assigned_to = userId;
        } else {
          // Show tasks in projects they're members of
          whereClause.project_id = { [Op.in]: projectIds };
        }
      } else if (userRole === 'project_manager') {
        // Project managers can see tasks in projects they manage or are assigned to
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

        if (my_tasks === 'true') {
          // Only show tasks assigned to the user
          whereClause.assigned_to = userId;
        } else {
          // Show tasks in projects they manage or are assigned to
          whereClause.project_id = { [Op.in]: allProjectIds };
        }
      }
      // Admin and sales_finance can see all tasks
    }

    // Pagination
    const offset = (page - 1) * limit;

    const tasks = await Task.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      tasks: tasks.rows,
      pagination: {
        total: tasks.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(tasks.count / limit)
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve tasks'
    });
  }
};

const createTask = async (req, res) => {
  try {
    const { project_id, title, description, assigned_to, priority, due_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!project_id || !title) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Project ID and title are required'
      });
    }

    // Check if project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check permissions - only project manager or admin can create tasks
    if (userRole !== 'admin' && project.project_manager_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can create tasks'
      });
    }

    // Validate assigned user if provided
    if (assigned_to) {
      const assignedUser = await User.findByPk(assigned_to);
      if (!assignedUser) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Assigned user not found'
        });
      }

      // Check if assigned user is a member of the project
      const isMember = await ProjectMember.findOne({
        where: { project_id: project_id, user_id: assigned_to }
      });
      if (!isMember) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Assigned user must be a member of the project'
        });
      }
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
        });
      }
    }

    // Create task
    const task = await Task.create({
      project_id,
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      priority: priority || 'medium',
      due_date: due_date || null
    });

    // Fetch the created task with associations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: createdTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create task'
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: TaskComment,
          as: 'comments',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name']
          }],
          order: [['created_at', 'ASC']]
        },
        {
          model: TaskAttachment,
          as: 'attachments',
          include: [{
            model: User,
            as: 'uploadedBy',
            attributes: ['id', 'username', 'full_name']
          }],
          order: [['uploaded_at', 'DESC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
    }

    // Check if user has access to this task's project
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
      const project = await Project.findByPk(task.project_id);
      if (project.project_manager_id !== userId) {
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

    res.json({
      task
    });

  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve task'
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, status, priority, due_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const task = await Task.findByPk(id, {
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

    // Check permissions - only project manager, assigned user, or admin can update
    const canUpdate = userRole === 'admin' ||
                     task.project.project_manager_id === userId ||
                     task.assigned_to === userId;

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this task'
      });
    }

    // Validate assigned user if provided
    if (assigned_to !== undefined) {
      if (assigned_to) {
        const assignedUser = await User.findByPk(assigned_to);
        if (!assignedUser) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Assigned user not found'
          });
        }

        // Check if assigned user is a member of the project
        const isMember = await ProjectMember.findOne({
          where: { project_id: task.project_id, user_id: assigned_to }
        });
        if (!isMember) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Assigned user must be a member of the project'
          });
        }
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['new', 'in_progress', 'blocked', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
        });
      }
    }

    // Update task
    await task.update({
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      assigned_to: assigned_to !== undefined ? assigned_to : task.assigned_to,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      due_date: due_date !== undefined ? due_date : task.due_date
    });

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update task'
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const task = await Task.findByPk(id, {
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

    // Check permissions - only project manager or admin can delete
    if (userRole !== 'admin' && task.project.project_manager_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can delete tasks'
      });
    }

    // Check if task has timesheets (optional business rule)
    const timesheetCount = await require('../models').Timesheet.count({ where: { task_id: id } });
    if (timesheetCount > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete task with existing timesheets'
      });
    }

    // Delete task (cascade will handle related records)
    await task.destroy();

    res.json({
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete task'
    });
  }
};

const addTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate input
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Comment is required'
      });
    }

    // Check if task exists and user has access
    const task = await Task.findByPk(id, {
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

    // Add comment
    const taskComment = await TaskComment.create({
      task_id: id,
      user_id: userId,
      comment: comment.trim()
    });

    // Return comment with user details
    const commentWithUser = await TaskComment.findByPk(taskComment.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'full_name']
      }]
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentWithUser
    });

  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add comment'
    });
  }
};

const getTaskComments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if task exists and user has access
    const task = await Task.findByPk(id, {
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

    const comments = await TaskComment.findAll({
      where: { task_id: id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'full_name']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({
      comments
    });

  } catch (error) {
    console.error('Get task comments error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve comments'
    });
  }
};

const uploadTaskAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No file uploaded'
      });
    }

    // Check if task exists and user has access
    const task = await Task.findByPk(id, {
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

    // Create attachment record
    const attachment = await TaskAttachment.create({
      task_id: id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      uploaded_by: userId
    });

    // Return attachment with user details
    const attachmentWithUser = await TaskAttachment.findByPk(attachment.id, {
      include: [{
        model: User,
        as: 'uploadedBy',
        attributes: ['id', 'username', 'full_name']
      }]
    });

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: attachmentWithUser
    });

  } catch (error) {
    console.error('Upload task attachment error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to upload attachment'
    });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskComment,
  getTaskComments,
  uploadTaskAttachment
};