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
