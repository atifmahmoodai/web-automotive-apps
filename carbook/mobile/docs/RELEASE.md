# Carbook mobile release runbook

For a clean-machine walkthrough, start with [BUILD_FROM_SCRATCH.md](BUILD_FROM_SCRATCH.md).

Status: source implementation; infrastructure and native acceptance pending. Read this with `VALIDATION.md`. A passing API test suite does not establish native app or app-store readiness.

## 1. Select the data deployment

The mobile Worker expects `DB` (D1) and `BUCKET` (R2). The website currently receives managed bindings from Sites; their identifiers and credentials are not exposed to this source delivery.

Choose one authorized deployment:

- **One community on web and mobile:** arrange authorized bindings to the same database and media bucket, or migrate both services to infrastructure you control under a reviewed migration plan. Preserve IDs, media keys, privacy settings and append-only migration history. Do not create a parallel database and call it synchronized.
- **Separate mobile pilot:** create a new D1 database and R2 bucket in your Cloudflare account. It starts empty, without the website's accounts or content. Website connection codes cannot work across unrelated databases.

Neither choice was provisioned by this delivery. Do not put a private Sites URL in `EXPO_PUBLIC_API_URL`, embed a Sites service bearer, forward spoofed visitor headers, or place a client secret in the app.

## 2. Configure OIDC

Use an identity provider that supports a **public native client**, authorization code flow, PKCE S256, refresh-token rotation/revocation, and RS256 JWT access tokens for a custom API.

1. Create a native/public application. Do not enable a client-secret-based exchange in the app.
2. Register `com.analysight.carbook://auth/callback` as its callback URL; verify the exact URI emitted by `AuthSession.makeRedirectUri` in the development build. Register any additional platform-required callback formats only after observing them.
3. Define the API audience and the `carbook` API scope. The app requests `openid profile email offline_access carbook`; authorize this combination for the native client.
4. Enable rotating refresh tokens and revocation. Choose short-lived access tokens; this API rejects tokens expiring more than 24 hours in the future.
5. Copy the exact issuer (including its trailing slash if it has one), API audience, public client ID and trusted JWKS URL to server configuration.
6. Ensure issued **access tokens** include `iss`, `aud`, `sub`, integer `iat`/`exp`, `scope` containing `carbook`, and the authorized native client in `azp` or `client_id`. An ID token is not an API credential.
7. Record the intended owner's exact provider subject in `OWNER_SUBJECT`. Keep `REGISTRATION_OPEN=false`; use comma-separated `ALLOWED_SUBJECTS` for a pilot. An arbitrary first login must never become owner.
8. Require stronger authentication for provider administrators/owner accounts and configure recovery in the provider. Carbook does not store or reset passwords itself.

If your provider uses a different access-token format, update and test the verifier for that explicit contract. Do not weaken issuer, audience, client, signature or scope checks to make a token pass. Never copy test signing keys to production.

## 3. Provision the mobile API

Configure `service/wrangler.jsonc` with your actual `database_name`, `database_id` and media `bucket_name`. Keep migrations immutable. For an existing shared database, verify its applied migrations before running anything.

The required server bindings/variables are listed in `service/.dev.vars.example`. Copy that file to `service/.dev.vars` for local development. Store production server variables through Cloudflare's authenticated environment/secret controls. Do not commit production credentials or provider subject allowlists.

From `mobile/`, with the authenticated Cloudflare CLI and project dependencies installed:

```sh
npm run api:build
npx wrangler d1 migrations list carbook-mobile --remote --config service/wrangler.jsonc
npx wrangler d1 migrations apply carbook-mobile --remote --config service/wrangler.jsonc
npm run api:deploy
```

Replace `carbook-mobile` with the exact configured database name. Apply migrations only after a backup/restore check and confirmation that this is the intended database. `api:deploy` is a manual infrastructure action; this repository does not run it during a website deployment.

`GET /health` reports whether the identity settings are present. An unauthenticated `/api/state` must return 401. Verify this on the deployed host, then test with real provider-issued access tokens. Verify an uninvited subject is denied, a pilot member remains a member, and the intended owner alone can bootstrap ownership in an empty community.

Keep `CORS_ORIGINS` empty for native-only clients. If an authenticated browser client is deliberately added, list only its exact approved HTTPS origins. CORS is not authentication; every data request still requires a valid access token.

### Premium (0.2.0) configuration

| Name | Where | Secret? | Purpose |
| --- | --- | --- | --- |
| `AI_API_KEY` | Worker secret (`wrangler secret put AI_API_KEY`) | **Yes** | Provider key for the car assistant. It is never sent to the app. |
| `AI_BASE_URL` | Worker var | No | OpenAI-compatible base URL, https only, e.g. `https://api.example.com/v1` |
| `AI_MODEL` | Worker var | No | Model name passed to `/chat/completions` |
| `EXPO_ACCESS_TOKEN` | Worker secret | **Yes** | Only if Enhanced Push Security is enabled on the EAS project |
| `PUSH_DISABLED` | Worker var | No | `true` stops remote push sends |
| `EAS_PROJECT_ID` | Build environment / `.env` | No | Required for remote push tokens. Currently **empty**: run `eas init` and set it. |
| `EXPO_PUBLIC_MAP_TILE_URL` | App `.env` | No (bundled) | Optional https raster tile template; defaults to OpenStreetMap |
| `EXPO_PUBLIC_GEOCODER_URL` | App `.env` | No (bundled) | Optional Nominatim-compatible base; `off` allows coordinates only |

If the assistant is left unconfigured, `/api/assistant` returns 503 and the app shows "Assistant not configured". Provider errors return a generic 502 without echoing provider bodies. Migration `0005_premium_native` adds `push_tokens`, `vehicle_records`, `listing_offers`, `event_checkins`, event `lat`/`lng` and `notifications.pushed`. It is append-only, and you apply it the same way as earlier migrations. For production traffic, use a tile provider whose terms allow it (the OSM community tile server is for light use) and respect the Nominatim usage policy.

The configured 15-minute scheduled trigger processes account erasure and also pushes recent unpushed notifications created on the website. Test it against non-production accounts, including failed object deletion and continuation across more than 100 objects. Monitor failed runs and deletion backlog. A request first hides the profile, then becomes eligible for erasure after seven days. Media deletion is bounded per run, so completion can take multiple runs.

## 4. Connect existing website profiles

This works only when the services actually share their authorized database and media storage.

1. Sign in to the website through its normal ChatGPT login.
2. Open Settings → Your account → Connect your mobile app.
3. Generate a five-minute code. It is secret, single-use and stored only as a hash on the server.
4. Sign in to the native app with the intended OIDC account. Enter the code in the connection card or Settings before creating content/relationships in a new native profile.
5. The verified native identity is then mapped to the website profile; it adopts that profile's existing permissions. A website code can admit that specific identity even when general native registration is closed.
6. Check profile, private posts, media and conversations from both clients. Confirm a second redemption is rejected.

The system does not guess account matches from email addresses. It will not automatically merge two populated profiles. An already connected website identity cannot be silently replaced with another website account. Empty native profiles replaced by linking are deactivated.

## 5. Configure the native app

Copy `.env.example` to `.env` and set all values. `EXPO_PUBLIC_*` values are bundled into the app and must be non-secret configuration. Use the real deployed mobile API origin and working support/privacy/terms URLs. The release checker loads a local `.env` when present.

The provisional bundle identifier, Android package and callback scheme are `com.analysight.carbook`. Confirm ownership and uniqueness before the first store upload. If changed, update `app.config.ts`, the callback in `src/core/auth.tsx`, deep-link generation/parser, provider redirect allowlist and tests together.

```sh
npm run setup
npx expo install --check
npm run doctor
npm run typecheck
npm run export
npm test
npm run api:typecheck
```

Commit the resolved dependency versions and mobile lockfile. Use `npm ci` for subsequent builds. Do not treat the bootstrap-only manifest as a locked, reproducible release.

Create/select the correct Expo EAS project with `npx eas-cli init`, set the returned UUID as `EAS_PROJECT_ID`, and configure matching development/preview/production environment values in EAS. Keep signing material in the platform's credential store. Never commit an Android keystore, Apple certificate, provisioning profile, refresh credential or access token.

```sh
node scripts/release-check.mjs --production
```

This must fail until configuration and resolved dependencies are present. It does not replace device acceptance or store-policy review.

## 6. Generate installable builds

Use the account authorized to own the app:

```sh
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform android --profile preview
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform ios --profile simulator
```

The Android preview profile produces an APK for internal testing. The iOS preview profile produces a signed internal IPA for devices included in its provisioning profile; register them before building. The iOS simulator profile is for the simulator, not physical iPhones. Physical iOS development/internal builds need the appropriate signing/provisioning and registered devices.

After acceptance:

```sh
npx eas-cli build --platform all --profile production
```

The Android production profile requests an AAB. Configure Apple Developer signing and App Store Connect for the iOS production build. Production profiles use remotely managed app version increments.

Use the authenticated EAS build dashboard to retrieve artifacts and record build IDs, source SHA, dependency lock hash, environment and release notes. No such build IDs/artifacts exist for this delivery.

## 7. Device acceptance gate

Run with at least two real test accounts on a physical iPhone and Android device, plus a small phone and a tablet/simulator:

- Cold start, successful/cancelled browser login, expired access token, refresh rotation/revocation, logout/relogin, owner and member separation.
- Website linking in a shared environment; expired/reused code; populated-profile refusal; linked account retains correct role.
- Feed refresh after posting, cursor pagination, comments/replies, reactions, polls, edit preservation, delete confirmation, drafts discarded only with consent.
- Photo/library permission granted/denied, large/unsupported video rejection, portrait photos, no audio/location permissions, authorized video playback/range seeking, invisible private media after blocking.
- Keyboard/scroll behavior, Android system Back, iOS swipe-back, deep links on cold/warm start, external Maps, large text and screen readers.
- Friendship requests, message privacy, attachments, repeated Send taps, a lost response/retry, read receipts, unsend, blocked-user behavior.
- Private community requests/approval/removal, event capacity and cancellation, listing status, page ownership.
- App background/foreground, airplane mode, poor connectivity, server errors and resume after token expiry. Test remote push on a physical device once `EAS_PROJECT_ID` is set: messages, reactions, comments, event updates and offers, plus a notification tap opening the right screen and the in-app preference switch suppressing pushes.
- Report/block/unblock, moderation permissions, data export to Files/share sheet and local temporary-file cleanup.
- Delete/cancel during the waiting period, deny cancellation after the deadline, cron completion, object removal and no deleted-account resurrection.
- Crash collection without bearer tokens or private content, infrastructure alerts, backups, restore drill and deletion backlog alerts.

Resolve all failures before TestFlight/Play internal testing, then repeat the critical journeys on their distributed builds.

## 8. Store release

Prepare real-device screenshots, support contact, privacy/terms pages, community standards, accurate data-collection disclosures, content/age ratings, review access and moderation operations. Complete the current store requirements for user-generated content and account deletion, including a working external deletion-request/support URL where required. Review the selected identity provider's sign-in options against Apple's current rules.

Remote push is implemented but unverified until an EAS project ID is configured and tested on a device. Do not advertise voice/video calling, end-to-end encrypted messaging, payments, subscriptions, universal web links or offline synchronization. Those services are not implemented/connected.

Apple App Store / Google Play submission and approval were not performed. An owner must complete any account, identity, fee or contractual steps using their own account. After approved binaries exist, submit through the official consoles or a correctly authorized EAS Submit configuration.
