const { SalesOrder, Project, User, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const getAllSalesOrders = async (req, res) => {
  try {
    // Check for seed parameter to create test data
    if (req.query.seed === 'true') {
      console.log('Creating test sales orders...');
      const testOrders = [
        {
          order_number: 'SO-001',
          customer_name: 'ABC Corporation',
          amount: 5000.00,
          description: 'Software development services',
          status: 'confirmed',
          order_date: new Date().toISOString().split('T')[0],
          created_by: req.user.id
        },
        {
          order_number: 'SO-002',
          customer_name: 'XYZ Industries',
          amount: 7500.00,
          description: 'Web application development',
          status: 'draft',
          order_date: new Date().toISOString().split('T')[0],
          created_by: req.user.id
        }
      ];

      for (const order of testOrders) {
        try {
          await SalesOrder.create(order);
          console.log(`Created test sales order: ${order.order_number}`);
        } catch (createError) {
          console.log(`Sales order ${order.order_number} may already exist`);
        }
      }
    }

    // Simple query first to check if we have any data
    const totalCount = await SalesOrder.count();
    console.log('Total sales orders in database:', totalCount);

    const {
      search,
      project_id,
      customer_name,
      status,
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
        { order_number: { [Op.iLike]: `%${search}%` } },
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

    // Apply customer filter if provided
    if (customer_name) {
      whereClause.customer_name = { [Op.iLike]: `%${customer_name}%` };
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['draft', 'confirmed', 'cancelled'];
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
      whereClause.order_date = {};
      if (start_date) {
        whereClause.order_date[Op.gte] = start_date;
      }
      if (end_date) {
        whereClause.order_date[Op.lte] = end_date;
      }
    }

    // Apply role-based filtering if no specific filters provided
    if (!project_id) {
      if (userRole === 'team_member') {
        // Team members can only see sales orders for projects they're assigned to
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: projectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked orders
      } else if (userRole === 'project_manager') {
        // Project managers can see sales orders for their projects
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
        whereClause[Op.or].push({ project_id: null }); // Include unlinked orders
      }
      // Admin and sales_finance can see all sales orders
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

    const salesOrders = await SalesOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['order_date', 'DESC'], ['created_at', 'DESC']]
    });

    let result = {
      salesOrders: salesOrders.rows,
      pagination: {
        total: salesOrders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(salesOrders.count / limit)
      }
    };

    // Add grouping if requested
    if (groupBy && salesOrders.rows.length > 0) {
      const grouped = {};
      salesOrders.rows.forEach(order => {
        let key;
        switch (groupBy) {
          case 'project':
            key = order.project ? order.project.name : 'Unassigned';
            break;
          case 'customer':
            key = order.customer_name;
            break;
          case 'status':
            key = order.status;
            break;
          default:
            key = 'Other';
        }

        if (!grouped[key]) {
          grouped[key] = {
            group: key,
            count: 0,
            totalAmount: 0,
            orders: []
          };
        }

        grouped[key].count++;
        grouped[key].totalAmount += parseFloat(order.amount);
        grouped[key].orders.push(order);
      });

      result.grouped = Object.values(grouped);
    }

    res.json(result);

  } catch (error) {
    console.error('Get sales orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve sales orders'
    });
  }
};

const createSalesOrder = async (req, res) => {
  try {
    const { project_id, customer_name, amount, description, status, order_date } = req.body;
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

    // Check permissions - only sales_finance or admin can create sales orders
    if (!['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Sales/Finance users can create sales orders'
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

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'confirmed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Generate order number (SO-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastOrder = await SalesOrder.findOne({
      where: {
        order_number: {
          [Op.like]: `SO-${currentYear}-%`
        }
      },
      order: [['order_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const orderNumber = `SO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Create sales order
    const salesOrder = await SalesOrder.create({
      order_number: orderNumber,
      project_id: project_id || null,
      customer_name,
      amount: amountNum,
      description: description || null,
      status: status || 'draft',
      order_date: order_date || new Date().toISOString().split('T')[0],
      created_by: userId
    });

    // Fetch the created sales order with associations
    const createdSalesOrder = await SalesOrder.findByPk(salesOrder.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Sales order created successfully',
      salesOrder: createdSalesOrder
    });

  } catch (error) {
    console.error('Create sales order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create sales order'
    });
  }
};

const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const salesOrder = await SalesOrder.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    if (!salesOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Sales order not found'
      });
    }

    // Check access permissions
    if (salesOrder.project_id) {
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: salesOrder.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this sales order'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(salesOrder.project_id);
        if (project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: salesOrder.project_id, user_id: userId }
          });
          if (!isMember) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this sales order'
            });
          }
        }
      }
    }

    res.json({
      salesOrder
    });

  } catch (error) {
    console.error('Get sales order by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve sales order'
    });
  }
};

const updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, customer_name, amount, description, status, order_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const salesOrder = await SalesOrder.findByPk(id);
    if (!salesOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Sales order not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can update
    const canUpdate = ['admin', 'sales_finance'].includes(userRole) ||
                      salesOrder.created_by === userId;

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this sales order'
      });
    }

    // Check project access if changing project
    if (project_id !== undefined && project_id !== salesOrder.project_id) {
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

    // Validate amount if provided
    let amountNum = salesOrder.amount;
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
      const validStatuses = ['draft', 'confirmed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Update sales order
    await salesOrder.update({
      project_id: project_id !== undefined ? project_id : salesOrder.project_id,
      customer_name: customer_name !== undefined ? customer_name : salesOrder.customer_name,
      amount: amountNum,
      description: description !== undefined ? description : salesOrder.description,
      status: status !== undefined ? status : salesOrder.status,
      order_date: order_date !== undefined ? order_date : salesOrder.order_date
    });

    // Fetch updated sales order with associations
    const updatedSalesOrder = await SalesOrder.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Sales order updated successfully',
      salesOrder: updatedSalesOrder
    });

  } catch (error) {
    console.error('Update sales order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update sales order'
    });
  }
};

const deleteSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const salesOrder = await SalesOrder.findByPk(id);
    if (!salesOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Sales order not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can delete
    const canDelete = ['admin', 'sales_finance'].includes(userRole) ||
                      salesOrder.created_by === userId;

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this sales order'
      });
    }

    // Check if sales order has linked invoices (optional business rule)
    const CustomerInvoice = require('../models').CustomerInvoice;
    const invoiceCount = await CustomerInvoice.count({ where: { sales_order_id: id } });
    if (invoiceCount > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete sales order with linked customer invoices'
      });
    }

    // Delete sales order
    await salesOrder.destroy();

    res.json({
      message: 'Sales order deleted successfully'
    });

  } catch (error) {
    console.error('Delete sales order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete sales order'
    });
  }
};

const linkSalesOrderToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const salesOrder = await SalesOrder.findByPk(id);
    if (!salesOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Sales order not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can link
    const canLink = ['admin', 'sales_finance'].includes(userRole) ||
                    salesOrder.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this sales order'
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

    // Update sales order
    await salesOrder.update({
      project_id: project_id || null
    });

    // Fetch updated sales order with associations
    const updatedSalesOrder = await SalesOrder.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Sales order linked to project successfully',
      salesOrder: updatedSalesOrder
    });

  } catch (error) {
    console.error('Link sales order to project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link sales order to project'
    });
  }
};

module.exports = {
  getAllSalesOrders,
  createSalesOrder,
  getSalesOrderById,
  updateSalesOrder,
  deleteSalesOrder,
  linkSalesOrderToProject
};