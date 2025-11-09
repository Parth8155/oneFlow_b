const financialService = require('../services/financialService');

/**
 * Get all financial documents linked to a project
 */
const getProjectFinancialDocuments = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate project ID
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const documents = await financialService.getProjectFinancialDocuments(projectId);

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error getting project financial documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project financial documents',
      error: error.message
    });
  }
};

/**
 * Get project revenue
 */
const getProjectRevenue = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const revenue = await financialService.calculateProjectRevenue(projectId);

    res.json({
      success: true,
      data: { revenue }
    });
  } catch (error) {
    console.error('Error calculating project revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate project revenue',
      error: error.message
    });
  }
};

/**
 * Get project cost
 */
const getProjectCost = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const cost = await financialService.calculateProjectCost(projectId);

    res.json({
      success: true,
      data: { cost }
    });
  } catch (error) {
    console.error('Error calculating project cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate project cost',
      error: error.message
    });
  }
};

/**
 * Get project profit
 */
const getProjectProfit = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const profit = await financialService.calculateProjectProfit(projectId);

    res.json({
      success: true,
      data: { profit }
    });
  } catch (error) {
    console.error('Error calculating project profit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate project profit',
      error: error.message
    });
  }
};

/**
 * Get budget usage percentage
 */
const getBudgetUsagePercentage = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const budgetUsagePercentage = await financialService.calculateBudgetUsagePercentage(projectId);

    res.json({
      success: true,
      data: { budgetUsagePercentage }
    });
  } catch (error) {
    console.error('Error calculating budget usage percentage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate budget usage percentage',
      error: error.message
    });
  }
};

/**
 * Get detailed budget breakdown for a project
 */
const getProjectBudgetBreakdown = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const budgetBreakdown = await financialService.getProjectBudgetBreakdown(projectId);

    res.json({
      success: true,
      data: budgetBreakdown
    });
  } catch (error) {
    console.error('Error getting project budget breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project budget breakdown',
      error: error.message
    });
  }
};

/**
 * Get budget summary for all projects
 */
const getAllProjectsBudgetSummary = async (req, res) => {
  try {
    console.log('getAllProjectsBudgetSummary endpoint called');
    const budgetSummary = await financialService.getAllProjectsBudgetSummary();
    console.log('Budget summary result:', budgetSummary);

    res.json({
      success: true,
      data: budgetSummary
    });
  } catch (error) {
    console.error('Error getting projects budget summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get projects budget summary',
      error: error.message
    });
  }
};

module.exports = {
  getProjectFinancialDocuments,
  getProjectRevenue,
  getProjectCost,
  getProjectProfit,
  getBudgetUsagePercentage,
  getProjectBudgetBreakdown,
  getAllProjectsBudgetSummary
};