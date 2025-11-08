const { VendorBill, Project, User, ProjectMember, PurchaseOrder } = require('../models');
const { Op } = require('sequelize');

const getAllVendorBills = async (req, res) => {
  try {
    const {
      search,
      project_id,
      purchase_order_id,
      vendor_name,
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
        { bill_number: { [Op.iLike]: `%${search}%` } },
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

    // Apply purchase order filter if provided
    if (purchase_order_id) {
      whereClause.purchase_order_id = purchase_order_id;
    }

    // Apply vendor filter if provided
    if (vendor_name) {
      whereClause.vendor_name = { [Op.iLike]: `%${vendor_name}%` };
    }

    // Apply status filter if provided
    if (status) {
      const validStatuses = ['draft', 'received', 'paid', 'cancelled'];
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
      whereClause.bill_date = {};
      if (start_date) {
        whereClause.bill_date[Op.gte] = start_date;
      }
      if (end_date) {
        whereClause.bill_date[Op.lte] = end_date;
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
        // Team members can only see vendor bills for projects they're assigned to
        const userProjects = await ProjectMember.findAll({
          where: { user_id: userId },
          attributes: ['project_id']
        });
        const projectIds = userProjects.map(pm => pm.project_id);

        whereClause[Op.or] = whereClause[Op.or] || [];
        whereClause[Op.or].push({ project_id: { [Op.in]: projectIds } });
        whereClause[Op.or].push({ project_id: null }); // Include unlinked bills
      } else if (userRole === 'project_manager') {
        // Project managers can see vendor bills for their projects
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
        whereClause[Op.or].push({ project_id: null }); // Include unlinked bills
      }
      // Admin and sales_finance can see all vendor bills
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

    const vendorBills = await VendorBill.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['bill_date', 'DESC'], ['created_at', 'DESC']]
    });

    let result = {
      vendorBills: vendorBills.rows,
      pagination: {
        total: vendorBills.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(vendorBills.count / limit)
      }
    };

    // Add grouping if requested
    if (groupBy && vendorBills.rows.length > 0) {
      const grouped = {};
      vendorBills.rows.forEach(bill => {
        let key;
        switch (groupBy) {
          case 'project':
            key = bill.project ? bill.project.name : 'Unassigned';
            break;
          case 'vendor':
            key = bill.vendor_name;
            break;
          case 'status':
            key = bill.status;
            break;
          default:
            key = 'Other';
        }

        if (!grouped[key]) {
          grouped[key] = {
            group: key,
            count: 0,
            totalAmount: 0,
            bills: []
          };
        }

        grouped[key].count++;
        grouped[key].totalAmount += parseFloat(bill.amount);
        grouped[key].bills.push(bill);
      });

      result.grouped = Object.values(grouped);
    }

    res.json(result);

  } catch (error) {
    console.error('Get vendor bills error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve vendor bills'
    });
  }
};

const createVendorBill = async (req, res) => {
  try {
    const { project_id, purchase_order_id, vendor_name, amount, description, status, bill_date, due_date } = req.body;
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

    // Check permissions - only sales_finance or admin can create vendor bills
    if (!['admin', 'sales_finance'].includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Sales/Finance users or Admins can create vendor bills'
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

    // Check purchase order if provided
    if (purchase_order_id) {
      const purchaseOrder = await PurchaseOrder.findByPk(purchase_order_id);
      if (!purchaseOrder) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Purchase order not found'
        });
      }

      // If purchase order is linked to a project, ensure consistency
      if (purchaseOrder.project_id && project_id && purchaseOrder.project_id !== parseInt(project_id)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Purchase order is linked to a different project'
        });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'received', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Generate bill number (BILL-YYYY-NNNN)
    const currentYear = new Date().getFullYear();
    const lastBill = await VendorBill.findOne({
      where: {
        bill_number: {
          [Op.like]: `BILL-${currentYear}-%`
        }
      },
      order: [['bill_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastBill) {
      const lastNumber = parseInt(lastBill.bill_number.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    const billNumber = `BILL-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // Create vendor bill
    const vendorBill = await VendorBill.create({
      bill_number: billNumber,
      project_id: project_id || null,
      purchase_order_id: purchase_order_id || null,
      vendor_name,
      amount: amountNum,
      description: description || null,
      status: status || 'draft',
      bill_date: bill_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      created_by: userId
    });

    // Fetch the created vendor bill with associations
    const createdVendorBill = await VendorBill.findByPk(vendorBill.id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.status(201).json({
      message: 'Vendor bill created successfully',
      vendorBill: createdVendorBill
    });

  } catch (error) {
    console.error('Create vendor bill error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create vendor bill'
    });
  }
};

const getVendorBillById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const vendorBill = await VendorBill.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    if (!vendorBill) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vendor bill not found'
      });
    }

    // Check access permissions
    if (vendorBill.project_id) {
      if (userRole === 'team_member') {
        const isMember = await ProjectMember.findOne({
          where: { project_id: vendorBill.project_id, user_id: userId }
        });
        if (!isMember) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this vendor bill'
          });
        }
      } else if (userRole === 'project_manager') {
        const project = await Project.findByPk(vendorBill.project_id);
        if (project.project_manager_id !== userId) {
          const isMember = await ProjectMember.findOne({
            where: { project_id: vendorBill.project_id, user_id: userId }
          });
          if (!isMember) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this vendor bill'
            });
          }
        }
      }
    }

    res.json({
      vendorBill
    });

  } catch (error) {
    console.error('Get vendor bill by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve vendor bill'
    });
  }
};

const updateVendorBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id, purchase_order_id, vendor_name, amount, description, status, bill_date, due_date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const vendorBill = await VendorBill.findByPk(id);
    if (!vendorBill) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vendor bill not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can update
    const canUpdate = ['admin', 'sales_finance'].includes(userRole) ||
                      vendorBill.created_by === userId;

    if (!canUpdate) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this vendor bill'
      });
    }

    // Check project access if changing project
    if (project_id !== undefined && project_id !== vendorBill.project_id) {
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

    // Check purchase order if changing
    if (purchase_order_id !== undefined && purchase_order_id !== vendorBill.purchase_order_id) {
      if (purchase_order_id) {
        const purchaseOrder = await PurchaseOrder.findByPk(purchase_order_id);
        if (!purchaseOrder) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Purchase order not found'
          });
        }

        // If purchase order is linked to a project, ensure consistency
        if (purchaseOrder.project_id && project_id && purchaseOrder.project_id !== parseInt(project_id)) {
          return res.status(400).json({
            error: 'Validation error',
            message: 'Purchase order is linked to a different project'
          });
        }
      }
    }

    // Validate amount if provided
    let amountNum = vendorBill.amount;
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
      const validStatuses = ['draft', 'received', 'paid', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
    }

    // Update vendor bill
    await vendorBill.update({
      project_id: project_id !== undefined ? project_id : vendorBill.project_id,
      purchase_order_id: purchase_order_id !== undefined ? purchase_order_id : vendorBill.purchase_order_id,
      vendor_name: vendor_name !== undefined ? vendor_name : vendorBill.vendor_name,
      amount: amountNum,
      description: description !== undefined ? description : vendorBill.description,
      status: status !== undefined ? status : vendorBill.status,
      bill_date: bill_date !== undefined ? bill_date : vendorBill.bill_date,
      due_date: due_date !== undefined ? due_date : vendorBill.due_date
    });

    // Fetch updated vendor bill with associations
    const updatedVendorBill = await VendorBill.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Vendor bill updated successfully',
      vendorBill: updatedVendorBill
    });

  } catch (error) {
    console.error('Update vendor bill error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update vendor bill'
    });
  }
};

const deleteVendorBill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const vendorBill = await VendorBill.findByPk(id);
    if (!vendorBill) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vendor bill not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can delete
    const canDelete = ['admin', 'sales_finance'].includes(userRole) ||
                      vendorBill.created_by === userId;

    if (!canDelete) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this vendor bill'
      });
    }

    // Check if vendor bill is paid (business rule)
    if (vendorBill.status === 'paid') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete a paid vendor bill'
      });
    }

    // Delete vendor bill
    await vendorBill.destroy();

    res.json({
      message: 'Vendor bill deleted successfully'
    });

  } catch (error) {
    console.error('Delete vendor bill error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete vendor bill'
    });
  }
};

const linkVendorBillToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { project_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const vendorBill = await VendorBill.findByPk(id);
    if (!vendorBill) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vendor bill not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can link
    const canLink = ['admin', 'sales_finance'].includes(userRole) ||
                    vendorBill.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this vendor bill'
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

    // Update vendor bill
    await vendorBill.update({
      project_id: project_id || null
    });

    // Fetch updated vendor bill with associations
    const updatedVendorBill = await VendorBill.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Vendor bill linked to project successfully',
      vendorBill: updatedVendorBill
    });

  } catch (error) {
    console.error('Link vendor bill to project error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link vendor bill to project'
    });
  }
};

const linkVendorBillToPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { purchase_order_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const vendorBill = await VendorBill.findByPk(id);
    if (!vendorBill) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Vendor bill not found'
      });
    }

    // Check permissions - only sales_finance, admin, or the creator can link
    const canLink = ['admin', 'sales_finance'].includes(userRole) ||
                    vendorBill.created_by === userId;

    if (!canLink) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to link this vendor bill'
      });
    }

    // Check if purchase order exists
    if (purchase_order_id) {
      const purchaseOrder = await PurchaseOrder.findByPk(purchase_order_id);
      if (!purchaseOrder) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Purchase order not found'
        });
      }

      // If purchase order is linked to a project, ensure consistency
      if (purchaseOrder.project_id && vendorBill.project_id && purchaseOrder.project_id !== vendorBill.project_id) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Purchase order is linked to a different project than the bill'
        });
      }
    }

    // Update vendor bill
    await vendorBill.update({
      purchase_order_id: purchase_order_id || null
    });

    // Fetch updated vendor bill with associations
    const updatedVendorBill = await VendorBill.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number', 'vendor_name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.json({
      message: 'Vendor bill linked to purchase order successfully',
      vendorBill: updatedVendorBill
    });

  } catch (error) {
    console.error('Link vendor bill to purchase order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to link vendor bill to purchase order'
    });
  }
};

module.exports = {
  getAllVendorBills,
  createVendorBill,
  getVendorBillById,
  updateVendorBill,
  deleteVendorBill,
  linkVendorBillToProject,
  linkVendorBillToPurchaseOrder
};