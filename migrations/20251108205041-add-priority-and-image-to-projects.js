'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('projects', 'priority', {
      type: Sequelize.ENUM('high', 'medium', 'low'),
      defaultValue: 'medium',
      allowNull: false
    });

    await queryInterface.addColumn('projects', 'image', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('projects', 'priority');
    await queryInterface.removeColumn('projects', 'image');
  }
};
