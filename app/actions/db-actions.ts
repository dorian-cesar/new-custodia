'use server';

import { 
  LockerModel, 
  CustodyRecordModel, 
  CashRegisterModel, 
  CashTransactionModel,
  UserModel,
  syncDatabase
} from '@/lib/db/models';
import { generateLockers } from '@/lib/types';
import type { 
  Locker, 
  CustodyRecord, 
  CashRegister, 
  CashTransaction 
} from '@/lib/types';

// Ensure DB is synced before any operations
const initDbAndFetch = async () => {
  await syncDatabase();
  
  const lockerCount = await LockerModel.count();
  if (lockerCount === 0) {
    const defaultLockers = generateLockers();
    await LockerModel.bulkCreate(defaultLockers as any[]);
  }

  const rawLockers = await LockerModel.findAll();
  const rawRecords = await CustodyRecordModel.findAll();
  const rawRegisters = await CashRegisterModel.findAll();
  const rawTransactions = await CashTransactionModel.findAll();

  // Convert from Sequelize instances to plain JS objects with correct typings
  return {
    lockers: rawLockers.map(l => l.get({ plain: true })) as Locker[],
    records: rawRecords.map(r => r.get({ plain: true })) as CustodyRecord[],
    cashRegisters: rawRegisters.map(r => ({
      ...r.get({ plain: true }),
      status: r.status as 'open' | 'closed'
    })) as CashRegister[],
    cashTransactions: rawTransactions.map(t => ({
      ...t.get({ plain: true }),
      type: t.type as 'income' | 'expense'
    })) as CashTransaction[],
  };
};

export async function getInitialState() {
  try {
    return { success: true, data: await initDbAndFetch() };
  } catch (error: any) {
    console.error('Error fetching initial DB state:', error);
    return { success: false, error: error.message };
  }
}

export async function dbOccupyLocker(lockerId: number, recordId: number) {
  await LockerModel.update({ isOccupied: true, currentRecordId: recordId }, { where: { id: lockerId } });
}

export async function dbReleaseLocker(lockerId: number) {
  await LockerModel.update({ isOccupied: false, currentRecordId: null }, { where: { id: lockerId } });
}

export async function dbCreateRecord(recordData: Omit<CustodyRecord, 'id'>) {
  const result = await CustodyRecordModel.create(recordData as any);
  const newRecord = result.get({ plain: true }) as CustodyRecord;
  await dbOccupyLocker(newRecord.lockerId, newRecord.id);
  return newRecord;
}

export async function dbDeliverRecord(recordId: number, lockerId: number) {
  await CustodyRecordModel.update(
    { status: 'Entregado', exitTime: new Date().toISOString() },
    { where: { id: recordId } }
  );
  await dbReleaseLocker(lockerId);
  return true;
}

export async function dbOpenCashRegister(registerData: Omit<CashRegister, 'id'>) {
  const result = await CashRegisterModel.create(registerData as any);
  return result.get({ plain: true }) as CashRegister;
}

export async function dbCloseCashRegister(registerId: number, data: Partial<CashRegister>) {
  await CashRegisterModel.update(data as any, { where: { id: registerId } });
  const result = await CashRegisterModel.findByPk(registerId);
  return result?.get({ plain: true }) as CashRegister;
}

export async function dbAddTransaction(transactionData: Omit<CashTransaction, 'id'>) {
  const result = await CashTransactionModel.create(transactionData as any);
  return result.get({ plain: true }) as CashTransaction;
}

export async function loginCajero(username: string, passwordHash: string) {
  await syncDatabase();
  const user = await UserModel.findOne({ where: { username, passwordHash } });
  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }
  if (user.role !== 'cajero') {
    return { success: false, error: 'Solo los cajeros pueden iniciar sesión' };
  }
  return { success: true, user: user.get({ plain: true }) };
}

export async function verifySupervisor(username: string, passwordHash: string) {
  await syncDatabase();
  const user = await UserModel.findOne({ where: { username, passwordHash } });
  if (!user) {
    return { success: false, error: 'Credenciales de supervisor inválidas' };
  }
  if (user.role !== 'supervisor') {
    return { success: false, error: 'El usuario no tiene rol de supervisor' };
  }
  return { success: true };
}

// ── Admin: login universal (cajero + supervisor) ──
export async function loginUser(username: string, passwordHash: string) {
  await syncDatabase();
  const user = await UserModel.findOne({ where: { username, passwordHash } });
  if (!user) {
    return { success: false, error: 'Credenciales inválidas' };
  }
  return { success: true, user: user.get({ plain: true }) };
}

// ── Admin: CRUD de usuarios ──
export async function getUsers() {
  await syncDatabase();
  const users = await UserModel.findAll({ order: [['id', 'ASC']] });
  return users.map(u => {
    const plain = u.get({ plain: true }) as any;
    return { id: plain.id as number, username: plain.username as string, role: plain.role as string };
  });
}

export async function createUser(username: string, passwordHash: string, role: 'cajero' | 'supervisor') {
  await syncDatabase();
  try {
    const existing = await UserModel.findOne({ where: { username } });
    if (existing) return { success: false, error: 'El nombre de usuario ya existe' };
    const user = await UserModel.create({ username, passwordHash, role } as any);
    const plain = user.get({ plain: true }) as any;
    return { success: true, user: { id: plain.id, username: plain.username, role: plain.role } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: number, data: { username?: string; passwordHash?: string; role?: string }) {
  await syncDatabase();
  try {
    const existing = await UserModel.findByPk(id);
    if (!existing) return { success: false, error: 'Usuario no encontrado' };
    if (data.username && data.username !== existing.username) {
      const dup = await UserModel.findOne({ where: { username: data.username } });
      if (dup) return { success: false, error: 'El nombre de usuario ya existe' };
    }
    await UserModel.update(data as any, { where: { id } });
    const updated = await UserModel.findByPk(id);
    const plain = updated!.get({ plain: true }) as any;
    return { success: true, user: { id: plain.id, username: plain.username, role: plain.role } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: number) {
  await syncDatabase();
  try {
    const user = await UserModel.findByPk(id);
    if (!user) return { success: false, error: 'Usuario no encontrado' };
    await UserModel.destroy({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
