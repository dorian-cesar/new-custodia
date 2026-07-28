import { Sequelize } from 'sequelize';
import 'mysql2';

const globalForSequelize = global as unknown as { sequelize: Sequelize };

const useSqlite = process.env.DB_DIALECT === 'sqlite' || !process.env.DB_HOST;

export const sequelize =
  globalForSequelize.sequelize ||
  (useSqlite
    ? new Sequelize({
        dialect: 'sqlite',
        storage: './custodia.sqlite',
        logging: false,
      })
    : new Sequelize({
        database: process.env.DB_NAME || 'custodia',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Pionero01',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
          connectTimeout: 20000,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        },
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
          evict: 1000,
        },
      }));

if (process.env.NODE_ENV !== 'production') globalForSequelize.sequelize = sequelize;

