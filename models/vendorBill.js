const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VendorBill = sequelize.define('VendorBill', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bill_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    purchase_order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'purchase_orders',
        key: 'id'
      }
    },
    vendor_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'received', 'paid', 'cancelled'),
      defaultValue: 'draft'
    },
    bill_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'vendor_bills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VendorBill;
};