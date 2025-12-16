import "dotenv/config";
import cron from "node-cron";
import { runSync } from "./services/sync.service.js";

export function startCron() {
  // de hora a hora, ao minuto 5 (evita bater exatamente na hora)
  const schedule = process.env.SYNC_CRON || "5 * * * *";

  cron.schedule(schedule, async () => {
    try {
      const r = await runSync();
      console.log("[CRON] sync ok:", r);
    } catch (e) {
      console.error("[CRON] sync error:", e?.message ?? e);
    }
  });

  console.log(`[CRON] ativo: ${schedule}`);
}
