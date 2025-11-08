const { Expense, Project, User, ProjectMember } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const getAllExpenses = async (req, res) => {
  try {
    const {
      search,
      project_id,
      submitted_by,
      status,
      is_billable,
      start_date,
      end_date,
      group_by,
      page = 1,
      limit = 20
    } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where clause based on filters
    let whereClause = {};

    // Apply search filter
    if (search) {
      whereClause[Op.or] = [
        { expense_number: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
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

    // Apply submitted_by filter if provided
    if (submitted_by) {
      whereClause.submitted_by = submitted_by;
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['submitted', 'approved', 'rejected', 'reimbursed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      whereClause.status = status;
    }

    // Apply billable filter if provided
    if (is_billable !== undefined) {
      whereClause.is_billable = is_billable === 'true';
    }

    // Apply date range filter if provided
    if (start_date || end_date) {
      whereClause.expense_date = {};
      if (start_date) {
        whereClause.expense_date[Op.gte] = start_date;
      }
      if (end_date) {
        whereClause.expense_date[Op.lte] = end_date;
      }
    }

    // Apply role-based filtering if no specific filters provided
    if (!project_id) {
      if (userRole === 'team_member') {
        // Team members can only see expenses for projects they're assigned to, or their own expenses
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: projectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked expenses
        whereClause[Op.or].push({ submitted_by: userId }); // Include user's own expenses
      } else if (userRole === 'project_manager') {
        // Project managers can see expenses for their projects
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

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: allProjectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked expenses
        whereClause[Op.or].push({ submitted_by: userId }); // Include user's own expenses
      }
      // Admin and sales_finance can see all expenses
    }

    // Handle grouping
    let groupBy = null;
    if (group_by) {
      const validGroupBy = ['project', 'submitted_by', 'status', 'billable'];
      if (!validGroupBy.includes(group_by)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid group_by. Must be one of: ' + validGroupBy.join(', ')
        });
      }
      groupBy = group_by;
    }

    // Pagination
    const offset = (page - 1) * limit;

    const expenses = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']]
    });

    let result = {
      expenses: expenses.rows,
      pagination: {
        total: expenses.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(expenses.count / limit)
      }
    };

    // Add grouping if requested
    if (groupBy && expenses.rows.length > 0) {
      const grouped = {};
      expenses.rows.forEach(expense => {
        let key;
        switch (groupBy) {
          case 'project':
            key = expense.project ? expense.project.name : 'Unassigned';
            break;
          case 'submitted_by':
            key = expense.submittedBy ? expense.submittedBy.full_name : 'Unknown';
            break;
          case 'status':
            key = expense.status;
            break;
          case 'billable':
            key = expense.is_billable ? 'Billable' : 'Non-billable';
            break;
          default:
            key = 'Other';
        }

        if (!grouped[key]) {
          grouped[key] = {
            group: key,
            count: 0,
            totalAmount: 0,
            expenses: []
          };
        }

        grouped[key].count++;
        grouped[key].totalAmount += parseFloat(expense.amount);
        grouped[key].expenses.push(expense);
      });

      result.grouped = Object.values(grouped);
    }

    res.json(result);

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve expenses'
    });
  }
};

const createExpense = async (req, res) => {
  try {
    const { project_id, amount, description, is_billable, expense_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount is required'
      });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Amount must be a positive number'
      });
    }

    // Check permissions - team members and above can create expenses
    if (!['admin', 'sales_finance', 'project_manager', 'team_member'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to create expenses'
      });
    }

    // Check project access if provided
    if (project_id) {
      const project = await Project.findByPk(project_id);
      if (!project) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Project not found'
        });
      }

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
        if (project.project_manager_id !== userId) {
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

    // Handle file upload
    let receiptPath = null;
    if (req.file) {
      receiptPath = req.file.path.replace(/\\/g, '/'); // Normalize path for cross-platform
    }

    // Generate expense number (EXP-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastExpense = await Expense.findOne({
      where: {
        expense_number: {
          [Op.like]: `EXP-${currentYear}-%`
        }
      },
      order: [['expense_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastExpense) {
      const lastNumber = parseInt(lastExpense.expense_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const expenseNumber = `EXP-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Create expense
    const expense = await Expense.create({
      expense_number: expenseNumber,
      project_id: project_id || null,
      submitted_by: userId,
      amount: amountNum,
      description: description || null,
      is_billable: is_billable === 'true' || is_billable === true,
      status: 'submitted',
      receipt_path: receiptPath,
      expense_date: expense_date || new Date().toISOString().split('T')[0]
    });

    // Fetch the created expense with associations
    const createdExpense = await Expense.findByPk(expense.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Expense created successfully',
      expense: createdExpense
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create expense'
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check access permissions
    if (expense.project_id) {
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: expense.project_id, user_id: userId }
        });
        if (!isMember && expense.submitted_by !== userId) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this expense'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(expense.project_id);
        if (project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: expense.project_id, user_id: userId }
          });
          if (!isMember && expense.submitted_by !== userId) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this expense'
            });
          }
        }
      }
    } else if (expense.submitted_by !== userId && !['admin', 'sales_finance'].includes(userRole)) {
      // For unlinked expenses, only the submitter or admin/sales_finance can view
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this expense'
      });
    }

    res.json({
      expense
    });

  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve expense'
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, amount, description, is_billable, expense_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check permissions - only the submitter can update, and only if status is 'submitted'
    if (expense.submitted_by !== userId && !['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own expenses'
      });
    }

    // Check if expense can be updated (only submitted expenses can be updated)
    if (expense.status !== 'submitted') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot update an expense that has already been processed'
      });
    }

    // Check project access if changing project
    if (project_id !== undefined && project_id !== expense.project_id) {
      if (project_id) {
        const project = await Project.findByPk(project_id);
        if (!project) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Project not found'
          });
        }

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
          if (project.project_manager_id !== userId) {
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
    }

    // Handle file upload (replace existing receipt if new one uploaded)
    let receiptPath = expense.receipt_path;
    if (req.file) {
      // Delete old receipt file if it exists
      if (expense.receipt_path) {
        try {
          fs.unlinkSync(expense.receipt_path);
        } catch (err) {
          console.warn('Failed to delete old receipt file:', err);
        }
      }
      receiptPath = req.file.path.replace(/\\/g, '/');
    }

    // Validate amount if provided
    let amountNum = expense.amount;
    if (amount !== undefined) {
      amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Amount must be a positive number'
        });
      }
    }

    // Update expense
    await expense.update({
      project_id: project_id !== undefined ? project_id : expense.project_id,
      amount: amountNum,
      description: description !== undefined ? description : expense.description,
      is_billable: is_billable !== undefined ? (is_billable === 'true' || is_billable === true) : expense.is_billable,
      receipt_path: receiptPath,
      expense_date: expense_date !== undefined ? expense_date : expense.expense_date
    });

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update expense'
    });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check permissions - only the submitter or admin/sales_finance can delete
    if (expense.submitted_by !== userId && !['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own expenses'
      });
    }

    // Check if expense can be deleted (only submitted expenses can be deleted)
    if (expense.status !== 'submitted') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete an expense that has already been processed'
      });
    }

    // Delete receipt file if it exists
    if (expense.receipt_path) {
      try {
        fs.unlinkSync(expense.receipt_path);
      } catch (err) {
        console.warn('Failed to delete receipt file:', err);
      }
    }

    // Delete expense
    await expense.destroy();

    res.json({
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete expense'
    });
  }
};

const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check permissions - only project managers (for their projects) or admin/sales_finance can approve
    let canApprove = ['admin', 'sales_finance'].includes(userRole);

    if (!canApprove && userRole === 'project_manager') {
      if (expense.project_id) {
        const project = await Project.findByPk(expense.project_id);
        canApprove = project && project.project_manager_id === userId;
      }
    }

    if (!canApprove) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to approve this expense'
      });
    }

    // Check if expense can be approved
    if (expense.status !== 'submitted') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Expense has already been processed'
      });
    }

    // Update expense
    await expense.update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date()
    });

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Expense approved successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to approve expense'
    });
  }
};

const rejectExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check permissions - only project managers (for their projects) or admin/sales_finance can reject
    let canReject = ['admin', 'sales_finance'].includes(userRole);

    if (!canReject && userRole === 'project_manager') {
      if (expense.project_id) {
        const project = await Project.findByPk(expense.project_id);
        canReject = project && project.project_manager_id === userId;
      }
    }

    if (!canReject) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to reject this expense'
      });
    }

    // Check if expense can be rejected
    if (expense.status !== 'submitted') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Expense has already been processed'
      });
    }

    // Update expense
    await expense.update({
      status: 'rejected',
      approved_by: userId,
      approved_at: new Date()
    });

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Expense rejected successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reject expense'
    });
  }
};

const linkExpenseToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Expense not found'
      });
    }

    // Check permissions - only the submitter can link their own expenses
    if (expense.submitted_by !== userId && !['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only link your own expenses'
      });
    }

    // Check if expense can be linked (only submitted expenses can be linked)
    if (expense.status !== 'submitted') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot link an expense that has already been processed'
      });
    }

    // Check if project exists
    if (project_id) {
      const project = await Project.findByPk(project_id);
      if (!project) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Project not found'
        });
      }

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
        if (project.project_manager_id !== userId) {
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

    // Update expense
    await expense.update({
      project_id: project_id || null
    });

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'approvedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Expense linked to project successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('Link expense to project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link expense to project'
    });
  }
};

module.exports = {
  getAllExpenses,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  linkExpenseToProject
};