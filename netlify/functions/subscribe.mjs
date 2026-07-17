import crypto from "node:crypto";
import { subscribers, sendMail, M, lang, SITE } from "./lib/utils.mjs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let b;
  try { b = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response("Invalid email", { status: 400 });
  if (!["DE", "FR"].includes(b.country)) b.country = "DE";

  const l = lang(b.lang);
  const token = crypto.randomUUID();

  // RGPD data minimisation: store only what the service needs
  const profile = {
    name: String(b.name || "").slice(0, 80),
    email,
    zip: String(b.zip || "").slice(0, 80),
    locName: String(b.locName || "").slice(0, 120),
    lat: Number(b.lat), lon: Number(b.lon),
    country: b.country,
    lead: b.lead === "eve" ? "eve" : ([30, 60, 180].includes(Number(b.lead)) ? Number(b.lead) : 60),
    freq: ["day", "week", "month"].includes(b.freq) ? b.freq : "day",
    lang: l,
    confirmed: false,
    token,
    createdAt: new Date().toISOString(),
    lastAlert: null,
  };

  await subscribers().setJSON(email, profile);

  const link = `${SITE()}/api/confirm?email=${encodeURIComponent(email)}&token=${token}`;
  await sendMail({ to: email, subject: M[l].confirmSubject, html: M[l].confirmBody(profile.name || "", link) });

  return Response.json({ ok: true });
};
