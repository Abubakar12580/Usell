# Usell — Preloved Fashion Marketplace

Usell is a complete, responsive marketplace for buying and selling preloved clothes, shoes, bags, traditional wear and accessories. Its original black-and-white visual system takes structural inspiration from Zero Lifestyle: announcement bar, clean navigation, animated hero, category stories, product collections, editorial grids and a detailed footer.

## Included systems

- **Accounts:** registration, login, persistent 30-day sessions, profile settings and bcrypt password hashes.
- **Listings:** 1–5 real image uploads (6 MB each), listing details, live preview, public pages, mark sold, relist and remove.
- **Permanent public storage:** PostgreSQL for marketplace data and Cloudinary for uploaded photos.
- **Discovery:** predictive search, item/brand/colour/city/size/condition search, filters, price range, sorting and deep-linked URLs.
- **Buyer tools:** favourites, public seller profiles, sharing and similar products.
- **Messaging:** persistent buyer–seller conversations, unread counts, listing context and on-site replies.
- **Support assistant:** Usell-scoped answers with quick actions. The built-in guide works without an AI key; OpenAI is optional.
- **Admin analytics:** user/listing/view/favourite/message metrics, seven-day activity, category mix and improvement recommendations.
- **WhatsApp reports:** generate, copy or open a report in WhatsApp. Automatic Meta Cloud API delivery is also implemented.
- **Content:** help centre, safety guide, contact, about, terms, privacy and newsletter signup.
- **Experience:** responsive navigation, animated sliders, scroll reveals, drawers, modals, toasts and reduced-motion support.

## Architecture

One Express process serves the built React application and `/api` routes.

| Environment | Application data | Uploaded photos |
| --- | --- | --- |
| Local demo | `server/data/db.json` | `public/uploads/` |
| Real public launch | External PostgreSQL (`DATABASE_URL`) | Cloudinary |

**Public mode refuses to start without PostgreSQL and Cloudinary.** This prevents a hosting provider’s temporary filesystem from silently losing customer accounts, messages or images. The included Render configuration uses one free web service and does not need a paid persistent disk.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Local demo mode needs no external account or API key.

### Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Buyer / seller | `demo@usell.app` | `demo123` |
| Administrator | `admin@usell.app` | `admin123` |

Seeded people and listings are demonstration content in local mode. A new public database starts with only the admin account; fictional sellers and listings are not included unless `SEED_SAMPLE_DATA=true` is explicitly set.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

The app listens on `0.0.0.0:$PORT` (default `5173` outside Docker, `10000` in the supplied container).

# Final free public launch

The intended stack is:

- **Render Free Web Service** — website and API
- **Neon PostgreSQL Free plan** — durable accounts, listings, messages and analytics
- **Cloudinary Free plan** — permanent uploaded images

Free-tier quotas and fair-use limits still apply. Render Free web services spin down after 15 minutes without traffic and can take about a minute to wake; this does **not** erase Neon or Cloudinary data. See [Render’s free-instance documentation](https://render.com/docs/free).

## 1. Put this updated source on GitHub

The repository root must contain `package.json`, `Dockerfile`, `render.yaml`, `server/`, `src/` and `public/`.

If the repository is already connected locally:

```bash
git add .
git commit -m "Add durable production storage and Render launch"
git push
```

Do not commit `.env`, real credentials, runtime databases or uploaded customer photos. The supplied ignore files exclude them.

## 2. Create the free Neon database

1. Sign in at [Neon](https://neon.tech/) and create a new project on the Free plan.
2. Choose a region reasonably close to your Render service and Pakistani users.
3. In the Neon Console, click **Connect**.
4. Copy the full connection string. It normally resembles:

```text
postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require&channel_binding=require
```

5. Keep this string private. It becomes Render’s `DATABASE_URL`.

No manual SQL is required. On first startup Usell creates its tables and initialises the admin account. See [Neon’s connection-string guide](https://neon.com/docs/connect/connect-from-any-app).

## 3. Create the free Cloudinary image store

1. Sign in at [Cloudinary](https://cloudinary.com/) and create/use a Free product environment.
2. Open **Console → Settings → API Keys**.
3. Copy the **Cloud name**, **API Key** and **API Secret**.
4. Keep the API secret private; it must exist only in Render’s server environment, never in React code or GitHub.

See [Cloudinary’s credential guide](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials).

## 4. Deploy with the included Render Blueprint

1. Sign in at [Render](https://render.com/) with GitHub.
2. Choose **New → Blueprint** and select the Usell repository.
3. Render detects the included `render.yaml`. Choose the **Free** web service plan.
4. When prompted, enter these secret values:

| Prompt | Value to enter |
| --- | --- |
| `ADMIN_PASSWORD` | A unique password of at least 12 characters for `admin@usell.app` |
| `DATABASE_URL` | The complete Neon connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

The Blueprint automatically generates a strong `JWT_SECRET`, selects public mode, disables sample marketplace content, sets the WhatsApp recipient and configures `/api/health` as the health check.

5. Click **Apply / Create** and wait for the Docker build and first deploy.
6. Do **not** add a Render persistent disk; durable data is external.

If using **New → Web Service** instead of Blueprint, select the same repository, **Docker** runtime and **Free** plan, set health check path `/api/health`, and add every variable shown in `render.yaml` manually. Render supplies the Docker build; no separate frontend service is needed.

## 5. Verify the real launch

Open:

```text
https://YOUR-SERVICE.onrender.com/api/health
```

A correct public response includes:

```json
{
  "ok": true,
  "database": "postgres",
  "imageStorage": "cloudinary"
}
```

Then:

1. Open the site and register a new account.
2. Publish one real listing with a photo.
3. Sign in at `/auth` as `admin@usell.app` using your chosen `ADMIN_PASSWORD`.
4. Open **Admin analytics** and confirm the new account/listing appears.
5. In Render, use **Manual Deploy → Restart** or redeploy, then confirm the account, listing, photo and messages still work.
6. Keep the admin password secure. `ADMIN_PASSWORD` initialises the admin only when a new empty database is created; changing the variable later does not rewrite an existing password.

Future GitHub updates and Render restarts reuse the same Neon database and Cloudinary environment. Customer data is not reset by a redeploy.

## Environment reference

For local setup, run `cp .env.example .env` and edit it. In hosting, use the platform’s encrypted environment settings instead.

| Variable | Purpose |
| --- | --- |
| `PORT` | Web server port. Render Blueprint sets `10000`. |
| `DEMO_MODE` | `true` for local showcase; must be `false` for the real launch. |
| `DATABASE_URL` | **Required in public mode.** PostgreSQL/Neon connection string. |
| `CLOUDINARY_CLOUD_NAME` | **Required in public mode.** Cloudinary environment name. |
| `CLOUDINARY_API_KEY` | **Required in public mode.** Server-side Cloudinary key. |
| `CLOUDINARY_API_SECRET` | **Required in public mode.** Server-side Cloudinary secret. |
| `CLOUDINARY_FOLDER` | Upload folder; defaults to `usell/listings`. |
| `JWT_SECRET` | Login-session signing secret; at least 32 characters in public mode. |
| `ADMIN_PASSWORD` | Initial admin password for a new public database; at least 12 characters. |
| `SEED_SAMPLE_DATA` | Optional. `true` adds sample catalogue content on first database initialisation. |
| `USELL_DB_PATH` | Optional alternate JSON path for local/demo mode only. |
| `USELL_UPLOAD_DIR` | Optional temporary/local upload directory. Cloudinary uploads remove temp files. |
| `PGSSL` | Set `disable` only for a local PostgreSQL server that does not use SSL. |
| `ADMIN_WHATSAPP` | Report recipient; defaults to `+923347323999`. |
| `OPENAI_API_KEY` | Optional LLM answers inside the strict Usell support scope. |
| `OPENAI_MODEL` | Optional model name; defaults to `gpt-4o-mini`. |
| `WHATSAPP_ACCESS_TOKEN` | Optional Meta WhatsApp Cloud API access token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta sender phone-number ID—not the visible phone number. |
| `WHATSAPP_REPORT_TEMPLATE` | Optional approved template for reports outside a support session. |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Template language code; defaults to `en`. |

## WhatsApp analytics reports

The configured recipient is **+92 334 7323999**.

Without Meta credentials, the admin can still generate the full analytics/improvement report, copy it, or open it in WhatsApp for manual sending. The interface does not claim automatic delivery when it did not occur.

For automatic delivery:

1. In Meta for Developers, create/open an app with **WhatsApp Cloud API** access.
2. Add and verify the recipient during Meta’s test setup.
3. Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in Render, then redeploy.
4. Sign in as admin, open **Admin analytics**, and click **WhatsApp report**.

Free-form Cloud API messages follow WhatsApp’s 24-hour customer-service-window rules. For reports outside that window, create an approved utility template with one body variable:

```text
Your latest Usell marketplace report is ready:

{{1}}
```

Set its name as `WHATSAPP_REPORT_TEMPLATE`. Meta controls approval, category, pricing and messaging rules.

## Data, backups and scaling

- Public marketplace records are stored in PostgreSQL JSONB tables and writes use transactions.
- Uploaded public photos live in Cloudinary; temporary upload files are removed after processing.
- The app retains the latest 5,000 analytics events while keeping core accounts/listings/messages.
- Keep the current deployment at **one web instance**. Its in-memory read model and serialised snapshot writes are designed for a single application process.
- Use Neon’s backup/restore facilities and periodically test recovery. Keep a separate Cloudinary backup strategy for irreplaceable images.
- If traffic outgrows the free tiers or requires multiple instances, move to query-level PostgreSQL repositories, managed backups, monitoring and paid compute before scaling horizontally.

## Reset only the local demo

Stop the local server, delete `server/data/db.json` and the files in `public/uploads/`, then restart. This does not affect Neon or Cloudinary. Do not use local reset steps as a production backup strategy.

## Verification

```bash
npm run build
node scripts/browser-smoke.mjs
```

The browser smoke test expects the local demo server on port `5173` and Playwright Chromium (`npx playwright install chromium`). It covers homepage rendering, predictive search, filters, product details, login, the complete photo-publish flow, support, mobile navigation and admin report generation.

A separate integration test uses **real PostgreSQL** and an isolated Cloudinary API simulator:

```bash
npm run build
TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST/EMPTY_TEST_DATABASE' node scripts/postgres-smoke.mjs
```

Use only a new, disposable test database. The test covers public-mode startup, clean seeding, admin/demo-access rules, registration, multipart image upload, listing creation, favourites, chat, support, contact/newsletter, analytics, restart persistence and Cloudinary cleanup.

## Image sources

Local demo imagery was sourced from Unsplash and Pexels image results. Public mode starts without fictional sample listings; real sellers provide their own item photos.
