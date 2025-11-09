const { CustomerInvoice, VendorBill, Expense, Timesheet, Project, SalesOrder, PurchaseOrder, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate project revenue (sum of customer invoices)
 * Excludes cancelled invoices
 */
const calculateProjectRevenue = async (projectId) => {
  try {
    const result = await CustomerInvoice.sum('amount', {
      where: {
        project_id: projectId,
        status: { [Op.ne]: 'cancelled' }
      }
    });

    return parseFloat(result || 0);
  } catch (error) {
    console.error(`Error calculating project revenue for project ${projectId}:`, error);
    return 0; // Return 0 revenue if there's an error
  }
};

/**
 * Calculate project cost (sum of vendor bills + expenses + timesheet costs)
 * Excludes cancelled vendor bills, includes only approved/reimbursed expenses
 */
const calculateProjectCost = async (projectId) => {
  try {
    // Sum of vendor bills (excluding cancelled)
    const vendorBillCost = await VendorBill.sum('amount', {
      where: {
        project_id: projectId,
        status: { [Op.ne]: 'cancelled' }
      }
    });

    // Sum of all expenses except cancelled ones
    const expenseCost = await Expense.sum('amount', {
      where: {
        project_id: projectId,
        status: { [Op.ne]: 'cancelled' }
      }
    });

    // Sum of timesheet costs (calculate if cost is null)
    const timesheets = await Timesheet.findAll({
      where: {
        project_id: projectId
      },
      attributes: ['hours', 'cost', 'user_id'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['hourly_rate']
      }]
    });

    let timesheetCost = 0;
    const defaultHourlyRate = 50.00; // Default rate if user rate not set

    timesheets.forEach(timesheet => {
      if (timesheet.cost && timesheet.cost > 0) {
        timesheetCost += parseFloat(timesheet.cost);
      } else {
        // Calculate cost using user's hourly rate or default
        const hourlyRate = parseFloat(timesheet.user?.hourly_rate || defaultHourlyRate);
        timesheetCost += parseFloat(timesheet.hours || 0) * hourlyRate;
      }
    });

    const totalCost = parseFloat(vendorBillCost || 0) + parseFloat(expenseCost || 0) + parseFloat(timesheetCost || 0);
    return totalCost;
  } catch (error) {
    console.error(`Error calculating project cost for project ${projectId}:`, error);
    return 0; // Return 0 cost if there's an error
  }
};

/**
 * Calculate project profit (revenue - cost)
 */
const calculateProjectProfit = async (projectId) => {
  const revenue = await calculateProjectRevenue(projectId);
  const cost = await calculateProjectCost(projectId);
  return revenue - cost;
};

/**
 * Calculate budget usage percentage
 */
const calculateBudgetUsagePercentage = async (projectId) => {
  const project = await Project.findByPk(projectId, {
    attributes: ['budget']
  });

  if (!project || !project.budget || project.budget === 0) {
    return 0;
  }

  const cost = await calculateProjectCost(projectId);
  const budget = parseFloat(project.budget);

  return (cost / budget) * 100;
};

/**
 * Get all financial documents linked to a project (for Links Panel)
 */
const getProjectFinancialDocuments = async (projectId) => {
  const [customerInvoices, vendorBills, expenses, timesheets] = await Promise.all([
    // Customer Invoices
    CustomerInvoice.findAll({
      where: { project_id: projectId },
      attributes: ['id', 'invoice_number', 'customer_name', 'amount', 'status', 'invoice_date'],
      include: [
        {
          model: SalesOrder,
          as: 'salesOrder',
          attributes: ['id', 'order_number']
        }
      ],
      order: [['invoice_date', 'DESC']]
    }),

    // Vendor Bills
    VendorBill.findAll({
      where: { project_id: projectId },
      attributes: ['id', 'bill_number', 'vendor_name', 'amount', 'status', 'bill_date'],
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'order_number']
        }
      ],
      order: [['bill_date', 'DESC']]
    }),

    // Expenses
    Expense.findAll({
      where: { project_id: projectId },
      attributes: ['id', 'expense_number', 'description', 'amount', 'status', 'expense_date', 'is_billable'],
      include: [
        {
          model: require('../models').User,
          as: 'submittedBy',
          attributes: ['id', 'username', 'full_name']
        }
      ],
      order: [['expense_date', 'DESC']]
    }),

    // Timesheets
    Timesheet.findAll({
      where: { project_id: projectId },
      attributes: ['id', 'hours', 'cost', 'date', 'is_billable', 'description'],
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: require('../models').Task,
          as: 'task',
          attributes: ['id', 'title']
        }
      ],
      order: [['date', 'DESC']]
    })
  ]);

  return {
    customerInvoices,
    vendorBills,
    expenses,
    timesheets
  };
};

/**
 * Get detailed budget breakdown with categories
 */
const getProjectBudgetBreakdown = async (projectId) => {
  try {
    const project = await Project.findByPk(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all revenue and cost components with error handling
    const [vendorBillCost, expenseCost, customerInvoiceRevenue, vendorBills, expenses, customerInvoices, timesheets] = await Promise.all([
      // Total vendor bills
      VendorBill.sum('amount', {
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        }
      }).catch(error => {
        console.error('Error calculating vendor bill cost:', error);
        return 0;
      }),

      // Total expenses (include all except cancelled)
      Expense.sum('amount', {
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        }
      }).catch(error => {
        console.error('Error calculating expense cost:', error);
        return 0;
      }),

      // Total customer invoice revenue
      CustomerInvoice.sum('amount', {
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        }
      }).catch(error => {
        console.error('Error calculating customer invoice revenue:', error);
        return 0;
      }),

      // Get detailed records for breakdown
      VendorBill.findAll({
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: ['id', 'bill_number', 'vendor_name', 'amount', 'status', 'bill_date'],
        order: [['bill_date', 'DESC']]
      }).catch(error => {
        console.error('Error fetching vendor bills:', error);
        return [];
      }),

      Expense.findAll({
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: ['id', 'expense_number', 'description', 'amount', 'status', 'expense_date'],
        order: [['expense_date', 'DESC']]
      }).catch(error => {
        console.error('Error fetching expenses:', error);
        return [];
      }),

      CustomerInvoice.findAll({
        where: {
          project_id: projectId,
          status: { [Op.ne]: 'cancelled' }
        },
        attributes: ['id', 'invoice_number', 'customer_name', 'amount', 'status', 'invoice_date'],
        order: [['invoice_date', 'DESC']]
      }).catch(error => {
        console.error('Error fetching customer invoices:', error);
        return [];
      }),

      Timesheet.findAll({
        where: {
          project_id: projectId
        },
        attributes: ['id', 'hours', 'cost', 'date', 'description'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['full_name', 'username', 'hourly_rate']
          }
        ],
        order: [['date', 'DESC']]
      }).catch(error => {
        console.error('Error fetching timesheets:', error);
        return [];
      })
    ]);

    const budget = parseFloat(project.budget || 0);
    const totalVendorBills = parseFloat(vendorBillCost || 0);
    const totalExpenses = parseFloat(expenseCost || 0);
    const totalRevenue = parseFloat(customerInvoiceRevenue || 0);

    // Calculate total timesheet costs consistently with breakdown items
    const defaultHourlyRate = 50.00;
    let calculatedTimesheetTotal = 0;
    const processedTimesheets = timesheets.map(timesheet => {
      const hourlyRate = parseFloat(timesheet.user?.hourly_rate || defaultHourlyRate);
      const calculatedCost = timesheet.cost || (parseFloat(timesheet.hours || 0) * hourlyRate);
      calculatedTimesheetTotal += calculatedCost;
      return {
        ...timesheet.toJSON(),
        cost: calculatedCost
      };
    });

    const totalTimesheetCosts = calculatedTimesheetTotal;
    const totalSpent = totalVendorBills + totalExpenses + totalTimesheetCosts;
    const remaining = budget - totalSpent;
    const usagePercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

    return {
      project: {
        id: project.id,
        name: project.name,
        budget: budget
      },
      budget: {
        total: budget,
        spent: totalSpent,
        remaining: remaining,
        usagePercentage: usagePercentage,
        isOverBudget: totalSpent > budget
      },
      revenue: {
        total: totalRevenue,
        percentage: budget > 0 ? (totalRevenue / budget) * 100 : 0,
        count: customerInvoices.length,
        items: customerInvoices
      },
      breakdown: {
        customerInvoices: {
          total: totalRevenue,
          percentage: budget > 0 ? (totalRevenue / budget) * 100 : 0,
          count: customerInvoices.length,
          items: customerInvoices
        },
        vendorBills: {
          total: totalVendorBills,
          percentage: budget > 0 ? (totalVendorBills / budget) * 100 : 0,
          count: vendorBills.length,
          items: vendorBills
        },
        expenses: {
          total: totalExpenses,
          percentage: budget > 0 ? (totalExpenses / budget) * 100 : 0,
          count: expenses.length,
          items: expenses
        },
        timesheetCosts: {
          total: totalTimesheetCosts,
          percentage: budget > 0 ? (totalTimesheetCosts / budget) * 100 : 0,
          count: timesheets.length,
          items: processedTimesheets
        }
      },
      alerts: {
        isOverBudget: totalSpent > budget,
        isNearBudget: usagePercentage > 85 && usagePercentage <= 100,
        percentageUsed: usagePercentage
      }
    };
  } catch (error) {
    console.error(`Error getting budget breakdown for project ${projectId}:`, error);
    return {
      project: {
        id: projectId,
        name: 'Unknown Project',
        budget: 0
      },
      budget: {
        total: 0,
        spent: 0,
        remaining: 0,
        usagePercentage: 0,
        isOverBudget: false
      },
      revenue: {
        total: 0,
        percentage: 0,
        count: 0,
        items: []
      },
      breakdown: {
        vendorBills: {
          total: 0,
          percentage: 0,
          count: 0,
          items: []
        },
        expenses: {
          total: 0,
          percentage: 0,
          count: 0,
          items: []
        },
        timesheetCosts: {
          total: 0,
          percentage: 0,
          count: 0,
          items: []
        }
      },
      alerts: {
        isOverBudget: false,
        isNearBudget: false,
        percentageUsed: 0
      }
    };
  }
};

/**
 * Get budget summary for all projects (for dashboard)
 */
const getAllProjectsBudgetSummary = async () => {
  try {
    const projects = await Project.findAll({
      where: {
        budget: { [Op.gt]: 0 } // Only projects with budget set
      },
      attributes: ['id', 'name', 'budget', 'status'],
      order: [['name', 'ASC']]
    });

    console.log('Found projects:', projects.length);

    const summaries = [];
    
    for (const project of projects) {
      try {
        const totalCost = await calculateProjectCost(project.id);
        const budget = parseFloat(project.budget);
        const usagePercentage = budget > 0 ? (totalCost / budget) * 100 : 0;
        
        summaries.push({
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          budget: budget,
          spent: totalCost,
          remaining: budget - totalCost,
          usagePercentage: usagePercentage,
          isOverBudget: totalCost > budget,
          isNearBudget: usagePercentage > 85 && usagePercentage <= 100
        });
      } catch (projectError) {
        console.error(`Error calculating cost for project ${project.id}:`, projectError);
        // Add project with zero cost if there's an error
        summaries.push({
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          budget: parseFloat(project.budget),
          spent: 0,
          remaining: parseFloat(project.budget),
          usagePercentage: 0,
          isOverBudget: false,
          isNearBudget: false
        });
      }
    }

    return summaries;
  } catch (error) {
    console.error('Error in getAllProjectsBudgetSummary:', error);
    throw error;
  }
};

module.exports = {
  calculateProjectRevenue,
  calculateProjectCost,
  calculateProjectProfit,
  calculateBudgetUsagePercentage,
  getProjectFinancialDocuments,
  getProjectBudgetBreakdown,
  getAllProjectsBudgetSummary
};