## 0.3.1 — store-preparation preview

- Fresh RSA-4096 upload-key signing, Android build 4, signed AAB and arm64 APK (not Play-published).
- Fix cross-offer concurrent acceptance at the atomic SQL write boundary; prevent a stale offer upsert from reopening an accepted offer.
- Include native garage records, offers and check-ins in personal exports; reject account linking that would orphan native activity.
- Correct check-in totals and own attendance beyond the 50-member preview.
- Bound AI history turns so long replies do not break follow-up questions, validate malformed provider responses, clarify data transfers and protect drafts during sends.
- Guard record editing after failed/missing loads with a retry screen rather than a blank editable form.
- Reject partial offline snapshots and malformed success responses; preserve uncertain-write semantics.
- Clear local garage reminders at explicit sign-out; handle notification-preference failures without unhandled promises.
- Add store artwork/listing/disclosure worksheets and draft privacy, terms and external-deletion pages.

Earlier debug-signed previews must be uninstalled before installing this upload-key-signed preview. Export wanted data first. This is not store approval or a configured production service.

## 0.3.0 — Production-hardening preview

- Added bounded retries for safe reads, request IDs, clearer server errors and one-time token refresh recovery; mutations are not replayed on network errors.
- Added expiring account snapshot caching and an offline banner with retry.
- Hardened session recovery, secure token cleanup and push deregistration; disabled Android backups.
- Added safe external links, optional scrubbed crash/analytics hooks, feed skeletons and accessibility roles; fixed chat reload behavior.
- Added API security headers, structured logs, consistent error codes, JSON body limits and rate-limit retry hints.
- Prevented competing accepted marketplace offers and added a per-member daily AI usage cap.
- Persisted slim Android release settings through Expo prebuild and added environment-based upload signing support.
- Bumped Android version to 0.3.0 / versionCode 3.

Validation: Carbook integration suite, mobile TypeScript, Worker TypeScript, 32 mobile core checks, identity verification, mobile API/premium integration and native import checks pass. Arm64 R8/Hermes release APK builds successfully.

Preview limitations: debug-signed sideload APK, not Play-ready. Emulator startup failed because the box user has no /dev/kvm access; no device launch or logcat crash test was completed. Live backend/OIDC, push project, AI provider, production policies/operations and real-device acceptance remain launch gates.
