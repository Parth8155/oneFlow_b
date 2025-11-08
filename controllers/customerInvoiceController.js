const { CustomerInvoice, Project, User, ProjectMember, SalesOrder } = require('../models');
const { Op } = require('sequelize');

const getAllCustomerInvoices = async (req, res) => {
  try {
    const {
      search,
      project_id,
      sales_order_id,
      customer_name,
      status,
      start_date,
      end_date,
      due_start_date,
      due_end_date,
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
        { invoice_number: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
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

    // Apply sales order filter if provided
    if (sales_order_id) {
      whereClause.sales_order_id = sales_order_id;
    }

    // Apply customer filter if provided
    if (customer_name) {
      whereClause.customer_name = { [Op.iLike]: `%${customer_name}%` };
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      whereClause.status = status;
    }

    // Apply date range filter if provided
    if (start_date || end_date) {
      whereClause.invoice_date = {};
      if (start_date) {
        whereClause.invoice_date[Op.gte] = start_date;
      }
      if (end_date) {
        whereClause.invoice_date[Op.lte] = end_date;
      }
    }

    // Apply due date range filter if provided
    if (due_start_date || due_end_date) {
      whereClause.due_date = {};
      if (due_start_date) {
        whereClause.due_date[Op.gte] = due_start_date;
      }
      if (due_end_date) {
        whereClause.due_date[Op.lte] = due_end_date;
      }
    }

    // Apply role-based filtering if no specific filters provided
    if (!project_id) {
      if (userRole === 'team_member') {
        // Team members can only see customer invoices for projects they're assigned to
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: projectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked invoices
      } else if (userRole === 'project_manager') {
        // Project managers can see customer invoices for their projects
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
        whereClause[Op.or].push({ project_id: null }); // Include unlinked invoices
      }
      // Admin and sales_finance can see all customer invoices
    }

    // Handle grouping
    let groupBy = null;
    if (group_by) {
      const validGroupBy = ['project', 'customer', 'status'];
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

    const customerInvoices = await CustomerInvoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['invoice_date', 'DESC'], ['created_at', 'DESC']]
    });

    let result = {
      customerInvoices: customerInvoices.rows,
      pagination: {
        total: customerInvoices.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(customerInvoices.count / limit)
      }
    };

    // Add grouping if requested
    if (groupBy && customerInvoices.rows.length > 0) {
      const grouped = {};
      customerInvoices.rows.forEach(invoice => {
        let key;
        switch (groupBy) {
          case 'project':
            key = invoice.project ? invoice.project.name : 'Unassigned';
            break;
          case 'customer':
            key = invoice.customer_name;
            break;
          case 'status':
            key = invoice.status;
            break;
          default:
            key = 'Other';
        }

        if (!grouped[key]) {
          grouped[key] = {
            group: key,
            count: 0,
            totalAmount: 0,
            invoices: []
          };
        }

        grouped[key].count++;
        grouped[key].totalAmount += parseFloat(invoice.amount);
        grouped[key].invoices.push(invoice);
      });

      result.grouped = Object.values(grouped);
    }

    res.json(result);

  } catch (error) {
    console.error('Get customer invoices error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve customer invoices'
    });
  }
};

const createCustomerInvoice = async (req, res) => {
  try {
    const { project_id, sales_order_id, customer_name, amount, description, status, invoice_date, due_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!customer_name || !amount) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Customer name and amount are required'
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

    // Check permissions - only sales_finance or admin can create customer invoices
    if (!['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Sales/Finance users or Admins can create customer invoices'
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
    }

    // Check sales order if provided
    if (sales_order_id) {
      const salesOrder = await SalesOrder.findByPk(sales_order_id);
      if (!salesOrder) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Sales order not found'
        });
      }

      // If sales order is linked to a project, ensure consistency
      if (salesOrder.project_id && project_id && salesOrder.project_id !== parseInt(project_id)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Sales order is linked to a different project'
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Generate invoice number (INV-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastInvoice = await CustomerInvoice.findOne({
      where: {
        invoice_number: {
          [Op.like]: `INV-${currentYear}-%`
        }
      },
      order: [['invoice_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `INV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Create customer invoice
    const customerInvoice = await CustomerInvoice.create({
      invoice_number: invoiceNumber,
      project_id: project_id || null,
      sales_order_id: sales_order_id || null,
      customer_name,
      amount: amountNum,
      description: description || null,
      status: status || 'draft',
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      created_by: userId
    });

    // Fetch the created customer invoice with associations
    const createdCustomerInvoice = await CustomerInvoice.findByPk(customerInvoice.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Customer invoice created successfully',
      customerInvoice: createdCustomerInvoice
    });

  } catch (error) {
    console.error('Create customer invoice error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create customer invoice'
    });
  }
};

const getCustomerInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const customerInvoice = await CustomerInvoice.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    if (!customerInvoice) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer invoice not found'
      });
    }

    // Check access permissions
    if (customerInvoice.project_id) {
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: customerInvoice.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this customer invoice'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(customerInvoice.project_id);
        if (project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: customerInvoice.project_id, user_id: userId }
          });
          if (!isMember) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this customer invoice'
            });
          }
        }
      }
    }

    res.json({
      customerInvoice
    });

  } catch (error) {
    console.error('Get customer invoice by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve customer invoice'
    });
  }
};

const updateCustomerInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, sales_order_id, customer_name, amount, description, status, invoice_date, due_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const customerInvoice = await CustomerInvoice.findByPk(id);
    if (!customerInvoice) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer invoice not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can update
    const canUpdate = ['admin', 'sales_finance'].includes(userRole) ||
                      customerInvoice.created_by === userId;

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this customer invoice'
      });
    }

    // Check project access if changing project
    if (project_id !== undefined && project_id !== customerInvoice.project_id) {
      if (project_id) {
        const project = await Project.findByPk(project_id);
        if (!project) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Project not found'
          });
        }
      }
    }

    // Check sales order if changing
    if (sales_order_id !== undefined && sales_order_id !== customerInvoice.sales_order_id) {
      if (sales_order_id) {
        const salesOrder = await SalesOrder.findByPk(sales_order_id);
        if (!salesOrder) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Sales order not found'
          });
        }

        // If sales order is linked to a project, ensure consistency
        if (salesOrder.project_id && project_id && salesOrder.project_id !== parseInt(project_id)) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Sales order is linked to a different project'
          });
        }
      }
    }

    // Validate amount if provided
    let amountNum = customerInvoice.amount;
    if (amount !== undefined) {
      amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Amount must be a positive number'
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'sent', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Update customer invoice
    await customerInvoice.update({
      project_id: project_id !== undefined ? project_id : customerInvoice.project_id,
      sales_order_id: sales_order_id !== undefined ? sales_order_id : customerInvoice.sales_order_id,
      customer_name: customer_name !== undefined ? customer_name : customerInvoice.customer_name,
      amount: amountNum,
      description: description !== undefined ? description : customerInvoice.description,
      status: status !== undefined ? status : customerInvoice.status,
      invoice_date: invoice_date !== undefined ? invoice_date : customerInvoice.invoice_date,
      due_date: due_date !== undefined ? due_date : customerInvoice.due_date
    });

    // Fetch updated customer invoice with associations
    const updatedCustomerInvoice = await CustomerInvoice.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Customer invoice updated successfully',
      customerInvoice: updatedCustomerInvoice
    });

  } catch (error) {
    console.error('Update customer invoice error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update customer invoice'
    });
  }
};

const deleteCustomerInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const customerInvoice = await CustomerInvoice.findByPk(id);
    if (!customerInvoice) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer invoice not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can delete
    const canDelete = ['admin', 'sales_finance'].includes(userRole) ||
                      customerInvoice.created_by === userId;

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this customer invoice'
      });
    }

    // Check if customer invoice is paid (business rule)
    if (customerInvoice.status === 'paid') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete a paid customer invoice'
      });
    }

    // Delete customer invoice
    await customerInvoice.destroy();

    res.json({
      message: 'Customer invoice deleted successfully'
    });

  } catch (error) {
    console.error('Delete customer invoice error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete customer invoice'
    });
  }
};

const linkCustomerInvoiceToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const customerInvoice = await CustomerInvoice.findByPk(id);
    if (!customerInvoice) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer invoice not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can link
    const canLink = ['admin', 'sales_finance'].includes(userRole) ||
                    customerInvoice.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this customer invoice'
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
    }

    // Update customer invoice
    await customerInvoice.update({
      project_id: project_id || null
    });

    // Fetch updated customer invoice with associations
    const updatedCustomerInvoice = await CustomerInvoice.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Customer invoice linked to project successfully',
      customerInvoice: updatedCustomerInvoice
    });

  } catch (error) {
    console.error('Link customer invoice to project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link customer invoice to project'
    });
  }
};

const linkCustomerInvoiceToSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { sales_order_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const customerInvoice = await CustomerInvoice.findByPk(id);
    if (!customerInvoice) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Customer invoice not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can link
    const canLink = ['admin', 'sales_finance'].includes(userRole) ||
                    customerInvoice.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this customer invoice'
      });
    }

    // Check if sales order exists
    if (sales_order_id) {
      const salesOrder = await SalesOrder.findByPk(sales_order_id);
      if (!salesOrder) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Sales order not found'
        });
      }

      // If sales order is linked to a project, ensure consistency
      if (salesOrder.project_id && customerInvoice.project_id && salesOrder.project_id !== customerInvoice.project_id) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Sales order is linked to a different project than the invoice'
        });
      }
    }

    // Update customer invoice
    await customerInvoice.update({
      sales_order_id: sales_order_id || null
    });

    // Fetch updated customer invoice with associations
    const updatedCustomerInvoice = await CustomerInvoice.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number', 'customer_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Customer invoice linked to sales order successfully',
      customerInvoice: updatedCustomerInvoice
    });

  } catch (error) {
    console.error('Link customer invoice to sales order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link customer invoice to sales order'
    });
  }
};

module.exports = {
  getAllCustomerInvoices,
  createCustomerInvoice,
  getCustomerInvoiceById,
  updateCustomerInvoice,
  deleteCustomerInvoice,
  linkCustomerInvoiceToProject,
  linkCustomerInvoiceToSalesOrder
};