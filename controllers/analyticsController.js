const analyticsService = require('../services/analyticsService');

/**
 * Get dashboard KPIs
 */
const getDashboardKPIs = async (req, res) => {
  try {
    const kpis = await analyticsService.getDashboardKPIs();

    res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Error getting dashboard KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard KPIs',
      error: error.message
    });
  }
};

/**
 * Get project progress data for all active projects
 */
const getProjectProgressData = async (req, res) => {
  try {
    const progressData = await analyticsService.getProjectProgressData();

    res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Error getting project progress data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project progress data',
      error: error.message
    });
  }
};

/**
 * Get resource utilization data by team member
 */
const getResourceUtilizationData = async (req, res) => {
  try {
    const utilizationData = await analyticsService.getResourceUtilizationData();

    res.json({
      success: true,
      data: utilizationData
    });
  } catch (error) {
    console.error('Error getting resource utilization data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resource utilization data',
      error: error.message
    });
  }
};

/**
 * Get cost vs revenue comparison data
 */
const getCostRevenueComparisonData = async (req, res) => {
  try {
    const comparisonData = await analyticsService.getCostRevenueComparisonData();

    res.json({
      success: true,
      data: comparisonData
    });
  } catch (error) {
    console.error('Error getting cost vs revenue comparison data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cost vs revenue comparison data',
      error: error.message
    });
  }
};

/**
 * Get billable vs non-billable hours breakdown
 */
const getBillableHoursData = async (req, res) => {
  try {
    const billableHoursData = await analyticsService.getBillableHoursData();

    res.json({
      success: true,
      data: billableHoursData
    });
  } catch (error) {
    console.error('Error getting billable hours data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billable hours data',
      error: error.message
    });
  }
};

/**
 * Get tasks completed count
 */
const getTasksCompletedCount = async (req, res) => {
  try {
    const tasksCompleted = await analyticsService.getTasksCompletedCount();

    res.json({
      success: true,
      data: tasksCompleted
    });
  } catch (error) {
    console.error('Error getting tasks completed count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks completed count',
      error: error.message
    });
  }
};

/**
 * Get financial summary data
 */
const getFinancialSummary = async (req, res) => {
  try {
    const financialSummary = await analyticsService.getFinancialSummary();

    res.json({
      success: true,
      data: financialSummary
    });
  } catch (error) {
    console.error('Error getting financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial summary',
      error: error.message
    });
  }
};

/**
 * Get comprehensive analytics data (all analytics in one response)
 */
const getComprehensiveAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.getComprehensiveAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting comprehensive analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comprehensive analytics',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardKPIs,
  getProjectProgressData,
  getResourceUtilizationData,
  getCostRevenueComparisonData,
  getBillableHoursData,
  getTasksCompletedCount,
  getFinancialSummary,
  getComprehensiveAnalytics
};