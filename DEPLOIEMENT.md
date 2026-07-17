# Gena — Guide de déploiement Netlify

Le site utilise des fonctions serverless (backend), donc **le simple glisser-déposer ne suffit plus** : il faut passer par un dépôt Git ou par la CLI Netlify. Compte 20–30 minutes la première fois.

## 1. Créer le compte e-mail transactionnel (Resend)

1. Crée un compte gratuit sur **resend.com** (3 000 e-mails/mois gratuits).
2. Dans *API Keys*, crée une clé et copie-la (elle commence par `re_`).
3. Pour les premiers tests, l'expéditeur `onboarding@resend.dev` fonctionne, **mais uniquement vers ta propre adresse**. Pour envoyer aux abonnés, ajoute un domaine dans *Domains* (par ex. `gena-alert.com` acheté chez Netlify ou OVH, ~10 €/an) et suis la vérification DNS. L'expéditeur devient alors par ex. `Gena <alerte@gena-alert.com>`.

## 2. Mettre le code sur GitHub

1. Crée un dépôt (privé) sur github.com, par ex. `gena`.
2. Téléverse tout le contenu du dossier (index.html, privacy.html, netlify.toml, package.json, dossier netlify/). Sur github.com : *Add file → Upload files* fonctionne sans ligne de commande.

## 3. Connecter Netlify

1. Sur app.netlify.com : *Add new site → Import an existing project → GitHub* → choisis le dépôt `gena`.
2. Les réglages de build sont lus dans `netlify.toml`, ne change rien. *Deploy*.
3. Dans *Site configuration → Environment variables*, ajoute :
   - `RESEND_API_KEY` = ta clé Resend
   - `GENA_FROM` = `Gena <alerte@ton-domaine>` (ou laisse vide pour les tests : `onboarding@resend.dev` sera utilisé)
4. Redéploie (*Deploys → Trigger deploy*) pour prendre en compte les variables.

## 4. Activer la notification du formulaire entreprises

1. *Site configuration → Forms* : vérifie que *Form detection* est activé (sinon active-le et redéploie).
2. *Forms → Form notifications → Add notification → Email notification* → adresse : **pau.allonas@gmail.com**, formulaire : `business-contact`.

Chaque demande d'entreprise arrive alors dans ta boîte, et reste aussi consultable dans l'onglet *Forms* de Netlify. (Gratuit : 100 soumissions/mois.)

## 5. Ce qui tourne automatiquement

- **/api/subscribe** : enregistre le profil (non confirmé) et envoie l'e-mail de confirmation — double opt-in RGPD.
- **/api/confirm** : active le profil quand la personne clique.
- **/api/unsubscribe** : supprime immédiatement le profil (lien présent dans chaque e-mail).
- **send-alerts** : s'exécute automatiquement **toutes les heures** (aucune configuration nécessaire, c'est dans le code). Pour chaque abonné confirmé, elle calcule le score vert à l'heure « maintenant + préavis choisi » et envoie l'alerte si le score ≥ 60, en respectant la fréquence choisie (max 1/jour, 1/semaine ou 1/mois).

Les profils sont stockés dans **Netlify Blobs** (inclus, rien à configurer). Tu peux les consulter via *Site configuration → Blobs* si besoin (droit d'accès RGPD).

## 6. Tests à faire après déploiement

1. Ouvre le site, saisis un code postal → les prévisions et le prix doivent s'afficher.
2. Inscris-toi aux alertes avec ta propre adresse → tu dois recevoir l'e-mail de confirmation → clique → bannière verte « Inscription confirmée » sur le site.
3. Envoie un message via le formulaire entreprises → il doit arriver sur pau.allonas@gmail.com.
4. Clique sur « Se désinscrire » dans un e-mail d'alerte → bannière « Vous êtes désinscrit·e ».

## 7. Avant l'ouverture au public (checklist RGPD)

- [ ] Compléter l'adresse postale dans `privacy.html` (obligatoire pour l'Impressum allemand, § 5 DDG — une adresse c/o de domiciliation est possible si tu ne veux pas publier ton adresse personnelle).
- [ ] Vérifier le domaine expéditeur dans Resend (sinon les e-mails d'alerte ne partiront pas vers les abonnés).
- [ ] Option recommandée : héberger les polices localement plutôt que via Google Fonts (jurisprudence allemande LG München 2022) — je peux le faire si tu veux.
