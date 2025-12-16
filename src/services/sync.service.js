import pkg from "@prisma/client";
import { fetchDailyForecast } from "./ipma.service.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

function toDateOnlyFromIPMA(r) {
  // Campos possíveis dependendo do ficheiro IPMA/versão
  const raw = r.forecastDate ?? r.dataPrev ?? r.date ?? r.data ?? null;

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    // guarda sempre como 00:00:00Z do dia
    return new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  }

  // fallback: hoje (UTC) às 00:00
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function runSync() {
  const sync = await prisma.syncRun.create({
    data: { status: "running", fetched: 0, upserted: 0 },
  });

  try {
    const activeCities = await prisma.city.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const activeSet = new Set(activeCities.map((c) => c.id));

    const { rows } = await fetchDailyForecast();

    let fetched = 0;
    let upserted = 0;

    for (const r of rows) {
      const cityId = Number(r.globalIdLocal);
      if (!activeSet.has(cityId)) continue;

      const forecastDate = toDateOnlyFromIPMA(r);

      fetched++;

      const tMin = r.tMin != null ? Number(r.tMin) : null;
      const tMax = r.tMax != null ? Number(r.tMax) : null;

      await prisma.forecast.upsert({
        where: {
          cityId_forecastDate: {
            cityId,
            forecastDate,
          },
        },
        update: {
          tMin,
          tMax,
          precipProb: r.precipitaProb != null ? Number(r.precipitaProb) : null,
          windClass: r.classWindSpeed != null ? String(r.classWindSpeed) : null,
          weatherType: r.idWeatherType != null ? Number(r.idWeatherType) : null,
          // opcional: se depois mapeares idWeatherType -> descrição
          weatherDesc: null,
          amplitude: tMin != null && tMax != null ? tMax - tMin : null,
        },
        create: {
          cityId,
          forecastDate,
          tMin,
          tMax,
          precipProb: r.precipitaProb != null ? Number(r.precipitaProb) : null,
          windClass: r.classWindSpeed != null ? String(r.classWindSpeed) : null,
          weatherType: r.idWeatherType != null ? Number(r.idWeatherType) : null,
          weatherDesc: null,
          amplitude: tMin != null && tMax != null ? tMax - tMin : null,
        },
      });

      upserted++;
    }

    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "success",
        fetched,
        upserted,
        finishedAt: new Date(),
        message: null,
      },
    });

    return { status: "success", fetched, upserted };
  } catch (e) {
    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "error",
        finishedAt: new Date(),
        message: String(e?.message ?? e),
      },
    });

    throw e;
  }
}
