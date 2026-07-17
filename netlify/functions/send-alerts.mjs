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
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

/* Weather forecast, timezone-safe: Open-Meteo returns LOCAL time strings,
   so we re-anchor them to UTC using utc_offset_seconds. */
async function fetchWeather(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,wind_speed_100m&forecast_days=3&timezone=auto`;
  const j = await (await fetch(u)).json();
  const off = (j.utc_offset_seconds || 0) * 1000;
  return j.hourly.time.map((t, i) => ({
    utc: Date.parse(t + "Z") - off,           // true UTC ms of this hour
    localHour: Number(t.slice(11, 13)),
    localDate: t.slice(0, 10),
    sun: Math.min(1, (j.hourly.shortwave_radiation[i] ?? 0) / 750),
    wind: Math.pow(Math.min(1, (j.hourly.wind_speed_100m[i] ?? 0) / 45), 1.6),
    offMs: off,
  }));
}

/* Day-ahead prices (unix timestamps -> already true UTC) */
async function fetchPrices(country) {
  try {
    const bzn = country === "FR" ? "FR" : "DE-LU";
    const j = await (await fetch(`https://api.energy-charts.info/price?bzn=${bzn}`)).json();
    return j.unix_seconds
      .map((s, i) => ({ utc: s * 1000, p: j.price[i] }))
      .filter((x) => x.p != null);
  } catch { return []; }
}

function priceInfo(prices, utc) {
  if (!prices.length) return { price: null, norm: null };
  const hit = prices.find((x) => Math.abs(x.utc - utc) < 1800e3);
  if (!hit) return { price: null, norm: null };
  const vals = prices.map((x) => x.p);
  const min = Math.min(...vals), max = Math.max(...vals);
  return { price: Math.round(hit.p) / 10, norm: max > min ? (hit.p - min) / (max - min) : 0.5 };
}

const scoreAt = (slot, prices) => {
  const { price, norm } = priceInfo(prices, slot.utc);
  return { score: computeScore(slot.wind, slot.sun, demandCurve(slot.localHour), norm), price };
};

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
      if (now - new Date(p.createdAt).getTime() > 48 * 3600e3) { await store.delete(key); purged++; }
      continue;
    }

    // frequency cap
    if (p.lastAlert && now - new Date(p.lastAlert).getTime() < FREQ_GAP_H[p.freq] * 3600e3) continue;

    try {
      const weather = await fetchWeather(p.lat, p.lon);
      if (!weather.length) continue;
      const prices = await fetchPrices(p.country);
      const t = M[p.lang] || M.en;
      const unsub = `${SITE()}/api/unsubscribe?email=${encodeURIComponent(p.email)}&token=${p.token}`;

      if (p.lead === "eve") {
        /* ---- evening digest: at 19:00 local, announce tomorrow's best window ---- */
        const offMs = weather[0].offMs;
        const localNow = new Date(now + offMs);
        if (localNow.getUTCHours() !== 19) continue; // runs hourly; act only in the 19:00 local slot
        const tomorrow = new Date(localNow); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const tomStr = tomorrow.toISOString().slice(0, 10);
        const day = weather.filter((s) => s.localDate === tomStr);
        if (!day.length) continue;
        let best = null;
        for (const slot of day) {
          const r = scoreAt(slot, prices);
          if (!best || r.score > best.score) best = { ...r, hour: slot.localHour };
        }
        await sendMail({
          to: p.email,
          subject: t.eveSubject(),
          html: t.eveBody(p.name || "", fmtHour(best.hour), p.locName || p.zip, best.score, best.price, unsub),
        });
      } else {
        /* ---- classic lead-time alert: now + N minutes ---- */
        const target = now + p.lead * 60e3;
        const slot = weather.find((s) => Math.abs(s.utc - target) < 1800e3);
        if (!slot) continue;
        const { score, price } = scoreAt(slot, prices);
        if (score < 60) continue;
        await sendMail({
          to: p.email,
          subject: t.alertSubject(fmtHour(slot.localHour)),
          html: t.alertBody(p.name || "", fmtHour(slot.localHour), p.locName || p.zip, price, unsub),
        });
      }

      p.lastAlert = new Date(now).toISOString();
      await store.setJSON(key, p);
      sent++;
    } catch (e) {
      console.error(`alert failed for ${key}:`, e.message);
    }
  }

  console.log(`send-alerts: ${sent} sent, ${purged} unconfirmed purged, ${blobs.length} profiles total`);
  return new Response("ok");
};

export const config = { schedule: "@hourly" };
