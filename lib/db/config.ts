import { Sequelize } from 'sequelize';
import 'mysql2';

const globalForSequelize = global as unknown as { sequelize: Sequelize };

export const sequelize =
  globalForSequelize.sequelize ||
  new Sequelize({
    database: process.env.DB_NAME || 'custodia',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pionero01',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false, // Set to console.log to see SQL queries
  });

if (process.env.NODE_ENV !== 'production') globalForSequelize.sequelize = sequelize;
