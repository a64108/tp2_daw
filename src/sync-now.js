import { runSync } from "./services/sync.service.js";

runSync()
  .then((r) => {
    console.log("SYNC OK:", r);
    process.exit(0);
  })
  .catch((e) => {
    console.error("SYNC ERROR:", e);
    process.exit(1);
  });
