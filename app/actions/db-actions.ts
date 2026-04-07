'use server';

import { 
  LockerModel, 
  CustodyRecordModel, 
  CashRegisterModel, 
  CashTransactionModel,
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
