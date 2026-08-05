/**
 * Script de migración de casilleros — Ejecutar manualmente
 *
 * USO:
 *   npm run migrate:lockers
 *
 * QUÉ HACE:
 *   - Borra registros de custodia, transacciones y cajas (datos de movimiento)
 *   - Borra todos los casilleros existentes
 *   - Crea los 204 casilleros nuevos (4 sectores × S/M/L/XL + sector B con XXL)
 *
 * QUÉ NO TOCA:
 *   - Usuarios (cajeros y supervisores)
 *   - Precios configurados en /admin
 *
 * ADVERTENCIA: Este script BORRA datos de movimiento. Usarlo con cuidado.
 */

import { sequelize } from "../lib/db/config";
import { DataTypes, Model } from "sequelize";

// ── Modelos mínimos para operar ──────────────────────────────────────────────

class LockerModel extends Model {}
LockerModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    row: { type: DataTypes.INTEGER, allowNull: false },
    col: { type: DataTypes.STRING, allowNull: false },
    isOccupied: { type: DataTypes.BOOLEAN, defaultValue: false },
    currentRecordId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: "Locker", tableName: "lockers", timestamps: false }
);

class CustodyRecordModel extends Model {}
CustodyRecordModel.init(
  { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
  {
    sequelize,
    modelName: "CustodyRecord",
    tableName: "custody_records",
    timestamps: false,
  }
);

class CashTransactionModel extends Model {}
CashTransactionModel.init(
  { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
  {
    sequelize,
    modelName: "CashTransaction",
    tableName: "cash_transactions",
    timestamps: false,
  }
);

class CashRegisterModel extends Model {}
CashRegisterModel.init(
  { id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true } },
  {
    sequelize,
    modelName: "CashRegister",
    tableName: "cash_registers",
    timestamps: false,
  }
);

// ── Función generadora de casilleros ─────────────────────────────────────────

function generateLockers() {
  const lockers: { row: number; col: string; isOccupied: boolean; currentRecordId: null }[] = [];
  const sectors = ["A", "B", "C", "D"];
  const sizes = ["S", "M", "L", "XL"];

  for (const sector of sectors) {
    for (const size of sizes) {
      for (let i = 1; i <= 12; i++) {
        lockers.push({ row: i, col: `${sector}${size}`, isOccupied: false, currentRecordId: null });
      }
    }
  }

  return lockers; // 192 casilleros en total
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  MIGRACIÓN DE CASILLEROS — CUSTODIA");
  console.log("=".repeat(60));

  await sequelize.authenticate();
  console.log("✓ Conexión a la base de datos establecida.\n");

  await sequelize.sync();

  const lockersAntes = await LockerModel.count();
  const registrosAntes = await CustodyRecordModel.count();
  const cajasAntes = await CashRegisterModel.count();
  const transaccionesAntes = await CashTransactionModel.count();

  console.log("Estado actual de la base de datos:");
  console.log(`  Casilleros:   ${lockersAntes}`);
  console.log(`  Registros:    ${registrosAntes}`);
  console.log(`  Cajas:        ${cajasAntes}`);
  console.log(`  Transacc.:    ${transaccionesAntes}`);
  console.log();

  console.log("Iniciando migración...");
  console.log("  → Borrando registros de custodia...");
  await CustodyRecordModel.destroy({ where: {} });

  console.log("  → Borrando transacciones de caja...");
  await CashTransactionModel.destroy({ where: {} });

  console.log("  → Borrando cajas registradoras...");
  await CashRegisterModel.destroy({ where: {} });

  console.log("  → Borrando casilleros existentes...");
  await LockerModel.destroy({ where: {} });

  console.log("  → Creando 192 casilleros nuevos...");
  const lockers = generateLockers();
  await LockerModel.bulkCreate(lockers as any[]);

  const lockersDespues = await LockerModel.count();

  console.log();
  console.log("=".repeat(60));
  console.log(`✓ Migración completada.`);
  console.log(`  Casilleros creados: ${lockersDespues}`);
  console.log(`    - Sectores A/B/C/D: 12×S + 12×M + 12×L + 12×XL = 192`);
  console.log(`    - Total: ${lockersDespues}`);
  console.log();
  console.log("  Usuarios y precios: SIN CAMBIOS.");
  console.log("=".repeat(60));

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Error durante la migración:", err.message);
  process.exit(1);
});
