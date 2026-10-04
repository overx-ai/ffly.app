# 001 - Deployment

How `ffly.app` goes live. Mirrors `tryrefresher.app`: Vercel builds from GitHub on every push,
the domain stays on **Namecheap BasicDNS**, the apex is primary and `www` redirects to it.

**Status (2026-10-04): not deployed.** GitHub repo `overx-ai/ffly.app` (private) holds `main`; no Vercel project yet, DNS untouched.
`ffly.app` still resolves to Namecheap parking (`162.255.119.203`).

## 1. GitHub
- Done 2026-10-04: `overx-ai/ffly.app`, private (refresher is `overx-ai/tryRefresher.app`, public), created with
  `git remote add origin git@github.com:overx-ai/ffly.app.git && git push -u origin main`.

## 2. Vercel project
- Vercel, Add New Project, import `overx-ai/ffly.app`. Framework preset **Astro** is detected:
  build `astro build`, output `dist`, no adapter, **no environment variables**
  (`astro.config.mjs` defaults `site` to `https://ffly.app`). Production branch `main`.
- `vercel.json` supplies `cleanUrls` and `trailingSlash: false`, so `/support/` 308s to `/support`
  and `dist/404.html` serves unknown paths.
- Settings, Domains: add `ffly.app` and `www.ffly.app`; make **`ffly.app` primary** so `www`
  308s to the apex, matching the apex canonicals. (tryrefresher.app: `www` 308 to apex, verified
  2026-10-03.)

## 3. Namecheap DNS
Domain List, Manage `ffly.app`, **Advanced DNS**. Keep Nameservers on Namecheap BasicDNS.
Delete the parking records first (`CNAME www -> parkingpage.namecheap.com`, `URL Redirect @`).
Leave the existing `TXT @ v=spf1 include:spf.efwd.registrar-servers.com ~all` (Namecheap email
forwarding) unless you decide to drop forwarding. Then add the values Vercel's Domains page shows. On tryrefresher.app they are:

| Type | Host | Value |
|---|---|---|
| A | `@` | `216.198.79.1` |
| CNAME | `www` | the project-specific `<hash>.vercel-dns-017.com.` Vercel displays |

Vercel's legacy values (`A @ 76.76.21.21`, `CNAME www cname.vercel-dns.com`, used by vocele.app)
also work. Copy whatever the Domains page shows for this project. No MX records are needed:
the site's contact address is `support@overx.ai`.

## 4. Go-live checks
```bash
dig +short ffly.app A                    # Vercel IP, not 162.255.119.203
curl -sI https://www.ffly.app | head -3  # 308 -> https://ffly.app/
for u in / /support /privacy /terms; do curl -s -o /dev/null -w "%{http_code} $u\n" https://ffly.app$u; done  # 200 each
curl -sI https://ffly.app/support/ | head -3  # 308 -> /support
```

## 5. After it is live
- The app already links `https://ffly.app/terms` and `/privacy` (`LegalLinks.swift`), and the
  App Store metadata already lists `ffly.app`, `/support`, `/privacy`. Those links 404 until this
  deploy lands, so it must precede App Review.
- `ios-ffly/docs/compliance/data-inventory.yaml` `policy_urls` already name `ffly.app`, but its
  header comment and the app's CLAUDE.md still mention `overx.ai/ffly/privacy`.
- Set `APP_STORE_ID` in `src/app.ts` once App Store Connect has the record, and consider adding
  a `/download` redirect to `vercel.json` as the siblings do.
- Google Search Console: Domain property `ffly.app` via a TXT record on `@`, then submit
  `sitemap.xml`.
