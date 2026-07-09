import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Reading .env file...');
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found!');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    let val = trimmed.substring(firstEq + 1).trim();
    // Strip quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  });

  const host = env.DB_HOST;
  const port = parseInt(env.DB_PORT || '3306', 10);
  const user = env.DB_USER;
  const password = env.DB_PASSWORD;
  const dbName = env.DB_NAME || 'CustodtiaTermianlSurWeb';

  console.log(`Connecting to MySQL server at ${host}:${port} as ${user}...`);
  
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    console.log(`Creating database '${dbName}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${dbName}' verified/created successfully!`);
    
    await connection.end();
  } catch (error) {
    console.error('Error connecting to database server or creating database:', error);
  }
}

main().catch(console.error);
