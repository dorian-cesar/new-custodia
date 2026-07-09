import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Loading environment variables from .env...');
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const firstEq = trimmed.indexOf('=');
      if (firstEq === -1) return;
      const key = trimmed.substring(0, firstEq).trim();
      let val = trimmed.substring(firstEq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    });
  } else {
    console.warn('.env file not found!');
  }

  console.log(`Target database: ${process.env.DB_NAME}`);
  console.log('Synchronizing database and seeding default users...');
  
  try {
    // Dynamic import to ensure process.env is populated before sequelize initializes
    const { syncDatabase } = await import('../lib/db/models');
    await syncDatabase();
    console.log('Success! Database synchronized and default users seeded successfully.');
    console.log('Users created:');
    console.log('- User: "cajero" | Role: "cajero" | Password: "1234"');
    console.log('- User: "cajero2" | Role: "cajero" | Password: "1234"');
    console.log('- User: "admin" | Role: "supervisor" (Admin) | Password: "admin123"');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
}

main().catch(console.error);
