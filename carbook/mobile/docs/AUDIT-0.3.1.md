# 0.3.1 audit and store-preparation record

Prepared 8 November 2026 (PKT). Scope: mobile routes, auth/client/cache/notification helpers, mobile service endpoints, shared media/read/link services and account purge. This is a focused code/regression audit, not a penetration-test certification or complete production-readiness assertion.

## Fixed findings
1. **Concurrent offers, high integrity risk.** Previous optimistic locking applied only to one offer row. Two different buyers could both pass the listing precheck. The acceptance UPDATE now checks for an existing accepted offer in the same atomic SQL statement, and rechecks listing activity for accept/counter. A stale upsert cannot reopen an already accepted offer. Added a truly concurrent Promise.all API regression: one 200, one 409 and one accepted row.
2. **Incomplete data export.** Native logbook records, marketplace offers and check-ins were missing, as were several website activity categories. Added owner/participant-scoped export tables and isolation tests. No other member's logbook is included.
3. **Orphaned native account activity.** Website-link preconditions overlooked offers/check-ins/native records. Added these to the content guard and a regression that an existing check-in prevents relinking.
4. **Check-in pagination truth.** Total and checkedIn previously came from only 50 preview members. Separate access-filtered aggregate now gives a full visible total and correct own status. Regression covers 56 people and own entry outside the preview; blocked/suspended access filters remain intact.
5. **AI follow-up failure.** Replies could be 8,000 characters, while the next request allowed only 1,500 per history turn. Outgoing history is now bounded to 12 turns/1,500 characters without truncating the displayed reply. Unit regression preserves the original UI history.
6. **Malformed AI upstream result.** A non-string content field threw a TypeError. It now becomes a friendly 502 without leaking upstream content; integration test covers this shape.
7. **Blank record overwrite after load failure.** Failed/missing record fetches previously opened an empty editable form. Editor now remains blocked with retry/error until the requested record is present; stale load completions are ignored. Type/syntax checked; physical interaction test still required.
8. **Broken offline cache crash.** A cache containing only a user/profile could pass validation then crash routes reading missing arrays. Require every state collection before rendering an offline snapshot. Added partial-cache regression.
9. **Uncertain mutation misclassification.** HTML success or null/primitive/array JSON could look like a valid result or a definite failure despite possible commit. Reject non-object envelopes and preserve uncertain=true for invalid successful writes; regression verifies no replay.
10. **Notification privacy/error handling.** Explicit sign-out clears scheduled and already-presented local garage reminders that include private vehicle/document titles. Notification preference errors now produce a note rather than an unhandled rejection. SDK compile/syntax checks only; device behavior and permission denial still need manual validation.
11. **In-flight composition.** Message/assistant text is not editable while sending, avoiding a reply clearing text typed during the request; assistant reset and starter prompts are disabled while busy. Added explicit AI-provider transfer notice including owner notes. UI runtime validation remains pending.

12. **Unnecessary store permission/device filtering.** Removed the development overlay permission from release configuration and explicitly marked camera hardware optional. Added idempotent config-plugin tests for optional camera, persisted slim settings and environment-based signing. Final APK manifest is separately inspected.

## Validation
- Carbook root `npm test`: all eight integration scenario groups pass.
- Mobile `npm run typecheck`: pass.
- Worker `npm run api:typecheck`: pass.
- `node scripts/check.mjs`: 34 core checks, RSA/JWKS identity checks (28 invalid cases), real-SQLite mobile API/premium integrations and all 29 native route import/syntax graphs pass.
- Export/account-link/check-in/AI/concurrent-offer tests use real in-memory SQLite and signed RSA test sessions; AI and push transports are fake providers, not live services.
- No automated UI instrumentation, real-phone launch, production-provider integration, final screenshots or store review has been performed. Root-level `npm test` means the Carbook package root (`carbook/`), not the monorepo directory (which has no package.json).

## Signing and artifacts
Version 0.3.1 / versionCode 4, package com.analysight.carbook. Environment-based release signing consumes a new upload keystore stored outside git. Slim build: arm64-v8a, Hermes, R8, resource shrinking, legacy JNI packaging; three Gradle workers, 3 GiB heap. Store artifacts and certificate/hash evidence are in `/workspace/carbook-apk/` and BUILD-0.3.1.md after verification. The AAB is not a direct-install package and is not uploaded to Play.

## Known launch blockers / residual risks
- No live API/OIDC/legal/support URLs in app config; current preview cannot function as a public connected service. Must rebuild with real configuration after deployment/migrations.
- No real-device/R8/permission/media/notification/upgrade regression run. SDK deprecation warnings are not runtime acceptance evidence.
- Draft legal pages have placeholders and no operating external deletion channel; retained identity/audit/conversation metadata, logs/backups and processor records need justified expiry and reviewed deletion procedures. Last-owner deletion needs an assisted support path when no successor exists.
- Actual commercial operation needs legal operator identity, policies, moderation/child-safety/appeals staffing, safety contact, target audience/rating decisions and provider agreements. Sign-in shows terms notice; no versioned server acceptance ledger exists.
- AI provider key/model/contract and safety/reporting evaluation, Expo/EAS project/push credentials and production map-service capacity are not set up. No fake credentials were added.
- Play Console account/one-time US$25 fee, verification, reviewer access, any mandated closed testing, app signing enrollment and submission decisions belong to the operator. A digital monetization model/billing is not implemented.
