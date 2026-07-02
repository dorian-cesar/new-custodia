import { DataTypes, Model } from 'sequelize';
import { sequelize } from './config';
import bcrypt from 'bcryptjs';

export class LockerModel extends Model {
  declare id: number;
  declare row: number;
  declare col: string;
  declare isOccupied: boolean;
  declare currentRecordId: number | null;
  declare size: string;
}

LockerModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    row: { type: DataTypes.INTEGER, allowNull: false },
    col: { type: DataTypes.STRING, allowNull: false },
    isOccupied: { type: DataTypes.BOOLEAN, defaultValue: false },
    currentRecordId: { type: DataTypes.INTEGER, allowNull: true },
    size: { type: DataTypes.STRING, allowNull: false, defaultValue: 'S' },
  },
  { sequelize, modelName: 'Locker', tableName: 'lockers', timestamps: false }
);

export class PriceModel extends Model {
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
  { sequelize, modelName: 'Price', tableName: 'prices', timestamps: false }
);

export class CustodyRecordModel extends Model {
  declare id: number;
  declare code: string;
  declare lockerId: number;
  declare clientDocument: string;
  declare entryTime: string;
  declare exitTime: string | null;
  declare size: string;
  declare status: 'Activo' | 'Entregado';
  declare price: number;
  declare folio: number | null;
  declare extraFolio: number | null;
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
    extraFolio: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'CustodyRecord', tableName: 'custody_records', timestamps: false }
);

export class CashRegisterModel extends Model {
  declare id: number;
  declare openedAt: string;
  declare closedAt: string | null;
  declare openingAmount: number;
  declare closingAmount: number | null;
  declare totalSales: number;
  declare totalTransactions: number;
  declare status: 'open' | 'closed';
  declare notes: string;
  declare openedBy: string | null;
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
  { sequelize, modelName: 'CashRegister', tableName: 'cash_registers', timestamps: false }
);

export class CashTransactionModel extends Model {
  declare id: number;
  declare registerId: number;
  declare type: 'income' | 'expense';
  declare amount: number;
  declare description: string;
  declare timestamp: string;
  declare recordId: number | null;
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
  { sequelize, modelName: 'CashTransaction', tableName: 'cash_transactions', timestamps: false }
);

export class UserModel extends Model {
  declare id: number;
  declare username: string;
  declare passwordHash: string;
  declare role: 'cajero' | 'supervisor';
}

UserModel.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
  },
  { 
    sequelize, 
    modelName: 'User', 
    tableName: 'users', 
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['username'],
        name: 'username_unique_idx'
      }
    ]
  }
);

export const syncDatabase = async () => {
  // Drop duplicate username indexes in MySQL if they exist to prevent "Too many keys specified; max 64 keys allowed"
  if (sequelize.getDialect() === 'mysql') {
    try {
      const [results] = await sequelize.query(`
        SELECT DISTINCT INDEX_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND INDEX_NAME != 'PRIMARY'
      `);
      
      const indexNames = (results as any[]).map(r => r.INDEX_NAME || r.index_name).filter(Boolean);
      // We drop any index starting with 'username' (except 'username_unique_idx') to clean up the duplicates
      const toDrop = indexNames.filter(name => 
        name.toLowerCase().startsWith('username') && name !== 'username_unique_idx'
      );
      
      for (const indexName of toDrop) {
        try {
          await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``);
          console.log(`Dropped index ${indexName} from users table`);
        } catch (err) {
          console.error(`Failed to drop index ${indexName}:`, err);
        }
      }
    } catch (err) {
      console.error('Error during index cleanup:', err);
    }
  }

  await sequelize.sync({ alter: true });
  
  // Upsert or reset the default test accounts so they are always guaranteed to work locally
  const cajeroHashed = await bcrypt.hash('1234', 10);
  const adminHashed = await bcrypt.hash('admin123', 10);

  const cajero = await UserModel.findOne({ where: { username: 'cajero' } });
  if (cajero) {
    await UserModel.update({ passwordHash: cajeroHashed, role: 'cajero' }, { where: { username: 'cajero' } });
  } else {
    await UserModel.create({ username: 'cajero', passwordHash: cajeroHashed, role: 'cajero' } as any);
  }

  const cajero2 = await UserModel.findOne({ where: { username: 'cajero2' } });
  if (cajero2) {
    await UserModel.update({ passwordHash: cajeroHashed, role: 'cajero' }, { where: { username: 'cajero2' } });
  } else {
    await UserModel.create({ username: 'cajero2', passwordHash: cajeroHashed, role: 'cajero' } as any);
  }

  const admin = await UserModel.findOne({ where: { username: 'admin' } });
  if (admin) {
    await UserModel.update({ passwordHash: adminHashed, role: 'supervisor' }, { where: { username: 'admin' } });
  } else {
    await UserModel.create({ username: 'admin', passwordHash: adminHashed, role: 'supervisor' } as any);
  }

  // Seed default prices if none exist
  const priceCount = await PriceModel.count();
  if (priceCount === 0) {
    const { LOCKER_SIZES } = await import('../types');
    await PriceModel.bulkCreate(
      LOCKER_SIZES.map(s => ({ size: s.value, label: s.label, price: s.price }))
    );
  }
};
