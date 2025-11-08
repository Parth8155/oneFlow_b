const { CustomerInvoice, VendorBill, Expense, Timesheet, Project, SalesOrder, PurchaseOrder } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate project revenue (sum of customer invoices)
 * Excludes cancelled invoices
 */
const calculateProjectRevenue = async (projectId) => {
  const result = await CustomerInvoice.sum('amount', {
    where: {
      project_id: projectId,
      status: { [Op.ne]: 'cancelled' }
    }
  });

  return parseFloat(result || 0);
};

/**
 * Calculate project cost (sum of vendor bills + expenses + timesheet costs)
 * Excludes cancelled vendor bills, includes only approved/reimbursed expenses
 */
const calculateProjectCost = async (projectId) => {
  // Sum of vendor bills (excluding cancelled)
  const vendorBillCost = await VendorBill.sum('amount', {
    where: {
      project_id: projectId,
      status: { [Op.ne]: 'cancelled' }
    }
  });

  // Sum of approved/reimbursed expenses
  const expenseCost = await Expense.sum('amount', {
    where: {
      project_id: projectId,
      status: { [Op.in]: ['approved', 'reimbursed'] }
    }
  });

  // Sum of timesheet costs
  const timesheetCost = await Timesheet.sum('cost', {
    where: {
      project_id: projectId
    }
  });

  const totalCost = parseFloat(vendorBillCost || 0) + parseFloat(expenseCost || 0) + parseFloat(timesheetCost || 0);
  return totalCost;
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
 * Get comprehensive project financial analytics
 */
const getProjectFinancialAnalytics = async (projectId) => {
  const [revenue, cost, profit, budgetUsage] = await Promise.all([
    calculateProjectRevenue(projectId),
    calculateProjectCost(projectId),
    calculateProjectProfit(projectId),
    calculateBudgetUsagePercentage(projectId)
  ]);

  return {
    revenue,
    cost,
    profit,
    budgetUsagePercentage: budgetUsage
  };
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

module.exports = {
  calculateProjectRevenue,
  calculateProjectCost,
  calculateProjectProfit,
  calculateBudgetUsagePercentage,
  getProjectFinancialAnalytics,
  getProjectFinancialDocuments
};