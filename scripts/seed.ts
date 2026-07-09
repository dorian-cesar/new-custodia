import { syncDatabase } from '../lib/db/models';

async function main() {
  console.log('Synchronizing database and seeding default users...');
  try {
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

main();
