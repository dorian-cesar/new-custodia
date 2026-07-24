import { syncDatabase, SettingModel, PriceModel, LockerModel } from './lib/db/models';

async function test() {
  console.log("Starting DB sync test...");
  try {
    await syncDatabase();
    console.log("DB synced successfully!");
    const count = await PriceModel.count();
    console.log("Price count:", count);
    const settings = await SettingModel.findAll();
    console.log("Settings in DB:", settings.map(s => s.get({ plain: true })));
    process.exit(0);
  } catch (err: any) {
    console.error("DB Sync failed with error:", err);
    process.exit(1);
  }
}

test();
