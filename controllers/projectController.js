const { Project, ProjectMember, User, Task, Timesheet } = require('../models');
const { Op } = require('sequelize');

const getAllProjects = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where clause based on user role and filters
    let whereClause = {};

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['planned', 'in_progress', 'completed', 'on_hold'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      whereClause.status = status;
    }

    // Role-based filtering
    if (userRole === 'team_member') {
      // Team members can only see projects they're assigned to
      const userProjects = await ProjectMember.findAll({
        where: { user_id: userId },
        attributes: ['project_id']
      });
      const projectIds = userProjects.map(pm => pm.project_id);
      whereClause.id = { [Op.in]: projectIds };
    } else if (userRole === 'project_manager') {
      // Project managers can see projects they manage or are assigned to
      const projectIds = await ProjectMember.findAll({
        where: { user_id: userId },
        attributes: ['project_id']
      }).then(members => members.map(m => m.project_id));

      // Include projects they manage
      const managedProjectIds = await Project.findAll({
        where: { project_manager_id: userId },
        attributes: ['id']
      }).then(projects => projects.map(p => p.id));

      const allProjectIds = [...new Set([...projectIds, ...managedProjectIds])];

      whereClause.id = { [Op.in]: allProjectIds };
    }
    // Admin and sales_finance can see all projects

    // Pagination
    const offset = (page - 1) * limit;

    console.log('whereClause:', JSON.stringify(whereClause, null, 2));
    console.log('userId:', userId, 'userRole:', userRole);

    const projects = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: ProjectMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name', 'email', 'role']
          }]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      projects: projects.rows,
      pagination: {
        total: projects.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(projects.count / limit)
      }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve projects'
    });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description, deadline, budget, project_manager_id, priority } = req.body;
    const image = req.file ? req.file.filename : null;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Project name is required'
      });
    }

    // Validate budget if provided
    if (budget !== undefined && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Budget must be a positive number'
      });
    }

    // Validate priority if provided
    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Priority must be one of: high, medium, low'
      });
    }

    // Validate project manager if provided
    let managerId = userId; // Default to creator
    if (project_manager_id) {
      // Check if the specified manager exists and has appropriate role
      const manager = await User.findByPk(project_manager_id);
      if (!manager) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Selected project manager does not exist'
        });
      }
      if (!['admin', 'project_manager'].includes(manager.role)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Selected user cannot be assigned as project manager'
        });
      }
      managerId = project_manager_id;
    }

    // Create project
    const project = await Project.create({
      name,
      description: description || null,
      status: 'planned', // Default status
      project_manager_id: managerId,
      deadline: deadline || null,
      budget: budget || 0.00,
      priority: priority || 'medium',
      image: image || null
    });

    // Add creator as project member
    await ProjectMember.create({
      project_id: project.id,
      user_id: userId
    });

    // If manager is different from creator, add manager as member too
    if (managerId !== userId) {
      await ProjectMember.create({
        project_id: project.id,
        user_id: managerId
      });
    }

    // Fetch the created project with associations
    const createdProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: ProjectMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name', 'email', 'role']
          }]
        }
      ]
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: createdProject
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create project'
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: ProjectMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name', 'email', 'role']
          }]
        },
        {
          model: Task,
          as: 'tasks',
          include: [{
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'username', 'full_name']
          }]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    if (userRole === 'team_member') {
      const isMember = await ProjectMember.findOne({
        where: { project_id: id, user_id: userId }
      });
      if (!isMember) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this project'
        });
      }
    } else if (userRole === 'project_manager') {
      // Project managers can access projects they manage or are assigned to
      const isManager = project.project_manager_id === userId;
      const isMember = await ProjectMember.findOne({
        where: { project_id: id, user_id: userId }
      });
      if (!isManager && !isMember) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this project'
        });
      }
    }

    res.json({
      project
    });

  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve project'
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, deadline, budget } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check permissions - only project manager or admin can update
    if (userRole !== 'admin' && project.project_manager_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can update projects'
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['planned', 'in_progress', 'completed', 'on_hold'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Validate budget if provided
    if (budget !== undefined && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Budget must be a positive number'
      });
    }

    // Update project
    await project.update({
      name: name !== undefined ? name : project.name,
      description: description !== undefined ? description : project.description,
      status: status !== undefined ? status : project.status,
      deadline: deadline !== undefined ? deadline : project.deadline,
      budget: budget !== undefined ? budget : project.budget
    });

    // Fetch updated project with associations
    const updatedProject = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'projectManager',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: ProjectMember,
          as: 'members',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'full_name', 'email', 'role']
          }]
        }
      ]
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update project'
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check permissions - only project manager or admin can delete
    if (userRole !== 'admin' && project.project_manager_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can delete projects'
      });
    }

    // Check if project has tasks or timesheets (optional business rule)
    const taskCount = await Task.count({ where: { project_id: id } });
    const timesheetCount = await Timesheet.count({ where: { project_id: id } });

    if (taskCount > 0 || timesheetCount > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete project with existing tasks or timesheets'
      });
    }

    // Delete project (cascade will handle related records)
    await project.destroy();

    res.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete project'
    });
  }
};

const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if project exists and user has access
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (userRole === 'team_member') {
      const isMember = await ProjectMember.findOne({
        where: { project_id: id, user_id: userId }
      });
      if (!isMember) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this project'
        });
      }
    }

    const members = await ProjectMember.findAll({
      where: { project_id: id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'full_name', 'email', 'role']
      }]
    });

    res.json({
      members: members.map(member => ({
        id: member.id,
        user: member.user,
        assigned_at: member.assigned_at
      }))
    });

  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve project members'
    });
  }
};

const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const userRole = req.user.role;

    // Validate input
    if (!user_id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'User ID is required'
      });
    }

    // Check if project exists
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check permissions - only project manager or admin can add members
    if (userRole !== 'admin' && project.project_manager_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can manage team members'
      });
    }

    // Check if user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = await ProjectMember.findOne({
      where: { project_id: id, user_id: user_id }
    });

    if (existingMember) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User is already a member of this project'
      });
    }

    // Add member
    const member = await ProjectMember.create({
      project_id: id,
      user_id: user_id
    });

    // Return member with user details
    const memberWithUser = await ProjectMember.findByPk(member.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'full_name', 'email', 'role']
      }]
    });

    res.status(201).json({
      message: 'Team member added successfully',
      member: {
        id: memberWithUser.id,
        user: memberWithUser.user,
        assigned_at: memberWithUser.assigned_at
      }
    });

  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add team member'
    });
  }
};

const removeProjectMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const userRole = req.user.role;

    // Check if project exists
    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
    }

    // Check permissions - only project manager or admin can remove members
    if (userRole !== 'admin' && project.project_manager_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only project managers can manage team members'
      });
    }

    // Cannot remove project manager from their own project
    if (parseInt(userId) === project.project_manager_id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot remove project manager from their own project'
      });
    }

    // Find and remove member
    const member = await ProjectMember.findOne({
      where: { project_id: id, user_id: userId }
    });

    if (!member) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User is not a member of this project'
      });
    }

    await member.destroy();

    res.json({
      message: 'Team member removed successfully'
    });

  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove team member'
    });
  }
};

module.exports = {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
};