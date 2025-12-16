require("dotenv").config();
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const IPMA_CITIES_URL = "https://api.ipma.pt/open-data/distrits-islands.json";

async function main() {
  const { data } = await axios.get(IPMA_CITIES_URL);

  const rows = (data?.data ?? []).map((c) => ({
    id: Number(c.globalIdLocal),
    name: String(c.local),
    district: c.district ? String(c.district) : null,
    isActive: true,
  }));

  for (const r of rows) {
    await prisma.city.upsert({
      where: { id: r.id },
      update: { name: r.name, district: r.district, isActive: true },
      create: r,
    });
  }

  console.log(`Seed done: ${rows.length} cities upserted.`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
