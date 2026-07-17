import { getStore } from "@netlify/blobs";

export const subscribers = () => getStore({ name: "subscribers", consistency: "strong" });

export const SITE = () => process.env.URL || "http://localhost:8888";

/* ---------- e-mail via Resend (https://resend.com, free tier) ---------- */
export async function sendMail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const from = process.env.GENA_FROM || "Gena <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

/* ---------- trilingual e-mail texts ---------- */
export const M = {
  fr: {
    confirmSubject: "Gena — confirmez votre inscription",
    confirmBody: (name, link) => `
      <p>Bonjour ${name},</p>
      <p>Vous avez demandé à recevoir les alertes « heures vertes » de Gena.
      Pour confirmer votre inscription (double opt-in), cliquez ici :</p>
      <p><a href="${link}" style="background:#1E5E3F;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Confirmer mon inscription</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : sans confirmation sous 48 h, vos données seront supprimées.</p>
      <p>— Gena · Green Energy Alert</p>`,
    eveSubject: () => `🌱 Gena : votre programme vert pour demain`,
    eveBody: (name, h, loc, score, price, unsub) => `
      <p>Bonsoir ${name},</p>
      <p><strong>Demain à ${loc}</strong>, la meilleure fenêtre verte sera autour de <strong>${h}</strong> (score ${score}/100${price != null ? `, prix de gros ≈ ${price} ct/kWh` : ""}).</p>
      <p>Programmez dès ce soir : recharge de la voiture, lave-linge, lave-vaisselle, chauffe-eau. 🌱</p>
      <p style="font-size:12px;color:#557060">Vous recevez cet e-mail car vous êtes inscrit·e aux alertes Gena.
      <a href="${unsub}">Se désinscrire</a> (suppression immédiate de vos données).</p>`,
    alertSubject: (h) => `⚡ Gena : heure verte à ${h}`,
    alertBody: (name, h, loc, price, unsub) => `
      <p>Bonjour ${name},</p>
      <p><strong>C'est bientôt le moment !</strong> À <strong>${h}</strong> à ${loc}, l'électricité sera particulièrement verte${price != null ? ` — prix de gros ≈ <strong>${price} ct/kWh</strong>` : ""}.</p>
      <p>Rechargez la voiture, préchauffez ou climatisez le logement, lancez vos machines. 🌱</p>
      <p style="font-size:12px;color:#557060">Vous recevez cet e-mail car vous êtes inscrit·e aux alertes Gena.
      <a href="${unsub}">Se désinscrire</a> (suppression immédiate de vos données).</p>`,
  },
  de: {
    confirmSubject: "Gena — bitte Anmeldung bestätigen",
    confirmBody: (name, link) => `
      <p>Hallo ${name},</p>
      <p>Sie möchten Genas „grüne Stunden"-Alerts erhalten.
      Bitte bestätigen Sie Ihre Anmeldung (Double-Opt-in):</p>
      <p><a href="${link}" style="background:#1E5E3F;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Anmeldung bestätigen</a></p>
      <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail: ohne Bestätigung innerhalb von 48 h werden Ihre Daten gelöscht.</p>
      <p>— Gena · Green Energy Alert</p>`,
    eveSubject: () => `🌱 Gena: Ihr grüner Plan für morgen`,
    eveBody: (name, h, loc, score, price, unsub) => `
      <p>Guten Abend ${name},</p>
      <p><strong>Morgen in ${loc}</strong> liegt das beste grüne Zeitfenster um <strong>${h}</strong> (Score ${score}/100${price != null ? `, Börsenpreis ≈ ${price} ct/kWh` : ""}).</p>
      <p>Schon heute Abend programmieren: Auto laden, Waschmaschine, Spülmaschine, Warmwasser. 🌱</p>
      <p style="font-size:12px;color:#557060">Sie erhalten diese E-Mail, weil Sie Genas Alerts abonniert haben.
      <a href="${unsub}">Abmelden</a> (sofortige Löschung Ihrer Daten).</p>`,
    alertSubject: (h) => `⚡ Gena: grüne Stunde um ${h}`,
    alertBody: (name, h, loc, price, unsub) => `
      <p>Hallo ${name},</p>
      <p><strong>Gleich ist es so weit!</strong> Um <strong>${h}</strong> in ${loc} ist der Strom besonders grün${price != null ? ` — Börsenpreis ≈ <strong>${price} ct/kWh</strong>` : ""}.</p>
      <p>Auto laden, Zuhause vorheizen oder kühlen, Maschinen starten. 🌱</p>
      <p style="font-size:12px;color:#557060">Sie erhalten diese E-Mail, weil Sie Genas Alerts abonniert haben.
      <a href="${unsub}">Abmelden</a> (sofortige Löschung Ihrer Daten).</p>`,
  },
  en: {
    confirmSubject: "Gena — confirm your subscription",
    confirmBody: (name, link) => `
      <p>Hi ${name},</p>
      <p>You asked to receive Gena's "green hours" alerts.
      Please confirm your subscription (double opt-in):</p>
      <p><a href="${link}" style="background:#1E5E3F;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">Confirm my subscription</a></p>
      <p>If you didn't request this, just ignore this email: without confirmation within 48 h, your data will be deleted.</p>
      <p>— Gena · Green Energy Alert</p>`,
    eveSubject: () => `🌱 Gena: your green plan for tomorrow`,
    eveBody: (name, h, loc, score, price, unsub) => `
      <p>Good evening ${name},</p>
      <p><strong>Tomorrow in ${loc}</strong>, the best green window will be around <strong>${h}</strong> (score ${score}/100${price != null ? `, wholesale price ≈ ${price} ct/kWh` : ""}).</p>
      <p>Set it up tonight: car charging, washing machine, dishwasher, water heater. 🌱</p>
      <p style="font-size:12px;color:#557060">You receive this email because you subscribed to Gena's alerts.
      <a href="${unsub}">Unsubscribe</a> (your data is deleted immediately).</p>`,
    alertSubject: (h) => `⚡ Gena: green hour at ${h}`,
    alertBody: (name, h, loc, price, unsub) => `
      <p>Hi ${name},</p>
      <p><strong>Almost time!</strong> At <strong>${h}</strong> in ${loc}, electricity will be particularly green${price != null ? ` — wholesale price ≈ <strong>${price} ct/kWh</strong>` : ""}.</p>
      <p>Charge the car, pre-heat or pre-cool your home, run your machines. 🌱</p>
      <p style="font-size:12px;color:#557060">You receive this email because you subscribed to Gena's alerts.
      <a href="${unsub}">Unsubscribe</a> (your data is deleted immediately).</p>`,
  },
};

export const lang = (l) => M[l] ? l : "en";
