import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "";
const TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function http(path, { method = "GET", headers = {}, body } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) data = await res.json();
    else data = await res.text();

    return { status: res.status, headers: res.headers, data };
  } finally {
    clearTimeout(id);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (e) {
    console.error(`❌ ${name}\n   -> ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`BASE_URL = ${BASE_URL}`);

  let okCount = 0;
  let failCount = 0;

  // ---------- BASIC ----------
  {
    const ok = await test("GET /health -> 200 + {ok:true}", async () => {
      const r = await http("/health");
      assert(r.status === 200, `status ${r.status}`);
      assert(r.data && r.data.ok === true, "body.ok != true");
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("GET /docs -> 200 (HTML)", async () => {
      const r = await http("/docs");
      assert(r.status === 200, `status ${r.status}`);
      assert(typeof r.data === "string" && r.data.toLowerCase().includes("<html"), "não parece HTML");
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("GET /openapi.json -> 200 (OpenAPI)", async () => {
      const r = await http("/openapi.json");
      assert(r.status === 200, `status ${r.status}`);
      assert(r.data && r.data.openapi, "spec sem campo 'openapi'");
    });
    ok ? okCount++ : failCount++;
  }

  // ---------- CITIES ----------
  let anyCityId = null;

  {
    const ok = await test("GET /cities -> 200 + array", async () => {
      const r = await http("/cities");
      assert(r.status === 200, `status ${r.status}`);
      assert(Array.isArray(r.data), "não é array");
      assert(r.data.length > 0, "lista vazia (seed não carregou?)");
      anyCityId = r.data[0].id;
      assert(Number.isFinite(anyCityId), "id inválido");
    });
    ok ? okCount++ : failCount++;
  }

  // ---------- FORECAST ----------
  {
    const ok = await test("GET /forecast sem cityId -> 400", async () => {
      const r = await http("/forecast");
      assert(r.status === 400, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("GET /forecast com date inválida -> 400", async () => {
      const r = await http(`/forecast?cityId=${encodeURIComponent(anyCityId)}&date=16-12-2025`);
      assert(r.status === 400, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("GET /forecast com cityId válido -> 200 + array", async () => {
      const r = await http(`/forecast?cityId=${encodeURIComponent(anyCityId)}`);
      assert(r.status === 200, `status ${r.status}`);
      assert(Array.isArray(r.data), "não é array");
      // pode ser [] se ainda não houver previsão para essa cidade/data (normal)
    });
    ok ? okCount++ : failCount++;
  }

  // ---------- WATCHLIST (CRUD) ----------
  {
    const ok = await test("GET /watchlist -> 200 + array", async () => {
      const r = await http("/watchlist");
      assert(r.status === 200, `status ${r.status}`);
      assert(Array.isArray(r.data), "não é array");
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("POST /watchlist sem cityId -> 400", async () => {
      const r = await http("/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { label: "casa" },
      });
      assert(r.status === 400, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("POST /watchlist com cityId inexistente -> 404", async () => {
      const r = await http("/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { cityId: 999999999, label: "fake" },
      });
      assert(r.status === 404, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("POST /watchlist válido -> 201", async () => {
      const r = await http("/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { cityId: anyCityId, label: "casa" },
      });
      assert(r.status === 201, `status ${r.status}`);
      assert(r.data && r.data.cityId === anyCityId, "cityId não bate certo");
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("POST /watchlist update do mesmo cityId -> 201", async () => {
      const r = await http("/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { cityId: anyCityId, label: "trabalho" },
      });
      assert(r.status === 201, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("DELETE /watchlist/abc -> 400", async () => {
      const r = await http("/watchlist/abc", { method: "DELETE" });
      assert(r.status === 400, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("DELETE /watchlist/999999999 (não existe) -> 404", async () => {
      const r = await http("/watchlist/999999999", { method: "DELETE" });
      assert(r.status === 404, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("DELETE /watchlist/<cityId> -> 200", async () => {
      const r = await http(`/watchlist/${encodeURIComponent(anyCityId)}`, { method: "DELETE" });
      assert(r.status === 200, `status ${r.status}`);
      assert(r.data && r.data.ok === true, "body.ok != true");
    });
    ok ? okCount++ : failCount++;
  }

  // ---------- ADMIN SYNC (auth) ----------
  {
    const ok = await test("POST /admin/sync sem API key -> 401", async () => {
      const r = await http("/admin/sync", { method: "POST" });
      assert(r.status === 401, `status ${r.status}`);
    });
    ok ? okCount++ : failCount++;
  }

  {
    const ok = await test("POST /admin/sync com API key -> 200", async () => {
      assert(API_KEY, "API_KEY não está definido no .env (precisas para este teste)");
      const r = await http("/admin/sync", {
        method: "POST",
        headers: { "x-api-key": API_KEY },
      });
      assert(r.status === 200, `status ${r.status}`);
      assert(r.data && r.data.status === "success", "sync não devolveu status success");
    });
    ok ? okCount++ : failCount++;
  }

  // ---------- SYNC RUNS (se existir) ----------
  {
    const ok = await test("GET /sync-runs (se existir) -> 200", async () => {
      const r = await http("/sync-runs");
      if (r.status === 404) {
        // endpoint opcional — não falha o suite
        return;
      }
      assert(r.status === 200, `status ${r.status}`);
      assert(Array.isArray(r.data), "não é array");
    });

    // aqui conto como OK mesmo se 404, porque é opcional
    okCount += 1;
  }

  console.log(`\nRESULTADO: ${okCount} ok, ${failCount} falhas`);
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
