import express from "express";
import pkg from "@prisma/client";

import { requireApiKey } from "./middlewares/apiKey.middleware.js";
import { runSync } from "./services/sync.service.js";


const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const app = express();
app.use(express.json());

// health check
app.get("/health", (req, res) => res.json({ ok: true }));

// listar cidades ativas
app.get("/cities", async (req, res) => {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });
  res.json(cities);
});

// previsão (por cityId, default: hoje)
app.get("/forecast", async (req, res) => {
  const cityId = Number(req.query.cityId);
  if (!cityId) return res.status(400).json({ error: "cityId is required" });

  const dateStr = req.query.date?.toString(); // YYYY-MM-DD opcional
  const date = dateStr
    ? new Date(`${dateStr}T00:00:00.000Z`)
    : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  const rows = await prisma.forecast.findMany({
    where: { cityId, forecastDate: date },
    orderBy: { forecastDate: "asc" },
  });

  res.json(rows);
});

export { prisma };

app.post("/admin/sync", requireApiKey, async (req, res) => {
  const result = await runSync();
  res.json(result);
});

