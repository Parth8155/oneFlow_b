const { PurchaseOrder, Project, User, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const getAllPurchaseOrders = async (req, res) => {
  try {
    const {
      search,
      project_id,
      vendor_name,
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
        { vendor_name: { [Op.iLike]: `%${search}%` } },
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

    // Apply vendor filter if provided
    if (vendor_name) {
      whereClause.vendor_name = { [Op.iLike]: `%${vendor_name}%` };
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['draft', 'confirmed', 'received', 'cancelled'];
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
        // Team members can only see purchase orders for projects they're assigned to
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: projectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked orders
      } else if (userRole === 'project_manager') {
        // Project managers can see purchase orders for their projects
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
      // Admin and sales_finance can see all purchase orders
    }

    // Handle grouping
    let groupBy = null;
    if (group_by) {
      const validGroupBy = ['project', 'vendor', 'status'];
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

    const purchaseOrders = await PurchaseOrder.findAndCountAll({
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
      purchaseOrders: purchaseOrders.rows,
      pagination: {
        total: purchaseOrders.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(purchaseOrders.count / limit)
      }
    };

    // Add grouping if requested
    if (groupBy && purchaseOrders.rows.length > 0) {
      const grouped = {};
      purchaseOrders.rows.forEach(order => {
        let key;
        switch (groupBy) {
          case 'project':
            key = order.project ? order.project.name : 'Unassigned';
            break;
          case 'vendor':
            key = order.vendor_name;
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
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve purchase orders'
    });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { project_id, vendor_name, amount, description, status, order_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!vendor_name || !amount) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Vendor name and amount are required'
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

    // Check permissions - only project_manager, admin, or sales_finance can create purchase orders
    if (!['admin', 'project_manager', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Project Managers, Sales/Finance users, or Admins can create purchase orders'
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
      if (userRole === 'project_manager' && project.project_manager_id !== userId) {
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

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'confirmed', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Generate order number (PO-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastOrder = await PurchaseOrder.findOne({
      where: {
        order_number: {
          [Op.like]: `PO-${currentYear}-%`
        }
      },
      order: [['order_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const orderNumber = `PO-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Create purchase order
    const purchaseOrder = await PurchaseOrder.create({
      order_number: orderNumber,
      project_id: project_id || null,
      vendor_name,
      amount: amountNum,
      description: description || null,
      status: status || 'draft',
      order_date: order_date || new Date().toISOString().split('T')[0],
      created_by: userId
    });

    // Fetch the created purchase order with associations
    const createdPurchaseOrder = await PurchaseOrder.findByPk(purchaseOrder.id, {
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
      message: 'Purchase order created successfully',
      purchaseOrder: createdPurchaseOrder
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create purchase order'
    });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const purchaseOrder = await PurchaseOrder.findByPk(id, {
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

    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Purchase order not found'
      });
    }

    // Check access permissions
    if (purchaseOrder.project_id) {
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: purchaseOrder.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this purchase order'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(purchaseOrder.project_id);
        if (project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: purchaseOrder.project_id, user_id: userId }
          });
          if (!isMember) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this purchase order'
            });
          }
        }
      }
    }

    res.json({
      purchaseOrder
    });

  } catch (error) {
    console.error('Get purchase order by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve purchase order'
    });
  }
};

const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, vendor_name, amount, description, status, order_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const purchaseOrder = await PurchaseOrder.findByPk(id);
    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Purchase order not found'
      });
    }

    // Check permissions - only project_manager, admin, sales_finance, or the creator can update
    const canUpdate = ['admin', 'project_manager', 'sales_finance'].includes(userRole) ||
                      purchaseOrder.created_by === userId;

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this purchase order'
      });
    }

    // Check project access if changing project
    if (project_id !== undefined && project_id !== purchaseOrder.project_id) {
      if (project_id) {
        const project = await Project.findByPk(project_id);
        if (!project) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Project not found'
          });
        }

        // Check if user has access to this project
        if (userRole === 'project_manager' && project.project_manager_id !== userId) {
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

    // Validate amount if provided
    let amountNum = purchaseOrder.amount;
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
      const validStatuses = ['draft', 'confirmed', 'received', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Update purchase order
    await purchaseOrder.update({
      project_id: project_id !== undefined ? project_id : purchaseOrder.project_id,
      vendor_name: vendor_name !== undefined ? vendor_name : purchaseOrder.vendor_name,
      amount: amountNum,
      description: description !== undefined ? description : purchaseOrder.description,
      status: status !== undefined ? status : purchaseOrder.status,
      order_date: order_date !== undefined ? order_date : purchaseOrder.order_date
    });

    // Fetch updated purchase order with associations
    const updatedPurchaseOrder = await PurchaseOrder.findByPk(id, {
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
      message: 'Purchase order updated successfully',
      purchaseOrder: updatedPurchaseOrder
    });

  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update purchase order'
    });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const purchaseOrder = await PurchaseOrder.findByPk(id);
    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Purchase order not found'
      });
    }

    // Check permissions - only project_manager, admin, sales_finance, or the creator can delete
    const canDelete = ['admin', 'project_manager', 'sales_finance'].includes(userRole) ||
                      purchaseOrder.created_by === userId;

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this purchase order'
      });
    }

    // Check if purchase order has linked vendor bills (optional business rule)
    const VendorBill = require('../models').VendorBill;
    const billCount = await VendorBill.count({ where: { purchase_order_id: id } });
    if (billCount > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete purchase order with linked vendor bills'
      });
    }

    // Delete purchase order
    await purchaseOrder.destroy();

    res.json({
      message: 'Purchase order deleted successfully'
    });

  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete purchase order'
    });
  }
};

const linkPurchaseOrderToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const purchaseOrder = await PurchaseOrder.findByPk(id);
    if (!purchaseOrder) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Purchase order not found'
      });
    }

    // Check permissions - only project_manager, admin, sales_finance, or the creator can link
    const canLink = ['admin', 'project_manager', 'sales_finance'].includes(userRole) ||
                    purchaseOrder.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this purchase order'
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
      if (userRole === 'project_manager' && project.project_manager_id !== userId) {
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

    // Update purchase order
    await purchaseOrder.update({
      project_id: project_id || null
    });

    // Fetch updated purchase order with associations
    const updatedPurchaseOrder = await PurchaseOrder.findByPk(id, {
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
      message: 'Purchase order linked to project successfully',
      purchaseOrder: updatedPurchaseOrder
    });

  } catch (error) {
    console.error('Link purchase order to project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link purchase order to project'
    });
  }
};

module.exports = {
  getAllPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  linkPurchaseOrderToProject
};