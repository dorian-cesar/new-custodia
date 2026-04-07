import mysql from 'mysql2/promise'

// Configuración de conexión usando variables de entorno
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'terminales',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] || null
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const [result] = await pool.execute(sql, params)
  return (result as mysql.ResultSetHeader).affectedRows || 0
}

export async function insertAndGetId(sql: string, params?: unknown[]): Promise<number> {
  const [result] = await pool.execute(sql, params)
  return (result as mysql.ResultSetHeader).insertId
}

export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export default pool
