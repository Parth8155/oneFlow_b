const { Project, Task, Timesheet, User, CustomerInvoice, VendorBill, Expense } = require('../models');
const { Op, Sequelize } = require('sequelize');
const financialService = require('./financialService');

/**
 * Get dashboard KPIs
 * Returns: Active Projects, Delayed Tasks, Hours Logged, Revenue Earned
 */
const getDashboardKPIs = async () => {
  // Active Projects: Count of projects with status 'in_progress'
  const activeProjects = await Project.count({
    where: { status: 'in_progress' }
  });

  // Delayed Tasks: Tasks that are overdue (due_date < current date and status not 'done')
  const delayedTasks = await Task.count({
    where: {
      due_date: { [Op.lt]: new Date() },
      status: { [Op.in]: ['in_progress', 'blocked'] }
    }
  });

  // Hours Logged: Sum of all timesheet hours
  const hoursLoggedResult = await Timesheet.sum('hours');
  const hoursLogged = parseFloat(hoursLoggedResult || 0);

  // Revenue Earned: Sum of all customer invoice amounts (excluding cancelled)
  const revenueEarnedResult = await CustomerInvoice.sum('amount', {
    where: { status: { [Op.ne]: 'cancelled' } }
  });
  const revenueEarned = parseFloat(revenueEarnedResult || 0);

  return {
    activeProjects,
    delayedTasks,
    hoursLogged,
    revenueEarned
  };
};

/**
 * Get project progress data for all active projects
 * Returns: Array of projects with progress percentage
 */
const getProjectProgressData = async () => {
  const projects = await Project.findAll({
    where: { status: 'in_progress' },
    attributes: ['id', 'name', 'status', 'deadline', 'budget'],
    include: [
      {
        model: Task,
        as: 'tasks',
        attributes: ['id', 'status']
      }
    ]
  });

  const progressData = projects.map(project => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(task => task.status === 'done').length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      deadline: project.deadline,
      budget: project.budget,
      totalTasks,
      completedTasks,
      progressPercentage: Math.round(progressPercentage * 100) / 100 // Round to 2 decimal places
    };
  });

  return progressData;
};

/**
 * Get resource utilization data by team member
 * Returns: Array of team members with utilization metrics
 */
const getResourceUtilizationData = async () => {
  const teamMembers = await User.findAll({
    where: { role: 'team_member' },
    attributes: ['id', 'username', 'full_name', 'hourly_rate'],
    include: [
      {
        model: Timesheet,
        as: 'timesheets',
        attributes: ['hours', 'is_billable', 'date']
      }
    ]
  });

  const utilizationData = await Promise.all(teamMembers.map(async (member) => {
    const totalHours = member.timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = member.timesheets
      .filter(ts => ts.is_billable)
      .reduce((sum, ts) => sum + parseFloat(ts.hours), 0);

    // Calculate utilization as percentage of standard work hours (assuming 40 hours/week * 4 weeks = 160 hours/month)
    const standardHoursPerMonth = 160;
    const utilizationPercentage = (totalHours / standardHoursPerMonth) * 100;

    // Calculate revenue generated (billable hours * hourly rate)
    const revenueGenerated = billableHours * parseFloat(member.hourly_rate || 0);

    return {
      id: member.id,
      username: member.username,
      fullName: member.full_name,
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      revenueGenerated: Math.round(revenueGenerated * 100) / 100,
      hourlyRate: member.hourly_rate
    };
  }));

  return utilizationData;
};

/**
 * Get cost vs revenue comparison data for all projects
 * Returns: Array of projects with financial metrics
 */
const getCostRevenueComparisonData = async () => {
  const projects = await Project.findAll({
    attributes: ['id', 'name', 'status', 'budget']
  });

  const comparisonData = await Promise.all(projects.map(async (project) => {
    const revenue = await financialService.calculateProjectRevenue(project.id);
    const cost = await financialService.calculateProjectCost(project.id);
    const profit = revenue - cost;
    const budgetUsagePercentage = project.budget && project.budget > 0 ?
      (cost / parseFloat(project.budget)) * 100 : 0;

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      budget: project.budget,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      budgetUsagePercentage: Math.round(budgetUsagePercentage * 100) / 100
    };
  }));

  return comparisonData;
};

/**
 * Get billable vs non-billable hours breakdown
 * Returns: Total billable and non-billable hours across all timesheets
 */
const getBillableHoursData = async () => {
  // Get billable hours
  const billableResult = await Timesheet.sum('hours', {
    where: { is_billable: true }
  });
  const billableHours = parseFloat(billableResult || 0);

  // Get non-billable hours
  const nonBillableResult = await Timesheet.sum('hours', {
    where: { is_billable: false }
  });
  const nonBillableHours = parseFloat(nonBillableResult || 0);

  // Get total hours
  const totalHours = billableHours + nonBillableHours;

  // Calculate percentages
  const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
  const nonBillablePercentage = totalHours > 0 ? (nonBillableHours / totalHours) * 100 : 0;

  return {
    billableHours: Math.round(billableHours * 100) / 100,
    nonBillableHours: Math.round(nonBillableHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
    billablePercentage: Math.round(billablePercentage * 100) / 100,
    nonBillablePercentage: Math.round(nonBillablePercentage * 100) / 100
  };
};

/**
 * Get tasks completed count
 * Returns: Total count of completed tasks
 */
const getTasksCompletedCount = async () => {
  const completedTasks = await Task.count({
    where: { status: 'done' }
  });

  return { completedTasks };
};

/**
 * Get comprehensive analytics data
 * Returns: All analytics data in one response
 */
const getComprehensiveAnalytics = async () => {
  const [
    kpis,
    projectProgress,
    resourceUtilization,
    costRevenueComparison,
    billableHours,
    tasksCompleted
  ] = await Promise.all([
    getDashboardKPIs(),
    getProjectProgressData(),
    getResourceUtilizationData(),
    getCostRevenueComparisonData(),
    getBillableHoursData(),
    getTasksCompletedCount()
  ]);

  return {
    kpis,
    projectProgress,
    resourceUtilization,
    costRevenueComparison,
    billableHours,
    tasksCompleted
  };
};

module.exports = {
  getDashboardKPIs,
  getProjectProgressData,
  getResourceUtilizationData,
  getCostRevenueComparisonData,
  getBillableHoursData,
  getTasksCompletedCount,
  getComprehensiveAnalytics
};