# Validation record — 2 November 2026 (0.2.0 premium)

| Check | Result and scope |
| --- | --- |
| Mobile pure core | 25 checks passed, including the new VIN check digit/vPIC parsing, fuel economy, expense totals, due ranking, reminder plan, strict dates, tile/geocoder URL safety, Mercator round trip, directions URLs, coordinates, notification route allow-list and offer amounts |
| Premium API | Passed against real migrations through 0005 with signed tokens. Covers push registration, fan-out, preferences, generic DM text, dead-token pruning and the cron sweep; owner-only garage records and private media; offers/counter-offers with blocks; Carbook-only price insight; organizer-only pins and check-in windows; event update notifications; the server-side assistant (503 when unconfigured, no provider key or body leakage); and deletion purge |
| Mobile TypeScript | `npm run typecheck` passed with the installed Expo SDK 58 / React Native types |
| Website integration suite and TypeScript | Passed |
| Android release APK | Built locally with `expo prebuild` + `assembleRelease`, signed with the **debug keystore** (sideload testing only) |
| Device runtime | **Not verified:** dark mode rendering, map gestures, notifications/reminders, directions handoff, image pickers, onboarding and assistant UI have not been run on a phone or emulator |
| Remote push delivery | **Not verified:** `EAS_PROJECT_ID` is empty, so no Expo push token can be issued |
| AI provider | **Not verified live:** tested only against a stubbed OpenAI-compatible endpoint |

# Validation record — 24 October 2026

This record distinguishes executed checks from work that could not run. It is not a production certification.

| Check | Result and scope |
| --- | --- |
| Website production bundle | Vinext build passed with the mobile-link route and shared services |
| Current browser visual check | Not completed: preview connection failed and the resulting browser error page could not be observed under browser policy |
| Website TypeScript | Passed `npm run typecheck` after shared-service and linking changes |
| Existing website API suite | Passed real handlers against migrated SQLite; privacy, media, messaging, groups, events, moderation, exports and account lifecycle |
| Website connection-code route | Passed authentication, same-origin and short-lived code-generation checks |
| Mobile pure core | 11 checks passed: media host restrictions, bearer handling, mutation uncertainty/no replay, JSON/error behavior, timeouts, secure-store rotation/cleanup, corrupt manifest, feed merge, deep links, date validation and configuration |
| Native identity verifier | Valid RSA access tokens accepted; JWKS cached; issuer identities isolated; 28 forged/malformed/invalid-claim/header cases rejected |
| Mobile API | Passed actual handlers with signed RSA tokens and SQLite loaded from every migration; closed registration, explicit ownership, CORS, private posts/groups/media, one-time linking, populated-account refusal, message deduplication, deletion cancellation/purge/tombstones and ownership transfer |
| Mobile API TypeScript | Passed using the actual installed backend dependency types, not native stubs |
| Mobile Worker bundle | esbuild succeeded with Cloudflare runtime imports externalized |
| Native source syntax/import graph | Passed for 23 routes and their local imports; external SDK modules treated as external |
| Native raw text check | No unwrapped JSX text found outside Text/Label carriers |
| Production native preflight | Correctly refused missing API/OIDC/policy/EAS configuration and missing resolved native dependencies/lockfile |
| Expo/React Native install | Blocked: npm registry request returned HTTP 403 in this environment |
| Full native TypeScript / Expo Doctor / Metro export | Not run: Expo/native SDK dependencies unavailable |
| Android/iOS emulator or physical device | Not run: native SDKs/toolchains unavailable |
| Signed APK/AAB/IPA | Not generated |
| Live OIDC and mobile API | Not provisioned or integration-tested against a real provider/deployment |
| TestFlight / Google Play | Not submitted |
| Public load/security review | Not performed |

The API tests use the real application code and migrations. They replace only the platform identity/JWKS transport, D1 adapter and object-storage boundary with controlled fixtures; they never write test data into the deployed site. These tests do not prove cloud network behavior, object-storage durability, native module compatibility or UI behavior on devices.

The syntax check is deliberately labeled narrowly. It can catch malformed JSX and missing local imports, but cannot validate the Expo/React Native API types, platform permissions, native linking, authentication callback handling, playback, keyboard layout or accessibility runtime. Complete the physical-device gate in `RELEASE.md` before distributing a production build.
