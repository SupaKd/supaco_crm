const db = require('./config/db');
const fs = require('fs');

async function migrate() {
  try {
    console.log('🚀 Starting website_url migration...');

    const sql = fs.readFileSync('./migrations/add_website_url.sql', 'utf8');
    const statements = sql.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }

    console.log('✅ Website URL migration completed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column website_url already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
