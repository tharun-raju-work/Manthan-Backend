'use strict';
const fs = require('fs');
const path = require('path');

const findSchemaFile = () => {
  // Update path to match your project structure
  const sqlPath = path.join(__dirname, '../../db/migrations/001_initial_schema.sql');
  
  if (fs.existsSync(sqlPath)) {
    console.log('Found schema file at:', sqlPath);
    return sqlPath;
  }
  throw new Error(`Schema file not found at: ${sqlPath}`);
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Read the SQL file
      const sqlPath = findSchemaFile();
      const sql = fs.readFileSync(sqlPath, 'utf8');
      console.log('Successfully read schema file');

      // Split SQL into individual statements
      // Handle both semicolon and GO statement separators
      const statements = sql
        .replace(/\bGO\b/g, ';')  // Replace GO with semicolon
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);

      console.log(`Found ${statements.length} SQL statements to execute`);

      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          await queryInterface.sequelize.query(statement, {
            raw: true,
            type: queryInterface.sequelize.QueryTypes.RAW
          });
          console.log(`Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, statement);
          console.error('Error details:', error.message);
          throw error;
        }
      }

      console.log('All SQL statements executed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Get all tables
      const tables = await queryInterface.showAllTables();
      console.log('Tables to drop:', tables);
      
      // Drop all tables in reverse order to handle dependencies
      for (const table of tables.reverse()) {
        try {
          await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`, {
            raw: true,
            type: queryInterface.sequelize.QueryTypes.RAW
          });
          console.log(`Dropped table: ${table}`);
        } catch (error) {
          console.error(`Error dropping table ${table}:`, error.message);
          throw error;
        }
      }
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 