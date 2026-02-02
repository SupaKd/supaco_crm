const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  try {
    console.log('🔄 Connexion à la base de données...');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'project_manager',
      multipleStatements: true
    });

    console.log('✅ Connecté à la base de données\n');

    // Lire le fichier de migration
    const migrationFile = path.join(__dirname, '..', 'migrations', 'create_time_tracking.sql');

    if (!fs.existsSync(migrationFile)) {
      console.error('❌ Fichier de migration non trouvé:', migrationFile);
      process.exit(1);
    }

    console.log('📄 Lecture du fichier de migration...');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('🔄 Exécution de la migration...\n');
    await connection.query(sql);

    console.log('✅ Migration exécutée avec succès!\n');
    console.log('Tables créées:');
    console.log('  - time_entries');
    console.log('  - project_hourly_rates');
    console.log('  - tasks.estimated_hours (colonne ajoutée)\n');

    await connection.end();
    console.log('✅ Terminé!');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

runMigrations();
