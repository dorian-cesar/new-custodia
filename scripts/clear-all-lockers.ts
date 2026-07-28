import fs from "fs";
import path from "path";

// Cargar variables de entorno desde .env manualmente
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

import { CustodyRecordModel, LockerModel, SettingModel, syncDatabase } from "../lib/db/models";
import { sequelize } from "../lib/db/config";
import { generateLockers, DEFAULT_LAYOUT, LayoutConfig } from "../lib/types";

async function main() {
  console.log("Iniciando vaciado completo de la base de datos de casilleros...");
  await syncDatabase();

  // 1. Marcar todos los registros de custodia activos como "Entregado"
  const [recordsUpdated] = await CustodyRecordModel.update(
    {
      status: "Entregado",
      exitTime: new Date().toISOString(),
    },
    {
      where: { status: "Activo" },
    }
  );
  console.log(`Registros de custodia activos finalizados: ${recordsUpdated}`);

  // 2. Cargar la configuración de layout actual de admin
  let layoutSetting = await SettingModel.findOne({ where: { key: "layout_config" } });
  let currentLayout: LayoutConfig = DEFAULT_LAYOUT;
  if (layoutSetting) {
    try {
      currentLayout = JSON.parse((layoutSetting as any).value);
    } catch (e) {}
  }

  // 3. Eliminar casilleros existentes y volver a regenerarlos completamente limpios y vacíos
  await LockerModel.destroy({ where: {}, truncate: true });
  const freshLockers = generateLockers(currentLayout);
  await LockerModel.bulkCreate(freshLockers as any[]);

  console.log(`¡Todos los casilleros fueron restablecidos a VACÍOS / DISPONIBLES (${freshLockers.length} casilleros)!`);

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error al vaciar los casilleros:", err);
  process.exit(1);
});
