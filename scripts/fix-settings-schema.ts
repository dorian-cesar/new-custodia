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

import { SettingModel, syncDatabase } from "../lib/db/models";
import { sequelize } from "../lib/db/config";
import { DEFAULT_LAYOUT } from "../lib/types";

async function main() {
  console.log("Modificando columna 'value' en tabla 'settings' a LONGTEXT en la base de datos...");
  await syncDatabase();

  try {
    await sequelize.query("ALTER TABLE settings MODIFY COLUMN value LONGTEXT;");
    console.log("Columna 'value' modificada exitosamente a LONGTEXT.");
  } catch (e) {
    console.log("Nota sobre alter table:", e);
  }

  // Restablecer layout_config con la configuración por defecto válida
  await SettingModel.upsert({
    key: "layout_config",
    value: JSON.stringify(DEFAULT_LAYOUT),
  } as any);

  console.log("Configuración 'layout_config' restablecida a JSON válido en la base de datos.");

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error al reparar la base de datos:", err);
  process.exit(1);
});
