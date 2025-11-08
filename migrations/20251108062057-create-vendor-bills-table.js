'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('vendor_bills', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bill_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      project_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      purchase_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'purchase_orders',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      vendor_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'received', 'paid', 'cancelled'),
        defaultValue: 'draft',
        allowNull: false
      },
      bill_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('vendor_bills', ['project_id']);
    await queryInterface.addIndex('vendor_bills', ['purchase_order_id']);
    await queryInterface.addIndex('vendor_bills', ['created_by']);
    await queryInterface.addIndex('vendor_bills', ['status']);
    await queryInterface.addIndex('vendor_bills', ['bill_date']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('vendor_bills');
  }
};
