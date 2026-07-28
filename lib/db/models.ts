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
  declare folio: number | null;
  declare extraFolio: number | null;
  declare entryPaymentMethod: string | null;
  declare authCode: string | null;
  declare opNumber: string | null;
  declare cardNumber: string | null;
  declare cardBrand: string | null;
  declare cardType: string | null;
  declare exitPaymentMethod: string | null;
  declare exitAuthCode: string | null;
  declare exitOpNumber: string | null;
  declare exitCardNumber: string | null;
  declare exitCardBrand: string | null;
  declare exitCardType: string | null;
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
    entryPaymentMethod: { type: DataTypes.STRING, allowNull: true, defaultValue: 'Efectivo' },
    authCode: { type: DataTypes.STRING, allowNull: true },
    opNumber: { type: DataTypes.STRING, allowNull: true },
    cardNumber: { type: DataTypes.STRING, allowNull: true },
    cardBrand: { type: DataTypes.STRING, allowNull: true },
    cardType: { type: DataTypes.STRING, allowNull: true },
    exitPaymentMethod: { type: DataTypes.STRING, allowNull: true },
    exitAuthCode: { type: DataTypes.STRING, allowNull: true },
    exitOpNumber: { type: DataTypes.STRING, allowNull: true },
    exitCardNumber: { type: DataTypes.STRING, allowNull: true },
    exitCardBrand: { type: DataTypes.STRING, allowNull: true },
    exitCardType: { type: DataTypes.STRING, allowNull: true },
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

export class SettingModel extends Model {
  declare key: string;
  declare value: string;
}

SettingModel.init(
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.TEXT('long'), allowNull: false },
  },
  { sequelize, modelName: 'Setting', tableName: 'settings', timestamps: false }
);

let isSynced = false;

export const syncDatabase = async () => {
  if (isSynced) return;
  await sequelize.sync();
  await SettingModel.sync();

  const defaultCurrency = await SettingModel.findOne({ where: { key: 'currency' } });
  if (!defaultCurrency) {
    await SettingModel.create({ key: 'currency', value: 'CLP' } as any);
  }
  
  // Crear cuentas por defecto SOLO si no existen.
  // Si ya existen, NO se modifican — las contraseñas cambiadas en /admin se preservan.
  const cajeroHashed = await bcrypt.hash('1234', 10);
  const adminHashed = await bcrypt.hash('admin123', 10);

  const cajero = await UserModel.findOne({ where: { username: 'cajero' } });
  if (!cajero) {
    await UserModel.create({ username: 'cajero', passwordHash: cajeroHashed, role: 'cajero' } as any);
  }

  const cajero2 = await UserModel.findOne({ where: { username: 'cajero2' } });
  if (!cajero2) {
    await UserModel.create({ username: 'cajero2', passwordHash: cajeroHashed, role: 'cajero' } as any);
  }

  const admin = await UserModel.findOne({ where: { username: 'admin' } });
  if (!admin) {
    await UserModel.create({ username: 'admin', passwordHash: adminHashed, role: 'supervisor' } as any);
  }


  // Seed default prices if none exist, o agregar XL/XXL si faltan
  const priceCount = await PriceModel.count();
  if (priceCount === 0) {
    // Tabla vacía: sembrar todos los tamaños por defecto
    const { LOCKER_SIZES } = await import('../types');
    await PriceModel.bulkCreate(
      LOCKER_SIZES.map(s => ({ size: s.value, label: s.label, price: s.price }))
    );
  } else {
    // Tabla con datos: agregar solo los tamaños que falten (XL, XXL)
    const { LOCKER_SIZES } = await import('../types');
    for (const s of LOCKER_SIZES) {
      const existing = await PriceModel.findOne({ where: { size: s.value } });
      if (!existing) {
        await PriceModel.create({ size: s.value, label: s.label, price: s.price } as any);
        console.log(`Precio agregado automáticamente: ${s.value} - ${s.label} - $${s.price}`);
      }
    }
  }

  // Add new columns to custody_records if they don't exist
  const newCols = [
    { name: 'entryPaymentMethod', type: "VARCHAR(255) DEFAULT 'Efectivo'" },
    { name: 'authCode', type: "VARCHAR(255)" },
    { name: 'opNumber', type: "VARCHAR(255)" },
    { name: 'cardNumber', type: "VARCHAR(255)" },
    { name: 'cardBrand', type: "VARCHAR(255)" },
    { name: 'cardType', type: "VARCHAR(255)" },
    { name: 'exitPaymentMethod', type: "VARCHAR(255)" },
    { name: 'exitAuthCode', type: "VARCHAR(255)" },
    { name: 'exitOpNumber', type: "VARCHAR(255)" },
    { name: 'exitCardNumber', type: "VARCHAR(255)" },
    { name: 'exitCardBrand', type: "VARCHAR(255)" },
    { name: 'exitCardType', type: "VARCHAR(255)" },
  ];

  for (const col of newCols) {
    try {
      await sequelize.query(`ALTER TABLE custody_records ADD COLUMN ${col.name} ${col.type};`);
    } catch (err) {
      // Ignore error if column already exists
    }
  }
  isSynced = true;
};
