"use server";

import fs from "fs";
import path from "path";

function logDebug(message: string) {
  try {
    const logPath = path.join(process.cwd(), "debug-db.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error("Failed to write to debug-db.log", e);
  }
}

import {
  UserModel,
  LockerModel,
  CustodyRecordModel,
  CashRegisterModel,
  CashTransactionModel,
  PriceModel,
  SettingModel,
  syncDatabase,
} from "@/lib/db/models";
import { sequelize } from "@/lib/db/config";
import { generateLockers } from "@/lib/types";
import type {
  Locker,
  CustodyRecord,
  CashRegister,
  CashTransaction,
  LayoutConfig,
  LockerSizeOption,
} from "@/lib/types";
import { DEFAULT_LAYOUT } from "@/lib/types";
import bcrypt from "bcryptjs";

// Ensure DB is synced before any operations
const initDbAndFetch = async () => {
  await syncDatabase();

  // Cargar configuración de layout actual
  let layoutSetting = await SettingModel.findOne({ where: { key: "layout_config" } });
  let currentLayout = DEFAULT_LAYOUT;
  if (layoutSetting) {
    try {
      currentLayout = JSON.parse((layoutSetting as any).value) as LayoutConfig;
    } catch(e) {
      console.error("Error parsing layout config", e);
    }
  } else {
    await SettingModel.create({ key: "layout_config", value: JSON.stringify(DEFAULT_LAYOUT) } as any);
  }

  // Solo crear casilleros si la tabla está vacía.
  const lockerCount = await LockerModel.count();
  if (lockerCount === 0) {
    const defaultLockers = generateLockers(currentLayout);
    await LockerModel.bulkCreate(defaultLockers as any[]);
  }

  const rawLockers = await LockerModel.findAll();
  const rawRecords = await CustodyRecordModel.findAll();
  const rawRegisters = await CashRegisterModel.findAll();
  const rawTransactions = await CashTransactionModel.findAll();
  const rawPrices = await PriceModel.findAll({ order: [["price", "ASC"]] });
  const rawSettings = await SettingModel.findAll();

  // Convert from Sequelize instances to plain JS objects with correct typings
  return {
    lockers: rawLockers.map((l) => l.get({ plain: true })) as Locker[],
    records: rawRecords.map((r) => r.get({ plain: true })) as CustodyRecord[],
    cashRegisters: rawRegisters.map((r) => ({
      ...r.get({ plain: true }),
      status: r.status as "open" | "closed",
    })) as CashRegister[],
    cashTransactions: rawTransactions.map((t) => ({
      ...t.get({ plain: true }),
      type: t.type as "income" | "expense",
    })) as CashTransaction[],
    lockerSizes: rawPrices.map((p) => {
      const pData = p.get({ plain: true });
      return { value: pData.size, label: pData.label, price: pData.price };
    }) as any[],
    settings: rawSettings.map((s) => s.get({ plain: true })) as any[],
    layoutConfig: currentLayout,
  };
};

export async function dbUpdateSetting(key: string, value: string) {
  await SettingModel.upsert({ key, value });
  return true;
}


export async function getInitialState() {
  logDebug("getInitialState called");
  try {
    const data = await initDbAndFetch();
    logDebug("getInitialState succeeded");
    return { success: true, data };
  } catch (error: any) {
    logDebug(`getInitialState failed: ${error.message}\n${error.stack}`);
    console.error("Error fetching initial DB state:", error);
    return { success: false, error: error.message };
  }
}

export async function dbOccupyLocker(lockerId: number, recordId: number) {
  await LockerModel.update(
    { isOccupied: true, currentRecordId: recordId },
    { where: { id: lockerId } },
  );
}

export async function dbReleaseLocker(lockerId: number) {
  await LockerModel.update(
    { isOccupied: false, currentRecordId: null },
    { where: { id: lockerId } },
  );
}

export async function dbCreateRecord(recordData: Omit<CustodyRecord, "id">) {
  const result = await CustodyRecordModel.create(recordData as any);
  const newRecord = result.get({ plain: true }) as CustodyRecord;
  await dbOccupyLocker(newRecord.lockerId, newRecord.id);
  return newRecord;
}

export async function dbDeliverRecord(
  recordId: number,
  lockerId: number,
  extraFolio: number | null = null,
  exitPaymentMethod: string | null = null,
  exitAuthCode: string | null = null,
  exitOpNumber: string | null = null,
  exitCardNumber: string | null = null,
  exitCardBrand: string | null = null,
  exitCardType: string | null = null,
) {
  await CustodyRecordModel.update(
    {
      status: "Entregado",
      exitTime: new Date().toISOString(),
      extraFolio,
      exitPaymentMethod,
      exitAuthCode,
      exitOpNumber,
      exitCardNumber,
      exitCardBrand,
      exitCardType,
    },
    { where: { id: recordId } },
  );
  await dbReleaseLocker(lockerId);
  return true;
}

export async function dbOpenCashRegister(
  registerData: Omit<CashRegister, "id">,
) {
  const result = await CashRegisterModel.create(registerData as any);
  return result.get({ plain: true }) as CashRegister;
}

export async function dbCloseCashRegister(
  registerId: number,
  data: Partial<CashRegister>,
) {
  await CashRegisterModel.update(data as any, { where: { id: registerId } });
  const result = await CashRegisterModel.findByPk(registerId);
  return result?.get({ plain: true }) as CashRegister;
}

export async function dbAddTransaction(
  transactionData: Omit<CashTransaction, "id">,
) {
  const result = await CashTransactionModel.create(transactionData as any);
  return result.get({ plain: true }) as CashTransaction;
}

export async function loginCajero(username: string, passwordHash: string) {
  await syncDatabase();

  const user = await UserModel.findOne({ where: { username } });
  if (
    !user ||
    !(await bcrypt.compare(passwordHash, (user as any).passwordHash))
  ) {
    return { success: false, error: "Usuario o contraseña incorrectos" };
  }

  if (user.role !== "cajero") {
    return { success: false, error: "Solo los cajeros pueden iniciar sesión" };
  }

  const openRegister = await CashRegisterModel.findOne({
    where: { status: "open" },
  });
  if (openRegister) {
    const plainRegister = openRegister.get({ plain: true }) as any;
    if (plainRegister.openedBy && plainRegister.openedBy !== user.username) {
      return {
        success: false,
        error: `Hay un turno abierto por ${plainRegister.openedBy}. Se debe cerrar ese turno antes de ingresar con otra cuenta.`,
      };
    }
  }

  // Fetch API token behind the scenes using fixed credentials
  let apiToken = "";
  try {
    const response = await fetch(
      "https://new-backend-banos.dev-wit.com/api/auth/loginUser",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "dfarias@wit.la", password: "wit321" }),
      },
    );
    const data = await response.json();
    if (response.ok && data.token) {
      apiToken = data.token;
    }
  } catch (error) {
    console.error("Failed to fetch API token behind the scenes:", error);
  }

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: "cajero",
      token: apiToken,
    },
  };
}

export async function verifySupervisor(username: string, passwordHash: string) {
  await syncDatabase();

  const user = await UserModel.findOne({ where: { username } });
  if (
    !user ||
    !(await bcrypt.compare(passwordHash, (user as any).passwordHash))
  ) {
    return { success: false, error: "Credenciales de supervisor incorrectas" };
  }

  if (user.role !== "supervisor") {
    return { success: false, error: "El usuario no tiene rol de supervisor" };
  }

  return { success: true };
}

// ── Admin: login universal (cajero + supervisor) ──
export async function loginUser(username: string, passwordHash: string) {
  logDebug(`loginUser called: username="${username}"`);
  try {
    await syncDatabase();
    logDebug("loginUser: DB synced");

    const user = await UserModel.findOne({ where: { username } });
    if (!user) {
      logDebug(`loginUser: user "${username}" not found in DB`);
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }
    logDebug(`loginUser: user found, role="${user.role}", comparing password...`);

    const isMatch = await bcrypt.compare(passwordHash, (user as any).passwordHash);
    logDebug(`loginUser: password match result = ${isMatch}`);
    if (!isMatch) {
      return { success: false, error: "Usuario o contraseña incorrectos" };
    }

    const openRegister = await CashRegisterModel.findOne({
      where: { status: "open" },
    });
    if (openRegister) {
      const plainRegister = openRegister.get({ plain: true }) as any;
      logDebug(`loginUser: open register found, openedBy="${plainRegister.openedBy}"`);
      if (
        plainRegister.openedBy &&
        plainRegister.openedBy !== user.username &&
        user.role !== "supervisor"
      ) {
        logDebug(`loginUser: blocked because register opened by another user`);
        return {
          success: false,
          error: `Hay un turno abierto por ${plainRegister.openedBy}. Se debe cerrar ese turno antes de ingresar con otra cuenta.`,
        };
      }
    }

    // Fetch API token behind the scenes using fixed credentials
    let apiToken = "";
    try {
      logDebug("loginUser: fetching API token from external server...");
      const response = await fetch(
        "https://new-backend-banos.dev-wit.com/api/auth/loginUser",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: "dfarias@wit.la", password: "wit321" }),
        },
      );
      logDebug(`loginUser: API token fetch status = ${response.status}`);
      const data = await response.json();
      if (response.ok && data.token) {
        apiToken = data.token;
        logDebug("loginUser: API token fetched successfully");
      } else {
        logDebug(`loginUser: API token fetch did not return token. Data: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      logDebug(`loginUser: API token fetch failed with error: ${error.message}`);
      console.error("Failed to fetch API token behind the scenes:", error);
    }

    logDebug("loginUser: returning success");
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role === "supervisor" ? "supervisor" : "cajero",
        token: apiToken,
      },
    };
  } catch (error: any) {
    logDebug(`loginUser critical error: ${error.message}\n${error.stack}`);
    throw error;
  }
}

// ── Admin: CRUD de usuarios ──
export async function getUsers() {
  try {
    await syncDatabase();
    const users = await UserModel.findAll({ order: [["id", "ASC"]] });
    return users.map((u) => {
      const plain = u.get({ plain: true }) as any;
      return {
        id: plain.id as number,
        username: plain.username as string,
        role: plain.role as string,
      };
    });
  } catch (error: any) {
    console.error("getUsers error:", error);
    return [];
  }
}

export async function createUser(
  username: string,
  passwordHash: string,
  role: "cajero" | "supervisor",
) {
  try {
    await syncDatabase();
    const existing = await UserModel.findOne({ where: { username } });
    if (existing)
      return { success: false, error: "El nombre de usuario ya existe" };
    const hashed = await bcrypt.hash(passwordHash, 10);
    const user = await UserModel.create({
      username,
      passwordHash: hashed,
      role,
    } as any);
    const plain = user.get({ plain: true }) as any;
    return {
      success: true,
      user: { id: plain.id, username: plain.username, role: plain.role },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear usuario" };
  }
}

export async function updateUser(
  id: number,
  data: { username?: string; passwordHash?: string; role?: string },
) {
  try {
    await syncDatabase();
    const existing = await UserModel.findByPk(id);
    if (!existing) return { success: false, error: "Usuario no encontrado" };
    if (data.username && data.username !== existing.username) {
      const dup = await UserModel.findOne({
        where: { username: data.username },
      });
      if (dup)
        return { success: false, error: "El nombre de usuario ya existe" };
    }

    const updateData: any = { ...data };
    if (updateData.passwordHash) {
      updateData.passwordHash = await bcrypt.hash(updateData.passwordHash, 10);
    }

    await UserModel.update(updateData, { where: { id } });
    const updated = await UserModel.findByPk(id);
    const plain = updated!.get({ plain: true }) as any;
    return {
      success: true,
      user: { id: plain.id, username: plain.username, role: plain.role },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar usuario" };
  }
}

export async function deleteUser(id: number) {
  try {
    await syncDatabase();
    const user = await UserModel.findByPk(id);
    if (!user) return { success: false, error: "Usuario no encontrado" };
    await UserModel.destroy({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar usuario" };
  }
}

// ── Prices: get and update ──
export async function getPrices() {
  try {
    await syncDatabase();
    const prices = await PriceModel.findAll({ order: [["price", "ASC"]] });
    return prices.map((p) => p.get({ plain: true })) as {
      size: string;
      label: string;
      price: number;
    }[];
  } catch (error: any) {
    console.error("getPrices error:", error);
    return [];
  }
}

export async function updatePrice(
  size: string,
  newPrice: number,
  newLabel?: string,
) {
  try {
    await syncDatabase();
    const priceRecord = await PriceModel.findOne({ where: { size } });
    if (!priceRecord) return { success: false, error: "Tamaño no encontrado" };

    const updateData: any = { price: newPrice };
    if (newLabel) updateData.label = newLabel;

    await PriceModel.update(updateData, { where: { size } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar precio" };
  }
}

export async function createPrice(size: string, label: string, price: number) {
  try {
    await syncDatabase();
    const existing = await PriceModel.findOne({ where: { size } });
    if (existing) return { success: false, error: "El tamaño (ID) ya existe" };

    await PriceModel.create({ size, label, price });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear precio" };
  }
}

export async function deletePrice(size: string) {
  try {
    await syncDatabase();
    const record = await PriceModel.findOne({ where: { size } });
    if (!record) return { success: false, error: "Tamaño no encontrado" };

    await PriceModel.destroy({ where: { size } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar precio" };
  }
}

export async function sendBoleta(nombre: string, precio: number) {
  try {
    const response = await fetch(
      "https://new-backend-banos.dev-wit.com/api/boletas/enviar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre, precio }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Error al emitir la boleta",
      };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("Error emitting boleta:", error);
    return {
      success: false,
      error: "Error de conexión con el servidor de facturación",
    };
  }
}

export async function logClientError(message: string, stack: string) {
  logDebug(`[CLIENT ERROR] ${message}\nStack: ${stack}`);
  return true;
}

export async function dbSyncLayout(newLayout: LayoutConfig, newSizes: LockerSizeOption[]) {
  await syncDatabase();
  
  const rawLockers = await LockerModel.findAll();
  const currentLockers = rawLockers.map(l => l.get({ plain: true })) as Locker[];
  
  const { generateLockers } = await import("@/lib/types");
  const desiredLockers = generateLockers(newLayout);
  
  const toDelete = currentLockers.filter(cl => !desiredLockers.find(dl => dl.col === cl.col && dl.row === cl.row));
  
  for (const locker of toDelete) {
    if (locker.isOccupied || locker.currentRecordId !== null) {
      return { success: false, error: `No se puede guardar: El casillero ${locker.col}${locker.row} está actualmente ocupado. Por favor entréguelo antes de eliminar su espacio.` };
    }
  }
  
  const toCreate = desiredLockers.filter(dl => !currentLockers.find(cl => cl.col === dl.col && cl.row === cl.row));
  
  const t = await sequelize.transaction();
  try {
    for (const locker of toDelete) {
      await LockerModel.destroy({ where: { id: locker.id }, transaction: t });
    }
    
    if (toCreate.length > 0) {
      await LockerModel.bulkCreate(toCreate as any[], { transaction: t });
    }
    
    const currentSizes = await PriceModel.findAll();
    const sizesToDelete = currentSizes.filter(cs => !newSizes.find(ns => ns.value === cs.size));
    for (const size of sizesToDelete) {
      await PriceModel.destroy({ where: { size: size.size }, transaction: t });
    }
    for (const ns of newSizes) {
      const exists = currentSizes.find(cs => cs.size === ns.value);
      if (exists) {
        await PriceModel.update({ label: ns.label, price: ns.price } as any, { where: { size: ns.value }, transaction: t });
      } else {
        await PriceModel.create({ size: ns.value, label: ns.label, price: ns.price } as any, { transaction: t });
      }
    }
    
    const existingLayout = await SettingModel.findOne({ where: { key: "layout_config" } });
    if (existingLayout) {
      await SettingModel.update({ value: JSON.stringify(newLayout) } as any, { where: { key: "layout_config" }, transaction: t });
    } else {
      await SettingModel.create({ key: "layout_config", value: JSON.stringify(newLayout) } as any, { transaction: t });
    }
    
    await t.commit();
    return { success: true };
  } catch (err: any) {
    await t.rollback();
    return { success: false, error: "Error de base de datos: " + err.message };
  }
}
