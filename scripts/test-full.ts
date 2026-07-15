/**
 * Script de test completo — Custodia
 * Verifica BD y lógica. Limpia los datos de test al finalizar.
 *
 * USO: npm run test:full
 */

// Cargar variables de entorno ANTES de importar sequelize
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✓ Variables de entorno cargadas desde .env");
} catch {
  console.warn("⚠ No se encontró .env, usando variables de entorno del sistema");
}

import { sequelize } from "../lib/db/config";
import { DataTypes, Model } from "sequelize";

// ── Modelos ──────────────────────────────────────────────────────────────────

class LockerModel extends Model {
  declare id: number;
  declare row: number;
  declare col: string;
  declare isOccupied: boolean;
  declare currentRecordId: number | null;
}
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

class PriceModel extends Model {
  declare size: string;
  declare label: string;
  declare price: number;
}
PriceModel.init(
  {
    size: { type: DataTypes.STRING, primaryKey: true },
    label: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, modelName: "Price", tableName: "prices", timestamps: false }
);

class UserModel extends Model {
  declare id: number;
  declare username: string;
  declare role: string;
}
UserModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "User", tableName: "users", timestamps: false }
);

class CustodyRecordModel extends Model {
  declare id: number;
  declare code: string;
  declare lockerId: number;
  declare status: string;
}
CustodyRecordModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, allowNull: false },
    lockerId: { type: DataTypes.INTEGER, allowNull: false },
    clientDocument: { type: DataTypes.STRING, allowNull: false },
    entryTime: { type: DataTypes.STRING, allowNull: false },
    exitTime: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
    folio: { type: DataTypes.INTEGER, allowNull: true },
    entryPaymentMethod: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "CustodyRecord", tableName: "custody_records", timestamps: false }
);

class CashRegisterModel extends Model {
  declare id: number;
  declare status: string;
}
CashRegisterModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    openedAt: { type: DataTypes.STRING, allowNull: false },
    closedAt: { type: DataTypes.STRING, allowNull: true },
    openingAmount: { type: DataTypes.INTEGER, allowNull: false },
    closingAmount: { type: DataTypes.INTEGER, allowNull: true },
    totalSales: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalTransactions: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    openedBy: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "CashRegister", tableName: "cash_registers", timestamps: false }
);

class CashTransactionModel extends Model {
  declare id: number;
}
CashTransactionModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    registerId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    timestamp: { type: DataTypes.STRING, allowNull: false },
    recordId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: "CashTransaction", tableName: "cash_transactions", timestamps: false }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const testIds: { records: number[]; registers: number[]; transactions: number[] } = {
  records: [],
  registers: [],
  transactions: [],
};

function ok(msg: string) {
  console.log(`  \u2705 ${msg}`);
  passed++;
}

function fail(msg: string, detail?: string) {
  console.log(`  \u274c ${msg}${detail ? ` \u2192 ${detail}` : ""}`);
  failed++;
}

function section(title: string) {
  console.log(`\n${"─".repeat(55)}`);
  console.log(`  \ud83d\udccb ${title}`);
  console.log("─".repeat(55));
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function testCasilleros() {
  section("CASILLEROS");

  const total = await LockerModel.count();
  total === 204 ? ok(`Total: ${total} casilleros`) : fail(`Total esperado 204, hay ${total}`);

  const sectores = ["A", "B", "C", "D"];
  const sizes = ["S", "M", "L", "XL"];

  for (const sector of sectores) {
    for (const size of sizes) {
      const col = `${sector}${size}`;
      const count = await LockerModel.count({ where: { col } });
      count === 12
        ? ok(`${col}: ${count} casilleros`)
        : fail(`${col}: esperado 12, hay ${count}`);
    }
  }

  const bxxl = await LockerModel.count({ where: { col: "BXXL" } });
  bxxl === 12 ? ok(`BXXL: ${bxxl} casilleros`) : fail(`BXXL: esperado 12, hay ${bxxl}`);

  for (const sector of ["A", "C", "D"]) {
    const xxl = await LockerModel.count({ where: { col: `${sector}XXL` } });
    xxl === 0
      ? ok(`${sector}XXL: correctamente sin casilleros`)
      : fail(`${sector}XXL: debería ser 0, hay ${xxl}`);
  }

  const occupied = await LockerModel.count({ where: { isOccupied: true } });
  occupied === 0 ? ok("Todos los casilleros disponibles") : fail(`${occupied} casillero(s) ocupado(s) inesperadamente`);
}

async function testPrecios() {
  section("PRECIOS");

  const prices = await PriceModel.findAll({ order: [["price", "ASC"]] });
  const expectedSizes = ["S", "M", "L", "XL", "XXL"];

  prices.length === 5
    ? ok(`5 tamaños de precio registrados`)
    : fail(`Esperado 5 precios, hay ${prices.length}`);

  for (const expected of expectedSizes) {
    const found = prices.find((p: any) => p.get("size") === expected);
    found
      ? ok(`Precio ${expected}: $${(found.get("price") as number).toLocaleString("es-CL")} — ${found.get("label")}`)
      : fail(`Falta precio para tamaño ${expected}`);
  }

  for (const p of prices) {
    const price = p.get("price") as number;
    price > 0
      ? ok(`Precio ${p.get("size")} es positivo ($${price})`)
      : fail(`Precio ${p.get("size")} inválido: ${price}`);
  }
}

async function testUsuarios() {
  section("USUARIOS");

  const users = await UserModel.findAll();
  users.length >= 1 ? ok(`${users.length} usuario(s) registrado(s)`) : fail("No hay usuarios en la BD");

  const cajero = users.find((u: any) => u.get("username") === "cajero");
  cajero ? ok(`Usuario 'cajero' encontrado, rol: ${cajero.get("role")}`) : fail("Usuario 'cajero' no encontrado");

  const admin = users.find((u: any) => u.get("username") === "admin");
  admin ? ok(`Usuario 'admin' encontrado, rol: ${admin.get("role")}`) : fail("Usuario 'admin' no encontrado");

  if (cajero) {
    (cajero.get("role") as string) === "cajero"
      ? ok("Rol de cajero correcto")
      : fail(`Rol incorrecto: ${cajero.get("role")}`);
  }
  if (admin) {
    (admin.get("role") as string) === "supervisor"
      ? ok("Rol de admin (supervisor) correcto")
      : fail(`Rol incorrecto: ${admin.get("role")}`);
  }
}

async function testFlujoRegistro() {
  section("FLUJO: CREAR Y LIBERAR REGISTRO (TEST DATA)");

  const locker = await LockerModel.findOne({ where: { col: "AS", row: 1 } });
  if (!locker) { fail("No se encontró casillero AS-1"); return; }
  ok(`Casillero AS1 encontrado (id=${locker.id}, libre=${!locker.isOccupied})`);

  const testRegister = await CashRegisterModel.create({
    openedAt: new Date().toISOString(),
    closedAt: null,
    openingAmount: 10000,
    closingAmount: null,
    totalSales: 0,
    totalTransactions: 0,
    status: "open",
    notes: "[TEST_AUTO]",
    openedBy: "test_script",
  } as any);
  const registerId = (testRegister as any).id;
  testIds.registers.push(registerId);
  ok(`Caja de test creada (id=${registerId})`);

  const testRecord = await CustodyRecordModel.create({
    code: `TEST_${Date.now()}`,
    lockerId: locker.id,
    clientDocument: "TEST-00000000",
    entryTime: new Date().toISOString(),
    exitTime: null,
    size: "S",
    status: "Activo",
    price: 2500,
    folio: null,
    entryPaymentMethod: "Efectivo",
  } as any);
  const recordId = (testRecord as any).id;
  testIds.records.push(recordId);
  ok(`Registro de custodia test creado (id=${recordId})`);

  await LockerModel.update(
    { isOccupied: true, currentRecordId: recordId },
    { where: { id: locker.id } }
  );
  const lockerOcupado = await LockerModel.findByPk(locker.id);
  (lockerOcupado as any).isOccupied === true
    ? ok("Casillero marcado como ocupado ✓")
    : fail("Casillero no se marcó como ocupado");

  const testTx = await CashTransactionModel.create({
    registerId,
    type: "income",
    amount: 2500,
    description: "[TEST_AUTO] Custodia S - Efectivo",
    timestamp: new Date().toISOString(),
    recordId,
  } as any);
  testIds.transactions.push((testTx as any).id);
  ok(`Transacción test creada (id=${(testTx as any).id}, monto=$2.500)`);

  const found = await CustodyRecordModel.findByPk(recordId);
  (found as any)?.status === "Activo"
    ? ok("Registro encontrado y estado: Activo ✓")
    : fail("Estado del registro incorrecto");

  await CustodyRecordModel.update(
    { status: "Entregado", exitTime: new Date().toISOString() },
    { where: { id: recordId } }
  );
  await LockerModel.update(
    { isOccupied: false, currentRecordId: null },
    { where: { id: locker.id } }
  );
  const freed = await LockerModel.findByPk(locker.id);
  (freed as any).isOccupied === false
    ? ok("Casillero liberado tras entrega ✓")
    : fail("Casillero no se liberó");

  await CashRegisterModel.update(
    { status: "closed", closedAt: new Date().toISOString(), closingAmount: 12500, totalSales: 2500, totalTransactions: 1 },
    { where: { id: registerId } }
  );
  ok("Caja de test cerrada correctamente ✓");
}

async function testLogicaGrid() {
  section("LÓGICA: FILTRO GRID POR TAMAÑO Y SECTOR");

  const allLockers = await LockerModel.findAll();

  const sectorAS = allLockers.filter((l: any) => l.get("col") === "AS");
  sectorAS.length === 12 ? ok("Sector A, tamaño S: 12 casilleros") : fail(`AS: esperado 12, hay ${sectorAS.length}`);

  const xxlAll = allLockers.filter((l: any) => (l.get("col") as string).endsWith("XXL"));
  xxlAll.length === 12 ? ok("Total XXL en BD: 12 (solo en sector B)") : fail(`Total XXL: esperado 12, hay ${xxlAll.length}`);

  const xxlSoloB = xxlAll.every((l: any) => (l.get("col") as string).startsWith("B"));
  xxlSoloB ? ok("Lógica grid XXL: solo sector B ✓") : fail("Hay casilleros XXL fuera de sector B");

  const sizeSLockers = allLockers.filter((l: any) => {
    const col = l.get("col") as string;
    return col.endsWith("S") && !col.endsWith("XLS") && !col.endsWith("XXLS");
  });
  // AS=12, BS=12, CS=12, DS=12 = 48
  sizeSLockers.length === 48
    ? ok(`Grid S: ${sizeSLockers.length} casilleros en 4 sectores (12 por sector)`)
    : fail(`Grid S: esperado 48, hay ${sizeSLockers.length}`);

  // XL en 4 sectores
  const sizeXLLockers = allLockers.filter((l: any) => {
    const col = l.get("col") as string;
    return col.endsWith("XL") && !col.endsWith("XXL");
  });
  sizeXLLockers.length === 48
    ? ok(`Grid XL: ${sizeXLLockers.length} casilleros en 4 sectores (12 por sector)`)
    : fail(`Grid XL: esperado 48, hay ${sizeXLLockers.length}`);
}

async function cleanup() {
  section("LIMPIEZA DE DATOS DE TEST");

  if (testIds.transactions.length > 0) {
    await CashTransactionModel.destroy({ where: { id: testIds.transactions } });
    ok(`${testIds.transactions.length} transacción(es) de test eliminadas`);
  } else {
    ok("Sin transacciones de test que limpiar");
  }

  if (testIds.records.length > 0) {
    await CustodyRecordModel.destroy({ where: { id: testIds.records } });
    ok(`${testIds.records.length} registro(s) de custodia test eliminados`);
  } else {
    ok("Sin registros de custodia de test que limpiar");
  }

  if (testIds.registers.length > 0) {
    await CashRegisterModel.destroy({ where: { id: testIds.registers } });
    ok(`${testIds.registers.length} caja(s) de test eliminadas`);
  } else {
    ok("Sin cajas de test que limpiar");
  }

  const stuck = await LockerModel.count({ where: { isOccupied: true } });
  stuck === 0
    ? ok("Todos los casilleros disponibles tras limpieza ✓")
    : fail(`${stuck} casillero(s) quedaron ocupados inesperadamente`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(55));
  console.log("  TEST COMPLETO — CUSTODIA");
  console.log("=".repeat(55));

  await sequelize.authenticate();
  console.log("✓ Conexión a la base de datos establecida.\n");

  try {
    await testCasilleros();
    await testPrecios();
    await testUsuarios();
    await testFlujoRegistro();
    await testLogicaGrid();
  } finally {
    // Limpieza SIEMPRE se ejecuta, incluso si hay errores
    await cleanup();
  }

  console.log("\n" + "=".repeat(55));
  console.log("  RESULTADO FINAL");
  console.log("=".repeat(55));
  console.log(`  \u2705 Pasados:  ${passed}`);
  console.log(`  \u274c Fallidos: ${failed}`);
  console.log("=".repeat(55));

  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\n\u2717 Error durante los tests:", err.message);
  await cleanup().catch(() => {});
  await sequelize.close().catch(() => {});
  process.exit(1);
});
