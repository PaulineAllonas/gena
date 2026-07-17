import { subscribers, sendMail, M, SITE } from "./lib/utils.mjs";

/* Same model as the front end */
const demandCurve = (h) => [.35,.3,.28,.27,.28,.35,.55,.8,.85,.7,.6,.58,.6,.58,.55,.58,.65,.8,.95,1,.9,.75,.6,.45][h];

function computeScore(wind, sun, demand, priceNorm) {
  const supply = 0.55 * wind + 0.45 * sun;
  let s = Math.max(0, Math.min(1, supply - 0.30 * (demand - 0.5)));
  if (priceNorm != null) s = 0.7 * s + 0.3 * (1 - priceNorm);
  return Math.round(s * 100);
}

const FREQ_GAP_H = { day: 20, week: 6.5 * 24, month: 27 * 24 };

async function forecastAt(lat, lon, target) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,wind_speed_100m&forecast_days=2&timezone=auto`;
  const j = await (await fetch(u)).json();
  const off = (j.utc_offset_seconds || 0) * 1000;
  const idx = j.hourly.time.findIndex((t) => Math.abs(Date.parse(t + "Z") - off - target) < 1800e3);
  if (idx === -1) return null;
  const sun = Math.min(1, (j.hourly.shortwave_radiation[idx] ?? 0) / 750);
  const wind = Math.pow(Math.min(1, (j.hourly.wind_speed_100m[idx] ?? 0) / 45), 1.6);
  return { sun, wind, localHour: Number(j.hourly.time[idx].slice(11, 13)) };
}

async function priceAt(country, target) {
  try {
    const bzn = country === "FR" ? "FR" : "DE-LU";
    const j = await (await fetch(`https://api.energy-charts.info/price?bzn=${bzn}`)).json();
    const prices = j.unix_seconds
      .map((s, i) => ({ t: s * 1000, p: j.price[i] }))
      .filter((x) => x.p != null);
    if (!prices.length) return { price: null, norm: null };
    const hit = prices.find((x) => Math.abs(x.t - target) < 1800e3);
    const vals = prices.map((x) => x.p);
    const min = Math.min(...vals), max = Math.max(...vals);
    if (!hit) return { price: null, norm: null };
    return {
      price: Math.round(hit.p) / 10, // EUR/MWh -> ct/kWh, 1 decimal
      norm: max > min ? (hit.p - min) / (max - min) : 0.5,
    };
  } catch { return { price: null, norm: null }; }
}

export default async () => {
  const store = subscribers();
  const now = Date.now();
  let sent = 0, purged = 0;

  const { blobs } = await store.list();
  for (const { key } of blobs) {
    const p = await store.get(key, { type: "json" });
    if (!p) continue;

    // RGPD: purge unconfirmed sign-ups after 48 h
    if (!p.confirmed) {
      if (now - new Date(p.createdAt).getTime() > 48 * 3600e3) {
        await store.delete(key);
        purged++;
      }
      continue;
    }

    // frequency cap
    if (p.lastAlert && now - new Date(p.lastAlert).getTime() < FREQ_GAP_H[p.freq] * 3600e3) continue;

    try {
      const target = now + p.lead * 60e3;
      const fc = await forecastAt(p.lat, p.lon, target);
      if (!fc) continue;
      const { price, norm } = await priceAt(p.country, target);
      const h = fc.localHour;
      const score = computeScore(fc.wind, fc.sun, demandCurve(h), norm);

      if (score >= 60) {
        const hourStr = `${String(h).padStart(2, "0")}:00`;
        const unsub = `${SITE()}/api/unsubscribe?email=${encodeURIComponent(p.email)}&token=${p.token}`;
        const t = M[p.lang] || M.en;
        await sendMail({
          to: p.email,
          subject: t.alertSubject(hourStr),
          html: t.alertBody(p.name || "", hourStr, p.locName || p.zip, price, unsub),
        });
        p.lastAlert = new Date(now).toISOString();
        await store.setJSON(key, p);
        sent++;
      }
    } catch (e) {
      console.error(`alert failed for ${key}:`, e.message);
    }
  }

  console.log(`send-alerts: ${sent} sent, ${purged} unconfirmed purged, ${blobs.length} profiles total`);
  return new Response("ok");
};

export const config = { schedule: "@hourly" };
