# Usell — Preloved Fashion Marketplace

A complete, responsive marketplace for buying and selling preloved clothes, shoes, bags, traditional wear and accessories. The visual system is inspired by Zero Lifestyle’s storefront structure—scrolling announcement bar, clean navigation, large rounded hero slider, category stories, four-column product collections, editorial grids and a detailed footer—adapted with original Usell branding and marketplace content.

## Included systems

- **Accounts:** register, sign in, persistent 30-day sessions, profile settings and secure bcrypt password hashes.
- **Listings:** 1–5 real image uploads (6 MB each), listing details, live preview, public listing pages, mark sold, relist and remove.
- **Discovery:** predictive search, item/brand/colour/city/size/condition search, category filters, price range, sorting and deep-linked URLs.
- **Buyer tools:** favourites, public seller profiles, item sharing and similar products.
- **Messaging:** persistent buyer–seller conversations, unread counts, listing context and on-site replies.
- **Support assistant:** marketplace-scoped answers with quick actions. It uses an offline Usell knowledge guide by default and can use OpenAI when configured.
- **Admin analytics:** user/listing/view/favourite/message metrics, seven-day activity chart, category mix, recent activity and data-driven improvement recommendations.
- **WhatsApp reports:** generate, copy or open a report in WhatsApp immediately. Automatic Meta Cloud API delivery is implemented for session messages and approved templates.
- **Content:** help centre, safety guide, contact form, about, terms, privacy and newsletter signup.
- **Experience:** responsive mobile navigation, animated sliders, scroll reveals, hover motion, drawers, modals, toasts, loading states and reduced-motion support.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The same Express process serves the React app through Vite middleware and the `/api` routes.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Buyer / seller | `demo@usell.app` | `demo123` |
| Administrator | `admin@usell.app` | `admin123` |

The seeded people and listings are demonstration content. New registrations, uploads, messages and other live activity are stored alongside that data.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Set a strong `JWT_SECRET` in production. The app listens on `0.0.0.0:$PORT` (default `5173`).

## Environment configuration

For local setup, run `cp .env.example .env` and edit the values; the server loads `.env` automatically. In a hosted deployment, add the same values through the platform’s environment-variable settings. The app does not require a third-party key for its core marketplace or local support guide.

| Variable | Purpose |
| --- | --- |
| `PORT` | Web server port; defaults to `5173`. |
| `JWT_SECRET` | Secret used to sign login sessions. Required to change for production. |
| `USELL_DB_PATH` | Optional alternate JSON database path. |
| `ADMIN_WHATSAPP` | Report recipient. Defaults to the owner-provided `+923347323999`. |
| `OPENAI_API_KEY` | Optional. Enables LLM answers inside the strict Usell support scope. |
| `OPENAI_MODEL` | Optional model name; defaults to `gpt-4o-mini`. |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API sender phone-number ID—not the visible phone number. |
| `WHATSAPP_REPORT_TEMPLATE` | Optional approved template name for reports outside a 24-hour support session. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language code; defaults to `en`. |

## Connect WhatsApp analytics reports

1. In Meta for Developers, create or open an app with **WhatsApp Cloud API** access.
2. Add/verify the recipient number during Meta’s test setup. The configured recipient is already set to **+92 334 7323999**.
3. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` on the server and restart it.
4. Sign in with the admin demo account, open **Admin analytics**, and click **WhatsApp report**.
5. Without credentials, the same button still generates the report and offers **Copy report** and **Open in WhatsApp** for a manual send. The UI never claims that a message was delivered when it was not.

### Approved template delivery

Free-form Cloud API messages follow WhatsApp’s 24-hour customer-service-window rules. For reports outside that window, create an approved utility template with one body variable, for example:

```text
Your latest Usell marketplace report is ready:

{{1}}
```

Set its name as `WHATSAPP_REPORT_TEMPLATE`. Usell will send the generated report through that template instead of a session message. Meta approval, template category, pricing and messaging rules are controlled by Meta.

## Data and uploads

- Runtime data: `server/data/db.json` (created from `server/seed.js` on first run).
- Uploaded images: `public/uploads/`.
- Seed/demo images: `public/images/`.
- To reset the demo completely, stop the server, delete `server/data/db.json` and the files in `public/uploads/`, then restart.

The JSON store is ideal for this single-process demonstration. For a multi-instance public launch, migrate the same API layer to PostgreSQL and object storage, and add managed backups, rate limiting, email verification, abuse moderation and production monitoring.

## Put it online with Railway

A single Railway service can run the frontend, API and image serving. Attach a volume so registrations, messages and uploads survive redeploys. Keep the service at **one replica** while using the JSON datastore.

### 1. Push this project to GitHub

Create an empty GitHub repository named `usell`, then run these commands from the project folder (replace the repository URL):

```bash
git init
git add .
git commit -m "Launch Usell"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/usell.git
git push -u origin main
```

The `.gitignore` excludes secrets, dependencies, the built app and runtime account data. The included `Dockerfile` lets Railway build everything from source.

### 2. Create the Railway service

1. Sign in at [railway.com](https://railway.com/) with GitHub.
2. Choose **New Project → Deploy from GitHub Repo** and select `usell`.
3. Railway should detect the included `Dockerfile` automatically. No separate frontend service is needed.
4. In the service, open **Variables** and add:

```text
NODE_ENV=production
DEMO_MODE=false
JWT_SECRET=PASTE_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
ADMIN_PASSWORD=CREATE_A_UNIQUE_ADMIN_PASSWORD_AT_LEAST_12_CHARACTERS
USELL_DB_PATH=/data/db.json
USELL_UPLOAD_DIR=/data/uploads
ADMIN_WHATSAPP=+923347323999
```

5. Add a **Volume** to the service with mount path **`/data`**.
6. Redeploy after adding the variables and volume. On the first start with the empty volume, Usell creates the admin account using your `ADMIN_PASSWORD`; the public demo buttons stay hidden and the sample community passwords are locked.
7. Open **Settings → Networking → Generate Domain**. Railway gives you an HTTPS address such as `your-app.up.railway.app`.

Sign in at `/auth` with `admin@usell.app` and the admin password you chose. A volume/persistent service may require a paid hosting plan; free ephemeral hosting is not suitable for real account and image data.

### 3. Optional domain, AI and WhatsApp

- **Custom domain:** buy a domain, add it under Railway’s Networking/Custom Domain settings, then create the DNS record shown by Railway at your domain provider.
- **AI support:** add `OPENAI_API_KEY`; without it, the built-in Usell support guide continues working.
- **WhatsApp:** add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. Add `WHATSAPP_REPORT_TEMPLATE` as well if you use an approved template.
- **Updates:** push changes to the same GitHub branch and Railway can redeploy them. Keep the volume attached.

Do not publish your real `.env` file or WhatsApp/OpenAI secrets in GitHub. Set them only in Railway’s encrypted variables.

## Verification

```bash
npm run build
node scripts/browser-smoke.mjs
```

The browser smoke script expects the development server on port 5173 and Playwright Chromium installed (`npx playwright install chromium`). It covers homepage rendering, predictive search, filters, product details, demo login, the complete photo-upload/publish flow, support chat, mobile navigation and admin report generation.

## Image sources

The local demo imagery was downloaded from Unsplash and Pexels image results. Replace demo listings with real user uploads for a production marketplace.
