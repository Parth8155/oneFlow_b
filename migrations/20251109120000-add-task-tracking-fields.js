'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tasks', 'last_modified_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('tasks', 'last_modified_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('tasks', 'total_hours_worked', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false
    });

    await queryInterface.addColumn('tasks', 'estimated_hours', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });

    await queryInterface.addColumn('tasks', 'created_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tasks', 'last_modified_by');
    await queryInterface.removeColumn('tasks', 'last_modified_at');
    await queryInterface.removeColumn('tasks', 'total_hours_worked');
    await queryInterface.removeColumn('tasks', 'estimated_hours');
    await queryInterface.removeColumn('tasks', 'created_by');
  }
};