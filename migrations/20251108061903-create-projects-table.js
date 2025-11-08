'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'on_hold'),
        defaultValue: 'planned',
        allowNull: false
      },
      project_manager_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      budget: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0.00,
        allowNull: false
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
    await queryInterface.addIndex('projects', ['project_manager_id']);
    await queryInterface.addIndex('projects', ['status']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('projects');
  }
};
