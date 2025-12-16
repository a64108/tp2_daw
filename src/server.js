import "dotenv/config";
import { app } from "./app.js";
import { startCron } from "./cron.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API a correr em http://localhost:${PORT}`);
  startCron();
});
