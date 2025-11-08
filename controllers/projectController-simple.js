const { Project, User } = require('../models');

const getAllProjects = async (req, res) => {
  try {
    console.log('getAllProjects called for user:', req.user.username);
    res.json({
      projects: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Get all projects error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve projects'
    });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description, budget } = req.body;
    const userId = req.user.id;

    const project = await Project.create({
      name,
      description: description || null,
      status: 'planned',
      project_manager_id: userId,
      budget: budget || 0.00
    });

    res.status(201).json({
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create project'
    });
  }
};

module.exports = {
  getAllProjects,
  createProject,
  getProjectById: (req, res) => res.json({ message: 'Not implemented' }),
  updateProject: (req, res) => res.json({ message: 'Not implemented' }),
  deleteProject: (req, res) => res.json({ message: 'Not implemented' }),
  getProjectMembers: (req, res) => res.json({ message: 'Not implemented' }),
  addProjectMember: (req, res) => res.json({ message: 'Not implemented' }),
  removeProjectMember: (req, res) => res.json({ message: 'Not implemented' })
};