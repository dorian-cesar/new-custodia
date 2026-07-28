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

import { getInitialState } from "../app/actions/db-actions";
import { sequelize } from "../lib/db/config";

async function main() {
  const state = await getInitialState();
  if (!state.success || !state.data) {
    console.error("Error al obtener estado:", state.error);
    process.exit(1);
  }

  const { lockers, records } = state.data;
  const occupied = lockers.filter((l) => l.isOccupied);
  const activeRecords = records.filter((r) => r.status === "Activo");

  console.log(`Total lockers: ${lockers.length}`);
  console.log(`Lockers marcados como Ocupados en getInitialState(): ${occupied.length}`);
  console.log(`Registros de custodia Activos en getInitialState(): ${activeRecords.length}`);

  if (occupied.length > 0) {
    console.log("Lockers ocupados detalle:");
    occupied.forEach((l) => console.log(`  - Locker ID: ${l.id}, Row: ${l.row}, Col: ${l.col}, recordId: ${l.currentRecordId}`));
  }

  if (activeRecords.length > 0) {
    console.log("Registros activos detalle:");
    activeRecords.forEach((r) => console.log(`  - Record ID: ${r.id}, Code: ${r.code}, LockerId: ${r.lockerId}, Client: ${r.clientDocument}`));
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
