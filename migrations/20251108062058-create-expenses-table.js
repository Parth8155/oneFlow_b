'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      expense_number: {
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
      submitted_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_billable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('submitted', 'approved', 'rejected', 'reimbursed'),
        defaultValue: 'submitted',
        allowNull: false
      },
      receipt_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      expense_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('expenses', ['project_id']);
    await queryInterface.addIndex('expenses', ['submitted_by']);
    await queryInterface.addIndex('expenses', ['approved_by']);
    await queryInterface.addIndex('expenses', ['status']);
    await queryInterface.addIndex('expenses', ['expense_date']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('expenses');
  }
};
