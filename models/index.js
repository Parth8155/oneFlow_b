const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, DataTypes);
db.Project = require('./project')(sequelize, DataTypes);
db.ProjectMember = require('./projectMember')(sequelize, DataTypes);
db.Task = require('./task')(sequelize, DataTypes);
db.TaskComment = require('./taskComment')(sequelize, DataTypes);
db.TaskAttachment = require('./taskAttachment')(sequelize, DataTypes);
db.Timesheet = require('./timesheet')(sequelize, DataTypes);
db.SalesOrder = require('./salesOrder')(sequelize, DataTypes);
db.PurchaseOrder = require('./purchaseOrder')(sequelize, DataTypes);
db.CustomerInvoice = require('./customerInvoice')(sequelize, DataTypes);
db.VendorBill = require('./vendorBill')(sequelize, DataTypes);
db.Expense = require('./expense')(sequelize, DataTypes);

// Define associations

// User associations
db.User.hasMany(db.Project, { foreignKey: 'project_manager_id', as: 'managedProjects' });
db.User.hasMany(db.ProjectMember, { foreignKey: 'user_id', as: 'projectMemberships' });
db.User.hasMany(db.Task, { foreignKey: 'assigned_to', as: 'assignedTasks' });
db.User.hasMany(db.TaskComment, { foreignKey: 'user_id', as: 'comments' });
db.User.hasMany(db.TaskAttachment, { foreignKey: 'uploaded_by', as: 'attachments' });
db.User.hasMany(db.Timesheet, { foreignKey: 'user_id', as: 'timesheets' });
db.User.hasMany(db.SalesOrder, { foreignKey: 'created_by', as: 'createdSalesOrders' });
db.User.hasMany(db.PurchaseOrder, { foreignKey: 'created_by', as: 'createdPurchaseOrders' });
db.User.hasMany(db.CustomerInvoice, { foreignKey: 'created_by', as: 'createdInvoices' });
db.User.hasMany(db.VendorBill, { foreignKey: 'created_by', as: 'createdBills' });
db.User.hasMany(db.Expense, { foreignKey: 'submitted_by', as: 'submittedExpenses' });
db.User.hasMany(db.Expense, { foreignKey: 'approved_by', as: 'approvedExpenses' });

// Project associations
db.Project.belongsTo(db.User, { foreignKey: 'project_manager_id', as: 'projectManager' });
db.Project.hasMany(db.ProjectMember, { foreignKey: 'project_id', as: 'members' });
db.Project.hasMany(db.Task, { foreignKey: 'project_id', as: 'tasks' });
db.Project.hasMany(db.Timesheet, { foreignKey: 'project_id', as: 'timesheets' });
db.Project.hasMany(db.SalesOrder, { foreignKey: 'project_id', as: 'salesOrders' });
db.Project.hasMany(db.PurchaseOrder, { foreignKey: 'project_id', as: 'purchaseOrders' });
db.Project.hasMany(db.CustomerInvoice, { foreignKey: 'project_id', as: 'customerInvoices' });
db.Project.hasMany(db.VendorBill, { foreignKey: 'project_id', as: 'vendorBills' });
db.Project.hasMany(db.Expense, { foreignKey: 'project_id', as: 'expenses' });

// ProjectMember associations (junction table)
db.ProjectMember.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.ProjectMember.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// Task associations
db.Task.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.Task.belongsTo(db.User, { foreignKey: 'assigned_to', as: 'assignedUser' });
db.Task.hasMany(db.TaskComment, { foreignKey: 'task_id', as: 'comments' });
db.Task.hasMany(db.TaskAttachment, { foreignKey: 'task_id', as: 'attachments' });
db.Task.hasMany(db.Timesheet, { foreignKey: 'task_id', as: 'timesheets' });

// TaskComment associations
db.TaskComment.belongsTo(db.Task, { foreignKey: 'task_id', as: 'task' });
db.TaskComment.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });

// TaskAttachment associations
db.TaskAttachment.belongsTo(db.Task, { foreignKey: 'task_id', as: 'task' });
db.TaskAttachment.belongsTo(db.User, { foreignKey: 'uploaded_by', as: 'uploadedBy' });

// Timesheet associations
db.Timesheet.belongsTo(db.Task, { foreignKey: 'task_id', as: 'task' });
db.Timesheet.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Timesheet.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });

// SalesOrder associations
db.SalesOrder.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.SalesOrder.belongsTo(db.User, { foreignKey: 'created_by', as: 'createdBy' });
db.SalesOrder.hasMany(db.CustomerInvoice, { foreignKey: 'sales_order_id', as: 'invoices' });

// PurchaseOrder associations
db.PurchaseOrder.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.PurchaseOrder.belongsTo(db.User, { foreignKey: 'created_by', as: 'createdBy' });
db.PurchaseOrder.hasMany(db.VendorBill, { foreignKey: 'purchase_order_id', as: 'bills' });

// CustomerInvoice associations
db.CustomerInvoice.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.CustomerInvoice.belongsTo(db.SalesOrder, { foreignKey: 'sales_order_id', as: 'salesOrder' });
db.CustomerInvoice.belongsTo(db.User, { foreignKey: 'created_by', as: 'createdBy' });

// VendorBill associations
db.VendorBill.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.VendorBill.belongsTo(db.PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });
db.VendorBill.belongsTo(db.User, { foreignKey: 'created_by', as: 'createdBy' });

// Expense associations
db.Expense.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.Expense.belongsTo(db.User, { foreignKey: 'submitted_by', as: 'submittedBy' });
db.Expense.belongsTo(db.User, { foreignKey: 'approved_by', as: 'approvedBy' });

module.exports = db;