'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('purchase_orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      order_number: {
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
        type: Sequelize.ENUM('draft', 'confirmed', 'received', 'cancelled'),
        defaultValue: 'draft',
        allowNull: false
      },
      order_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
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
    await queryInterface.addIndex('purchase_orders', ['project_id']);
    await queryInterface.addIndex('purchase_orders', ['created_by']);
    await queryInterface.addIndex('purchase_orders', ['status']);
    await queryInterface.addIndex('purchase_orders', ['order_date']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('purchase_orders');
  }
};
