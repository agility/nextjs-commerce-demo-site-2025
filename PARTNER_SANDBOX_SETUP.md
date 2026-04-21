# Partner Sandbox Setup Plan

Step-by-step plan to stand up a clone of this demo site for a partner to use as a sandbox. Assumes the Agility CMS instance is already being cloned separately.

**Scope decisions for this sandbox:**
- ✅ Keep Stripe (checkout, webhooks, customer portal, magic-link auth)
- ❌ Skip AI search / Algolia (not configured, component can stay in code but will be inert)
- ✅ Keep PostHog, Resend, Vercel Blob, Azure OpenAI (or strip if partner doesn't need them — see Optional section)

---

## Prerequisites

Before starting, confirm you have:

- [ ] Partner's Agility CMS instance GUID + API keys (from the cloned instance)
- [ ] GitHub access to create a new repo (org + name decided)
- [ ] Vercel access to create a new project (team decided)
- [ ] Access to create a new Stripe test-mode account (or a dedicated sandbox account for the partner)
- [ ] Resend account + verified sending domain (or use `onboarding@resend.dev` for testing)
- [ ] PostHog project (optional — can reuse existing or create new)
- [ ] Domain name for the partner sandbox (optional — Vercel default is fine)

---

## Step 1 — Clone the repo to a new GitHub repository

1. Create a new **empty** GitHub repo (no README/license/gitignore) — e.g. `agility/partner-sandbox-<name>`.
2. From a clean working directory:
   ```bash
   git clone https://github.com/agility/democommerce2025.git partner-sandbox
   cd partner-sandbox
   git remote remove origin
   git remote add origin https://github.com/<org>/<new-repo>.git
   git branch -M main
   git push -u origin main
   ```
3. Optional cleanup before first push:
   - Update `package.json` `name` field from `"radiant"` to something partner-specific.
   - Update `README.md` title / acknowledgments if this will be partner-facing.
   - Confirm `.env.local` is **not** tracked (it's gitignored — double-check with `git ls-files | grep env`).

---

## Step 2 — Deploy to Vercel

1. In Vercel → **Add New Project** → import the new GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Build settings (defaults are correct, but verify):
   - Build command: `npm run build` (the `prebuild` script runs automatically)
   - Install command: `npm install`
   - Output directory: `.next`
4. **Do not deploy yet** — click through to environment variables first (Step 3), otherwise the first build will fail.

---

## Step 3 — Configure environment variables in Vercel

Set these in **Project Settings → Environment Variables** (apply to Production, Preview, Development as noted). A pre-filled template lives at [.env.example](.env.example) — use it as the copy-paste source both for Vercel and for the partner's local `.env.local`.

### Required — Agility CMS (from partner's cloned instance)

| Variable | Notes |
|---|---|
| `AGILITY_GUID` | From cloned instance's API Keys page |
| `AGILITY_API_FETCH_KEY` | Live fetch key |
| `AGILITY_API_PREVIEW_KEY` | Preview key |
| `AGILITY_SECURITY_KEY` | For preview mode + revalidation |
| `AGILITY_LOCALES` | e.g. `en-us` (partner probably doesn't need `fr`) |
| `AGILITY_SITEMAP` | Usually `website` |
| `AGILITY_FETCH_CACHE_DURATION` | `120` |
| `AGILITY_PATH_REVALIDATE_DURATION` | `10` |

### Required — Stripe (new sandbox account)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` from Stripe test mode |
| `STRIPE_SECRET_KEY` | `sk_test_...` from Stripe test mode |
| `STRIPE_WEBHOOK_SECRET` | Set **after** Step 6 (webhook creation) |
| `NEXT_PUBLIC_SITE_URL` | Vercel production URL, e.g. `https://partner-sandbox.vercel.app` |

### Required — Resend (magic-link auth)

| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | Create new API key in Resend |
| `RESEND_FROM_EMAIL` | Verified domain, or `onboarding@resend.dev` for testing |

### Required — Vercel Blob (used by ABTestHero / media uploads)

| Variable | Notes |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Create a new Blob store in Vercel → Storage, token auto-injected |

### Optional — PostHog analytics

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Can reuse existing project or create a new one |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |

### Optional — Azure OpenAI (only if partner wants the AI chat/agent features)

| Variable | Notes |
|---|---|
| `AZURE_AI_RESOURCE` | e.g. `agility-dev-ai` |
| `AZURE_AI_DEPLOYMENT` | e.g. `gpt-4o-mini` |
| `AZURE_AI_KEY` | Azure key |

### Set later (Step 6+)

| Variable | Notes |
|---|---|
| `BUILD_HOOK_URL` | Vercel deploy hook URL — created in Step 7 |

### Skipped for this sandbox

- `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_API_KEY` — **do not set**. Search is out of scope. The AI search modal and `/api/search` route will be inactive without keys; that's fine. If the partner wants them disabled in UI, remove the `AISearchModal` from the header (see Step 9).

---

## Step 4 — Trigger first deploy

1. Back in Vercel, click **Deploy**.
2. Watch the build log — first build should succeed once Agility + Stripe + Blob vars are set.
3. Note the production URL (e.g. `partner-sandbox.vercel.app`).
4. Go back and update `NEXT_PUBLIC_SITE_URL` to that URL, then redeploy.

---

## Step 5 — Point Agility CMS at the new deployment

In the partner's Agility instance:

1. **Domain Configuration** → add the Vercel URL as a valid domain.
2. **Preview URL** → set to the Vercel production URL (or a preview branch URL).
3. **Live URL** → set to the Vercel production URL.
4. Confirm preview mode works by clicking "Preview" on any page in the CMS.

---

## Step 6 — Configure Stripe webhooks

1. In Stripe Dashboard (test mode) → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<vercel-url>/api/webhooks/stripe`
3. Events to listen for (check [src/app/api/webhooks/stripe/route.ts](src/app/api/webhooks/stripe/route.ts) for the actual handled list — typical ones):
   - `checkout.session.completed`
   - `customer.created`
   - `customer.updated`
   - Any others referenced in the handler
4. Copy the **Signing secret** (`whsec_...`) → paste into Vercel env var `STRIPE_WEBHOOK_SECRET`.
5. Redeploy for the new env var to take effect.

---

## Step 7 — Set up Vercel build hook for Agility content changes

1. In Vercel → **Project Settings → Git → Deploy Hooks** → create a new hook for `main`.
2. Copy the URL → set as `BUILD_HOOK_URL` env var in Vercel.
3. In Agility CMS → **Settings → Webhooks** → add a webhook pointing at the same URL so publishes trigger rebuilds.

---

## Step 8 — Seed / verify Stripe products

The demo site expects products in Stripe that match product SKUs in Agility content. Either:
- **Easiest**: Use Stripe's product import or run any seed script the repo has (check `/node` or `/scripts` for a seed file).
- **Manual**: Create a handful of test products in Stripe matching the product IDs/SKUs in the cloned Agility content.

Verify by:
1. Browsing to a product page on the Vercel URL.
2. Adding to cart → checkout → completing a test purchase with card `4242 4242 4242 4242`.
3. Confirming the webhook fires (Stripe Dashboard → Webhooks → recent deliveries).
4. Visiting `/account`, entering the test customer email, and verifying the magic-link email arrives.

---

## Step 9 — Optional: remove search UI since it won't work

If the partner doesn't want a non-functional search button:
- Remove or hide `AISearchModal` usages in the header ([src/components/header/](src/components/header/)).
- Leaves the `/api/search` route dormant — harmless.

Alternatively, leave it and document that search is disabled for the sandbox.

---

## Step 10 — Smoke test checklist

After everything is wired up, click through:

- [ ] Homepage loads on Vercel URL
- [ ] Locale routing works (if `AGILITY_LOCALES` has more than one)
- [ ] CMS preview mode works (edit in Agility → see changes)
- [ ] Publishing a page in Agility triggers a Vercel rebuild
- [ ] Product listing and detail pages render
- [ ] Add to cart → checkout → Stripe hosted checkout loads
- [ ] Test payment (`4242 4242 4242 4242`) completes and redirects back
- [ ] Stripe webhook fires successfully (green check in Stripe dashboard)
- [ ] `/account` magic-link flow works end-to-end
- [ ] Stripe Customer Portal opens from account page

---

## Step 11 — Hand off to partner

Give the partner:
- GitHub repo URL + collaborator access
- Vercel project access (or transfer ownership if they're self-serving)
- Stripe test-mode keys + dashboard access
- Agility CMS login
- This document + a copy of `.env.local` (via a secure channel — not email)

---

## Known gotchas

- **`npm run prebuild` matters.** It rebuilds the redirect bloom filter cache. Vercel runs it automatically via the `prebuild` hook; local builds need it too.
- **Magic-link tokens are in-memory.** Tokens don't survive a server restart or a new Lambda invocation. Fine for a sandbox; document this if the partner asks. See [ACCOUNT_SETUP.md](./ACCOUNT_SETUP.md) for a Redis upgrade path.
- **`NEXT_PUBLIC_SITE_URL` must match the actual deploy URL** — Stripe redirects and magic-link URLs use it. Update it whenever the URL changes (custom domain, preview, etc.).
- **Don't commit `.env.local`.** Already gitignored; just don't force-add it.
