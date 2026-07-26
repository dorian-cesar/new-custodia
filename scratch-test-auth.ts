import fs from 'fs';
import path from 'path';

async function main() {
  const envPath = path.join(__dirname, '.env');
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
  }

  const { CashTransactionModel, syncDatabase } = await import('./lib/db/models');
  await syncDatabase();

  const transactions = await CashTransactionModel.findAll();
  console.log(`Found ${transactions.length} transactions in database.`);
  let count = 0;
  for (const t of transactions) {
    const plain = t.get({ plain: true }) as any;
    if (!plain.description) {
      console.log(`WARNING: Transaction id=${plain.id} has null/undefined description!`, plain);
      count++;
    } else {
      console.log(`Transaction id=${plain.id}, desc="${plain.description}"`);
    }
  }
  console.log(`Total invalid transactions: ${count}`);
}

main().catch(console.error);
