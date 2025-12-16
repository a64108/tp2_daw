import "dotenv/config";
import express from "express";
import pkg from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import { requireApiKey } from "./middlewares/apiKey.middleware.js";
import { runSync } from "./services/sync.service.js";

const { PrismaClient } = pkg;
export const prisma = new PrismaClient();

export const app = express();
app.use(express.json());

import path from "path";

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));


// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (req, res) => res.json(swaggerSpec));

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check da API
 *     responses:
 *       200:
 *         description: API operacional
 */
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * @openapi
 * /cities:
 *   get:
 *     summary: Lista todas as cidades ativas
 *     responses:
 *       200:
 *         description: Lista de cidades
 */
app.get("/cities", async (req, res) => {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      district: true,
      isActive: true,
    },
  });
  res.json(cities);
});

/**
 * @openapi
 * /forecast:
 *   get:
 *     summary: Obtém a previsão meteorológica de uma cidade
 *     parameters:
 *       - in: query
 *         name: cityId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         required: false
 *         description: "Data no formato YYYY-MM-DD (default: hoje)"
 *         schema:
 *           type: string
 *           example: "2025-12-16"
 *     responses:
 *       200:
 *         description: Lista de previsões (normalmente 0 ou 1)
 *       400:
 *         description: Parâmetros inválidos
 */
app.get("/forecast", async (req, res) => {
  const cityId = Number(req.query.cityId);
  if (!cityId) {
    return res.status(400).json({ error: "cityId is required" });
  }

  const dateStr = req.query.date?.toString();
  let forecastDate;

  if (dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }
    forecastDate = new Date(`${dateStr}T00:00:00.000Z`);
  } else {
    const now = new Date();
    forecastDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }

  const rows = await prisma.forecast.findMany({
    where: { cityId, forecastDate },
    orderBy: { forecastDate: "asc" },
  });

  res.json(rows);
});

/**
 * @openapi
 * /watchlist:
 *   get:
 *     summary: Lista a watchlist local
 *     responses:
 *       200:
 *         description: Lista de cidades na watchlist
 *
 *   post:
 *     summary: Adiciona ou atualiza uma cidade na watchlist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cityId
 *             properties:
 *               cityId:
 *                 type: integer
 *               label:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cidade adicionada ou atualizada
 */
app.get("/watchlist", async (req, res) => {
  const list = await prisma.watchlist.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      city: {
        select: { id: true, name: true, district: true },
      },
    },
  });
  res.json(list);
});

app.post("/watchlist", async (req, res) => {
  const cityId = Number(req.body?.cityId);
  const label =
    req.body?.label !== undefined ? String(req.body.label) : null;

  if (!cityId) {
    return res.status(400).json({ error: "cityId is required" });
  }

  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) {
    return res.status(404).json({ error: "city not found" });
  }

  const item = await prisma.watchlist.upsert({
    where: { cityId },
    update: { label },
    create: { cityId, label },
  });

  res.status(201).json(item);
});

/**
 * @openapi
 * /watchlist/{cityId}:
 *   delete:
 *     summary: Remove uma cidade da watchlist
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cidade removida
 *       404:
 *         description: Cidade não encontrada
 */
app.delete("/watchlist/:cityId", async (req, res) => {
  const cityId = Number(req.params.cityId);
  if (!cityId) {
    return res.status(400).json({ error: "invalid cityId" });
  }

  try {
    await prisma.watchlist.delete({ where: { cityId } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

/**
 * @openapi
 * /admin/sync:
 *   post:
 *     summary: Executa sincronização manual com o IPMA
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resultado da sincronização
 *       401:
 *         description: Não autorizado
 */
app.post("/admin/sync", requireApiKey, async (req, res) => {
  const result = await runSync();
  res.json(result);
});

/**
 * @openapi
 * /sync-runs:
 *   get:
 *     summary: Lista execuções de sincronização
 *     responses:
 *       200:
 *         description: Lista de sync runs
 */
app.get("/sync-runs", async (req, res) => {
  const rows = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json(rows);
});
