# LIUKER phase-one media hardening

Scope: the existing Vercel project `liuker.space`, project ID
`prj_XWNtIdFAnwMNvFETqusWiPfQUFqw`. No visual redesign, authentication wall on
the public portfolio, new paid service, or source-media migration.

## Controls

- `middleware.ts` filters `/media/` before serving the current deployment's
  static files: known automated clients, foreign Origin/Referer, cross-site
  requests, and direct video URLs without playback context receive 403.
- `app/security/media-policy.ts` intentionally permits full hero preloads,
  byte-range seeking, browser requests with same-origin Fetch Metadata, and
  older Safari with a valid Referer. Loopback normalization is local-only.
- `next.config.ts` adds nosniff, SAMEORIGIN frame restrictions, a strict-origin
  referrer policy, disabled unused browser permissions, and a **baseline** CSP
  (`base-uri`, `object-src`, `frame-ancestors`, `form-action`). It is not a
  nonce-based script CSP. Media also receives same-origin CORP and noindex.
- `public/robots.txt` asks compliant crawlers not to index media and asks listed
  AI crawlers not to crawl the site. Ordinary portfolio pages remain indexable.
- Main video controls hide the download menu where supported. This is a UI
  courtesy, not an access-control measure.
- Home share metadata uses the canonical production origin rather than trusting
  forwarded host headers.
- Next.js and its ESLint configuration are updated to 16.3.3. The production
  dependency audit was zero known advisories on 2026-08-31. Development/build
  dependencies still have advisories and need a separately tested tooling update;
  this is not a claim that every package or every possible vulnerability is fixed.

## Vercel edge rules

The three definitions in `firewall/` match the project-level rules applied on
2026-08-31, active configuration version 3. They cover cached media and previous
deployments within this project as well as the main domain:

1. `rule_liuker_block_automated_media_clients_T882bm`: deny listed automated UAs.
2. `rule_liuker_block_media_hotlinks_and_direct_video_oReaWL`: deny cross-site
   embedding and video requests lacking playback context.
3. `rule_liuker_limit_abnormal_media_bursts_zqNf2r`: 600 media requests per IP per
   60-second fixed window **per Vercel region**, then HTTP 429. A generous limit
   avoids penalizing ordinary preload/seek requests and shared networks.

Hobby includes three custom rules, one rate-limit rule, and 1,000,000 allowed
rate-limit requests. No plan change was made. The limit is request-based, not a
bandwidth cap or guaranteed protection from slow/distributed scraping. Do not
load-test production to hit the threshold just to verify it.

Before changing rules, read the active config and any existing draft. Use
`vercel firewall rules edit` and `vercel firewall diff` to stage/review changes,
then publish only the intended draft. Do not insert duplicate rules. Important:
the Vercel API's PATCH `/v1/security/firewall/config` applies immediately;
the CLI uses the `/draft` endpoint for staging. Never discard another operator's
draft or disable the project firewall to fix one false positive.

If playback is affected, identify the matching rule, narrow that rule, and
retest normal playback and seeking. Keep the other protections enabled.

## Verification

With a Next production build running on `127.0.0.1:3020`:

```sh
node --test tests/media-security.test.mjs tests/media-security-http.test.mjs
```

Set `PORTFOLIO_TEST_ORIGIN` for another test origin. HTTP tests verify headers,
403 denials, 206 video responses, normal full-preload HEAD requests, robots,
and stable share metadata. Successful video probes read only 1 KB each.
Existing editorial-page and motion-geometry tests must also remain green.
Next/webpack and vinext builds are both required; the production target of this
change is Vercel, not a republish of the separate Sites mirror.

Browser checks must cover Loading exiting, paused scroll-controlled hero,
click-only Showreel playback, closing it, and lazy project playback. No stress
test, bulk download, or attempt to harvest the portfolio is needed.

## Remaining boundaries

These filters are **not authentication, DRM, or a guarantee against copying**.
A client can forge browser headers, use a real browser, capture network traffic,
or record the screen. Public link-preview images remain accessible; robots.txt
is voluntary. Enforced private storage with short-lived, authorized playback
URLs plus watermarked delivery is a separate, larger phase.

The GitHub repository was public at the audit. Private-repository conversion
and Vercel authentication for historical preview/deployment URLs are pending
owner confirmation because they change existing sharing/access behavior.
Changing visibility later cannot recall copies already made from public URLs.

References:
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration
- https://vercel.com/docs/bot-management
