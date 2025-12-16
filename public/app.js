const citySelect = document.getElementById("citySelect");
const search = document.getElementById("search");
const dateInput = document.getElementById("date");
const btnLoad = document.getElementById("btnLoad");

const output = document.getElementById("output");
const statusEl = document.getElementById("status");
const pillStatus = document.getElementById("pillStatus");

const heroKicker = document.getElementById("heroKicker");
const heroCity = document.getElementById("heroCity");
const heroMeta = document.getElementById("heroMeta");
const badgeRain = document.getElementById("badgeRain");

const mTmin = document.getElementById("mTmin");
const mTmax = document.getElementById("mTmax");
const mAmp = document.getElementById("mAmp");
const mWind = document.getElementById("mWind");

const rainPct = document.getElementById("rainPct");
const rainFill = document.getElementById("rainFill");
const comfortPct = document.getElementById("comfortPct");
const comfortFill = document.getElementById("comfortFill");

const canvas = document.getElementById("tempChart");
const ctx = canvas.getContext("2d");

let allCities = [];

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function setPill(ok) {
  pillStatus.textContent = ok ? "online" : "offline";
  pillStatus.style.color = ok ? "var(--good)" : "var(--bad)";
  pillStatus.style.borderColor = ok ? "rgba(61,220,151,.35)" : "rgba(255,107,107,.35)";
}

function renderCities(list) {
  citySelect.innerHTML = "";
  for (const c of list) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name}${c.district ? " (" + c.district + ")" : ""}`;
    citySelect.appendChild(opt);
  }
}

function filterCities(q) {
  const s = q.trim().toLowerCase();
  if (!s) return allCities;
  return allCities.filter((c) =>
    (c.name || "").toLowerCase().includes(s) ||
    (c.district || "").toLowerCase().includes(s) ||
    String(c.id).includes(s)
  );
}

async function loadCities() {
  setStatus("A carregar cidades...");
  const res = await fetch("/cities");
  if (!res.ok) throw new Error("Falha a carregar /cities");
  allCities = await res.json();
  renderCities(allCities);
  setStatus(`Cidades carregadas: ${allCities.length}`);
  setPill(true);
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function pct(n01) {
  return `${Math.round(clamp01(n01) * 100)}%`;
}

function setBar(fillEl, value01) {
  fillEl.style.width = `${Math.round(clamp01(value01) * 100)}%`;
}

function pickRainBadge(prob) {
  if (prob == null) return { text: "Chuva: —", tone: "muted" };
  if (prob >= 70) return { text: `Chuva: ${prob}% (alta)`, tone: "bad" };
  if (prob >= 35) return { text: `Chuva: ${prob}% (média)`, tone: "warn" };
  return { text: `Chuva: ${prob}% (baixa)`, tone: "good" };
}

// Heurística simples só para ter “percentagem” bonita
function calcComfort(tMin, tMax, rainProb) {
  // alvo ~ 18-25ºC
  const avg = (tMin + tMax) / 2;
  const tempPenalty = Math.abs(avg - 21) / 20; // quanto mais longe de 21, pior
  const rainPenalty = (rainProb ?? 0) / 100;

  // 1 = ótimo, 0 = péssimo
  const score = 1 - (0.65 * clamp01(tempPenalty) + 0.35 * clamp01(rainPenalty));
  return clamp01(score);
}

function fmtTemp(x) {
  return x == null ? "—" : `${Number(x).toFixed(0)}°C`;
}

function drawTempChart(tMin, tMax) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // background
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, w, h);

  // axis baseline
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, h - 26);
  ctx.lineTo(w - 18, h - 26);
  ctx.stroke();

  if (tMin == null || tMax == null) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "14px system-ui";
    ctx.fillText("Sem dados de temperatura para gráfico.", 28, 44);
    return;
  }

  // scale
  const minScale = Math.min(tMin, tMax) - 3;
  const maxScale = Math.max(tMin, tMax) + 3;

  const x1 = 80, x2 = w - 60;
  const y = (v) => {
    const p = (v - minScale) / (maxScale - minScale);
    return (h - 30) - p * (h - 70);
  };

  // line between min and max
  ctx.strokeStyle = "rgba(122,167,255,0.9)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y(tMin));
  ctx.lineTo(x2, y(tMax));
  ctx.stroke();

  // points
  ctx.fillStyle = "rgba(61,220,151,0.95)";
  ctx.beginPath();
  ctx.arc(x1, y(tMin), 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,204,102,0.95)";
  ctx.beginPath();
  ctx.arc(x2, y(tMax), 7, 0, Math.PI * 2);
  ctx.fill();

  // labels
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "14px system-ui";
  ctx.fillText(`Tmin ${tMin}°C`, x1 - 36, y(tMin) - 12);
  ctx.fillText(`Tmax ${tMax}°C`, x2 - 36, y(tMax) - 12);
}

async function loadForecast() {
  const cityId = citySelect.value;
  if (!cityId) return;

  const city = allCities.find((c) => String(c.id) === String(cityId));
  const cityName = city ? `${city.name}${city.district ? " (" + city.district + ")" : ""}` : `ID ${cityId}`;

  const date = dateInput.value; // YYYY-MM-DD ou ""
  const url = date
    ? `/forecast?cityId=${encodeURIComponent(cityId)}&date=${encodeURIComponent(date)}`
    : `/forecast?cityId=${encodeURIComponent(cityId)}`;

  setStatus("A buscar previsão...");
  const res = await fetch(url);
  const data = await res.json();

  // debug raw
  output.textContent = JSON.stringify(data, null, 2);

  const row = Array.isArray(data) && data.length ? data[0] : null;

  heroKicker.textContent = "Cidade";
  heroCity.textContent = cityName;

  if (!row) {
    heroMeta.textContent = "Sem previsão guardada para esta data.";
    badgeRain.textContent = "—";
    badgeRain.style.color = "var(--muted)";

    mTmin.textContent = "—";
    mTmax.textContent = "—";
    mAmp.textContent = "—";
    mWind.textContent = "—";

    rainPct.textContent = "—";
    comfortPct.textContent = "—";
    setBar(rainFill, 0);
    setBar(comfortFill, 0);
    drawTempChart(null, null);
    setStatus("OK — 0 registos");
    return;
  }

  const tmin = row.tMin;
  const tmax = row.tMax;
  const amp = row.amplitude;
  const wind = row.windClass ?? "—";
  const rp = row.precipProb;

  const dateLabel = (row.forecastDate || "").slice(0, 10);
  heroMeta.textContent = dateLabel ? `Data: ${dateLabel}` : "—";

  const badge = pickRainBadge(rp);
  badgeRain.textContent = badge.text;
  badgeRain.style.color =
    badge.tone === "bad" ? "var(--bad)" :
    badge.tone === "warn" ? "var(--warn)" :
    badge.tone === "good" ? "var(--good)" : "var(--muted)";

  mTmin.textContent = fmtTemp(tmin);
  mTmax.textContent = fmtTemp(tmax);
  mAmp.textContent = amp == null ? "—" : `${Number(amp).toFixed(0)}°C`;
  mWind.textContent = String(wind);

  const rain01 = rp == null ? 0 : clamp01(Number(rp) / 100);
  rainPct.textContent = rp == null ? "—" : `${Number(rp).toFixed(0)}%`;
  setBar(rainFill, rain01);

  const comfort = (tmin != null && tmax != null) ? calcComfort(Number(tmin), Number(tmax), Number(rp ?? 0)) : 0;
  comfortPct.textContent = pct(comfort);
  setBar(comfortFill, comfort);

  drawTempChart(tmin != null ? Number(tmin) : null, tmax != null ? Number(tmax) : null);

  setStatus(`OK — 1 registo`);
}

search.addEventListener("input", () => {
  renderCities(filterCities(search.value));
});

btnLoad.addEventListener("click", loadForecast);

loadCities().catch((e) => {
  console.error(e);
  setPill(false);
  setStatus("Erro a carregar cidades. Vê a consola.");
});
