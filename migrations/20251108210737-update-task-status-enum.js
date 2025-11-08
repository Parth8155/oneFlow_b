'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop the existing enum type and recreate with new values
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(50);
      DROP TYPE IF EXISTS "enum_tasks_status";
      CREATE TYPE "enum_tasks_status" AS ENUM('to_do', 'in_progress', 'approval', 'completed');
      ALTER TABLE tasks ALTER COLUMN status TYPE "enum_tasks_status" USING status::text::"enum_tasks_status";
      ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'to_do';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Revert back to original enum values
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(50);
      DROP TYPE IF EXISTS "enum_tasks_status";
      CREATE TYPE "enum_tasks_status" AS ENUM('new', 'in_progress', 'blocked', 'done');
      ALTER TABLE tasks ALTER COLUMN status TYPE "enum_tasks_status" USING status::text::"enum_tasks_status";
      ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'new';
    `);
  }
};
