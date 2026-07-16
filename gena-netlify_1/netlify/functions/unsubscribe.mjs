import { subscribers, SITE } from "./lib/utils.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").toLowerCase();
  const token = url.searchParams.get("token") || "";

  const store = subscribers();
  const profile = await store.get(email, { type: "json" });

  // Idempotent: already gone -> still a success for the user
  if (profile && profile.token === token) {
    await store.delete(email);
  } else if (profile) {
    return new Response("Lien invalide / Ungültiger Link / Invalid link.", {
      status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return Response.redirect(`${SITE()}/?unsubscribed=1`, 302);
};
