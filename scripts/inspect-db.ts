import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    let val = trimmed.substring(firstEq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

import { CustodyRecordModel, LockerModel, syncDatabase } from "../lib/db/models";
import { sequelize } from "../lib/db/config";

async function main() {
  await syncDatabase();

  const lockers = await LockerModel.findAll();
  console.log(`Total casilleros en DB: ${lockers.length}`);
  lockers.forEach(l => {
    console.log(`ID: ${l.id}, Row: ${l.row}, Col: ${l.col}, isOccupied: ${l.isOccupied}, currentRecordId: ${l.currentRecordId}`);
  });

  const records = await CustodyRecordModel.findAll();
  console.log(`Total registros en DB: ${records.length}`);
  records.forEach(r => {
    console.log(`Record ID: ${r.id}, Code: ${r.code}, LockerId: ${r.lockerId}, Status: ${r.status}`);
  });

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
