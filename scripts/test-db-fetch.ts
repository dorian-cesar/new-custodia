import fs from "fs";
import path from "path";

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    let val = trimmed.substring(firstEq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

import { SettingModel, syncDatabase } from "../lib/db/models";
import { sequelize } from "../lib/db/config";
import { DEFAULT_LAYOUT } from "../lib/types";

async function main() {
  await syncDatabase();

  const layoutSetting = await SettingModel.findOne({ where: { key: "layout_config" } });
  console.log("Setting encontrado:", !!layoutSetting);
  if (layoutSetting) {
    const val = (layoutSetting as any).value;
    console.log("Val length:", val.length);
    const parsed = JSON.parse(val);
    console.log("Parsed exitoso, shelves:", parsed.shelves?.length);
  }

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
