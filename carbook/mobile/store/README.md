# Carbook store-launch preparation (0.3.1 / Android build 4)

These are preparation assets, not a declaration that Carbook is production-ready or legally approved. No Play Console app or submission is created by this work.

- `icon-512.png`: 512×512 RGB PNG derived from the app icon, no alpha or added store shadow.
- `feature-1024x500.png`: 1024×500 RGB PNG, existing monogram/colors, no unlicensed new vehicle photograph.
- `LISTING.md`: title, short/full descriptions and honest feature limitations.
- `DATA_SAFETY.md`: code-derived disclosure worksheet, including optional providers, linkable retained data and missing external deletion intake.
- `CONTENT_RATING.md`: content questionnaire guidance and safety/target-audience gates, not an assigned rating.
- `legal/`: privacy, terms and account deletion in Markdown and self-contained static HTML. All prominently marked drafts. No form submits data; no third-party scripts/assets/cookies are loaded.

## Deploy the legal pages only after review
1. Replace every [PLACEHOLDER] with legally reviewed operator/contact/provider/retention details.
2. Implement and test the support/identity-verification process for external account deletion, including last-owner assisted deletion. A static placeholder page is NOT a functioning deletion channel.
3. Host `legal/*.html` on a controlled HTTPS site (GitHub Pages static output or the web app public directory/routes); check all relative links and access without authentication.
4. Put approved live URLs in EXPO_PUBLIC_PRIVACY_URL, EXPO_PUBLIC_TERMS_URL and EXPO_PUBLIC_SUPPORT_URL; enter the deletion-page URL in Play Console. Do not wire draft pages into the production app.
5. Review and finalize identity/hosting/AI/push subprocessors, contracts, cross-border transfers, retention/log/backups cleanup, moderation and safety operations.

## Signing and release continuity
A private RSA-4096 upload key is kept outside git at `/home/box/secrets/carbook/carbook-upload.jks`; its environment file is `/home/box/secrets/carbook/keystore.env` (both mode 600, directory 700). Do not commit, attach, publish or paste either file. Arrange an encrypted, access-controlled backup with the operator; the box is not a disaster-recovery plan. Build scripts consume CARBOOK_UPLOAD_* variables. Never log environment values or enable shell tracing when sourcing them.

With Play App Signing, enroll explicitly and understand the distinction between the upload certificate and Google-managed distribution certificate. A sideloaded APK signed with this upload key will not necessarily update to a Play-delivered app signed with a different app-signing key. Previous preview APKs used a DEBUG certificate, so uninstall those first before installing 0.3.1; export any wanted data before uninstalling (local app data/reminders are lost).

The AAB is a Play-format upload artifact, not a directly installable app and not “store approved”. This build targets arm64-v8a only, excluding 32-bit-only/x86 phones. Test coverage/device reach and decide final ABIs before submitting. Keep the AAB and R8 mapping private/local until upload is explicitly approved.

## Owner-dependent launch blockers
- Play Console developer account, US$25 one-time fee, identity/device verification, final package/brand ownership, and any required closed-test/production-access process.
- Deploy backend/D1 migrations/R2 with real domain, HTTPS, OIDC configuration and reviewer access. Current app config has no live API/sign-in URLs; rebuild after configuration.
- Approve operator/company identity, legal terms/privacy, retention periods, processor contracts, working support and external deletion route; operate moderation/child-safety and appeals.
- Choose/configure AI provider and credentials after data/safety review; choose Expo/EAS project and notification credentials for remote push. No invented keys.
- Physical-device testing (including R8/shrink behavior, permissions, offline/session recovery, deletion, media, notification icon, accessibility and upgrade/uninstall paths). No emulator/phone runtime verification is claimed.
- Monetization/business model and compliant billing (if selling digital access) remain undefined, not implemented.

Play account/deletion guidance verified 8 November 2026 (PKT):
https://support.google.com/googleplay/android-developer/answer/6112435?hl=en
https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
