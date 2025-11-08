const { User } = require('../models');
const { hashPassword } = require('../services/authService');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      users: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get users'
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, role, hourly_rate } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username, email, password, and role are required'
      });
    }

    // Validate role
    const validRoles = ['project_manager', 'team_member', 'sales_finance', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      full_name: full_name || null,
      role,
      hourly_rate: hourly_rate || 0.00,
      logged_out: false
    });

    // Return user data (excluding password)
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      hourly_rate: user.hourly_rate,
      logged_out: user.logged_out,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user'
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, role, hourly_rate, logged_out } = req.body;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        where: { username: username }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Username already in use'
        });
      }
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: email }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already in use'
        });
      }
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['project_manager', 'team_member', 'sales_finance', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
        });
      }
    }

    // Update user
    await user.update({
      username: username !== undefined ? username : user.username,
      email: email !== undefined ? email : user.email,
      full_name: full_name !== undefined ? full_name : user.full_name,
      role: role !== undefined ? role : user.role,
      hourly_rate: hourly_rate !== undefined ? hourly_rate : user.hourly_rate,
      logged_out: logged_out !== undefined ? logged_out : user.logged_out
    });

    // Return updated user data
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user'
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Cannot delete your own account'
      });
    }

    // Delete user
    await user.destroy();

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user'
    });
  }
};

const forceLogoutUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Set logged_out to true
    await user.update({
      logged_out: true
    });

    res.json({
      message: 'User logged out successfully'
    });

  } catch (error) {
    console.error('Force logout user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout user'
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  forceLogoutUser
};