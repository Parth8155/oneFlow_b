const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Timesheet = sequelize.define('Timesheet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    hours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    is_billable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true // Will be calculated
    }
  }, {
    tableName: 'timesheets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return Timesheet;
};