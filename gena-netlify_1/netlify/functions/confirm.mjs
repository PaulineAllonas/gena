import { subscribers, SITE } from "./lib/utils.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase();
  const token = url.searchParams.get("token") || "";

  const store = subscribers();
  const profile = await store.get(email, { type: "json" });

  if (!profile || profile.token !== token) {
    return new Response("Lien invalide ou expiré / Ungültiger Link / Invalid link.", {
      status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  profile.confirmed = true;
  profile.confirmedAt = new Date().toISOString();
  await store.setJSON(email, profile);

  return Response.redirect(`${SITE()}/?confirmed=1`, 302);
};
