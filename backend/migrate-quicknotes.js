const db = require('./config/db');
const fs = require('fs');

async function migrate() {
  try {
    console.log('🚀 Starting quicknotes migration...');

    const sql = fs.readFileSync('./migrations/add_quicknotes.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }

    console.log('✅ Quicknotes migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
