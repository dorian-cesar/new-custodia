import { DataTypes, Model } from 'sequelize';
import { sequelize } from './config';
import bcrypt from 'bcryptjs';

export class LockerModel extends Model {
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
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'User', tableName: 'users', timestamps: false }
);

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true });
  
  // Seed default users if none exist
  const userCount = await UserModel.count();
  if (userCount === 0) {
    await UserModel.bulkCreate([
      { username: 'cajero', passwordHash: '$2b$10$Dcf44J8hRETqHoVVt9SjSOIhgpTKfSrIgmslX66/D2VLvBCrjWjIa', role: 'cajero' },
      { username: 'admin', passwordHash: '$2b$10$nX6EO8cjj6IgIo08gpSPH.ver2Abxigm8qBuxFYv2WzxxwrphcOze', role: 'supervisor' }
    ] as any[]);
  } else {
    // Migration: Hash any existing plaintext passwords
    const users = await UserModel.findAll();
    for (const user of users) {
      const u = user as any;
      if (u.passwordHash && !u.passwordHash.startsWith('$2')) {
        const hashed = await bcrypt.hash(u.passwordHash, 10);
        await UserModel.update({ passwordHash: hashed }, { where: { id: u.id } });
      }
    }
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
