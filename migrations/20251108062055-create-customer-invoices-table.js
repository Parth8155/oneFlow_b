'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('customer_invoices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      invoice_number: {
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
      sales_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sales_orders',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      customer_name: {
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
        type: Sequelize.ENUM('draft', 'sent', 'paid', 'cancelled'),
        defaultValue: 'draft',
        allowNull: false
      },
      invoice_date: {
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
    await queryInterface.addIndex('customer_invoices', ['project_id']);
    await queryInterface.addIndex('customer_invoices', ['sales_order_id']);
    await queryInterface.addIndex('customer_invoices', ['created_by']);
    await queryInterface.addIndex('customer_invoices', ['status']);
    await queryInterface.addIndex('customer_invoices', ['invoice_date']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('customer_invoices');
  }
};
