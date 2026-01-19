const db = require('./config/db');
const fs = require('fs');

async function migrate() {
  try {
    console.log('🚀 Starting tags migration...');

    const sql = fs.readFileSync('./migrations/add_tags.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }

    console.log('✅ Tags migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
