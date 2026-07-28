import fs from "fs";
import path from "path";

// 1. Cargar .env PRIMERO antes de importar cualquier modulo de DB
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

console.log(`Conectando a MySQL DB_HOST: ${process.env.DB_HOST}...`);

// 2. Ahora importar sequelize y models
import { sequelize } from "../lib/db/config";
import { SettingModel, syncDatabase } from "../lib/db/models";
import { DEFAULT_LAYOUT } from "../lib/types";

async function main() {
  await syncDatabase();

  console.log("Alterando tabla 'settings' columna 'value' a LONGTEXT en MySQL AWS RDS...");
  try {
    await sequelize.query("ALTER TABLE settings MODIFY COLUMN `value` LONGTEXT;");
    console.log("¡Éxito! Columna 'value' modificada a LONGTEXT en MySQL.");
  } catch (e) {
    console.error("Error ejecutando ALTER TABLE en MySQL:", e);
  }

  // Reparar el registro layout_config en MySQL con JSON completo
  const jsonLayout = JSON.stringify(DEFAULT_LAYOUT);
  console.log(`Guardando layout_config de longitud ${jsonLayout.length} caracteres...`);

  await SettingModel.upsert({
    key: "layout_config",
    value: jsonLayout,
  } as any);

  // Verificar lectura
  const verifyRecord = await SettingModel.findOne({ where: { key: "layout_config" } });
  if (verifyRecord) {
    const val = (verifyRecord as any).value;
    console.log(`Verificación: Longitud guardada en DB = ${val.length} caracteres.`);
    const parsed = JSON.parse(val);
    console.log(`¡Verificación de JSON.parse exitosa! Shelves count: ${parsed.shelves?.length}`);
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
