import mysql from 'mysql2/promise';

const host = 'ls-9b2364d13ad7932d40e73b11859bfd0ee9eff8dc.cs9gyyc0moxd.us-east-1.rds.amazonaws.com';
const port = 3306;
const database = 'CustodiaParaguayTest';
const user = 'dbmasteruser';
const password = '}3qT.;)ONR?ki>Yk|(x?!^u]tQ}v#nV0';

const DEFAULT_LAYOUT_JSON = JSON.stringify({
  shelves: [
    {
      id: "A",
      sizes: [
        { size: "S", count: 12 },
        { size: "M", count: 12 },
        { size: "L", count: 12 },
        { size: "XL", count: 12 },
      ],
    },
    {
      id: "B",
      sizes: [
        { size: "S", count: 12 },
        { size: "M", count: 12 },
        { size: "L", count: 12 },
        { size: "XL", count: 12 },
      ],
    },
    {
      id: "C",
      sizes: [
        { size: "S", count: 12 },
        { size: "M", count: 12 },
        { size: "L", count: 12 },
        { size: "XL", count: 12 },
      ],
    },
    {
      id: "D",
      sizes: [
        { size: "S", count: 12 },
        { size: "M", count: 12 },
        { size: "L", count: 12 },
        { size: "XL", count: 12 },
      ],
    },
  ],
});

async function main() {
  console.log(`Conectando directamente a MySQL AWS RDS (${host}:${port}/${database})...`);
  
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });

  console.log("1. Modificando columna 'value' en tabla 'settings' a LONGTEXT...");
  await connection.query("ALTER TABLE settings MODIFY COLUMN `value` LONGTEXT;");

  console.log("2. Restableciendo layout_config en tabla 'settings'...");
  await connection.query(
    "INSERT INTO settings (`key`, `value`) VALUES ('layout_config', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);",
    [DEFAULT_LAYOUT_JSON]
  );

  console.log("3. Marcando todos los registros de custodia activos como 'Entregado'...");
  const [resRecords] = await connection.query(
    "UPDATE custody_records SET status = 'Entregado', exitTime = NOW() WHERE status = 'Activo';"
  );
  console.log("Resultado update custody_records:", resRecords);

  console.log("4. Liberando todos los casilleros a isOccupied = 0, currentRecordId = NULL...");
  const [resLockers] = await connection.query(
    "UPDATE lockers SET isOccupied = 0, currentRecordId = NULL;"
  );
  console.log("Resultado update lockers:", resLockers);

  // Verificar
  const [activeRecords] = await connection.query("SELECT COUNT(*) as cnt FROM custody_records WHERE status = 'Activo';");
  const [occupiedLockers] = await connection.query("SELECT COUNT(*) as cnt FROM lockers WHERE isOccupied = 1;");
  
  console.log("==========================================");
  console.log("VERIFICACIÓN FINAL EN AWS RDS MYSQL:");
  console.log("Registros Activos:", (activeRecords as any)[0].cnt);
  console.log("Casilleros Ocupados:", (occupiedLockers as any)[0].cnt);
  console.log("==========================================");

  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error al limpiar MySQL AWS RDS:", err);
  process.exit(1);
});
