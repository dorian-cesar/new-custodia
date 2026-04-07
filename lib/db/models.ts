import { DataTypes, Model } from 'sequelize';
import { sequelize } from './config';

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

export const syncDatabase = async () => {
  await sequelize.sync();
};
