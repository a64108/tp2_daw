import axios from "axios";

// Hoje (day0). Podes depois fazer day1/day2 também.
const FORECAST_URL =
  "https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/hp-daily-forecast-day0.json";

export async function fetchDailyForecast() {
  const { data } = await axios.get(FORECAST_URL, { timeout: 15000 });

  if (!data || !Array.isArray(data.data)) {
    throw new Error("IPMA daily forecast: formato inesperado.");
  }

  return {
    updatedAt: data.dataUpdate ?? null,
    rows: data.data,
  };
}
