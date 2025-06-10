
const db = require('../config/database');

async function resetJobTables() {
  console.log('Starting job tables reset...');
  
  try {
    // Read and execute the SQL script
    const fs = require('fs');
    const path = require('path');
    const sqlScript = fs.readFileSync(path.join(__dirname, '../models/db.sql'), 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = sqlScript.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log('Executing:', statement.substring(0, 100) + '...');
          await db.query(statement);
        } catch (error) {
          // Log but continue - some statements might fail if objects don't exist
          console.log('Statement failed (this might be normal):', error.message);
        }
      }
    }
    
    console.log('Job tables reset completed successfully!');
    
    // Verify the Jobs table structure
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Jobs' 
      ORDER BY ordinal_position
    `);
    
    console.log('Jobs table structure:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error resetting job tables:', error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  resetJobTables()
    .then(() => {
      console.log('Reset script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Reset script failed:', error);
      process.exit(1);
    });
}

module.exports = { resetJobTables };
