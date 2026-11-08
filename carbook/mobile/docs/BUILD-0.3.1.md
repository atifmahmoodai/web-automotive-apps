# 0.3.1 verified build record

Built 8 November 2026 (PKT). Package com.analysight.carbook, versionCode 4, minSdk 24, targetSdk 36, compileSdk 37, arm64-v8a only.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| carbook-0.3.1-arm64.apk | 19037223 | 949d465f19f4bf64bfaa0d2e80194a99d3200e6421acdd7fc25537b14448d780 |
| carbook-0.3.1-release.aab | 29177089 | d89e3ae9c63db5edfee3aa1b00b33ea52e21d393851701ababdf8cc38568795b |

Local paths: `/workspace/carbook-apk/` with the filenames above. The AAB is kept local, not a public release asset. R8 mapping: `/workspace/carbook-apk/carbook-0.3.1-r8-mapping.txt` (keep for symbolication).

## Signing verification
- RSA-4096, CN=Carbook, 10,950-day self-signed Android upload certificate; NOT the Android Debug certificate.
- Certificate SHA-256 (both APK and AAB): `2e749ff9679aefa9cb9a40e2194fa9b1afa1932e9bcb71c5ecb408a14d39e40d`.
- APK `apksigner verify --verbose --print-certs`: passes, APK v2 scheme, one signer.
- AAB `jarsigner -verify -verbose`: jar verified. Expected untrusted/self-signed/no-timestamp warnings appear for this local upload certificate; Gradle's ZIP entry ordering also produces JarInputStream streaming-order warnings. This is not proof of a bad payload: all 1,231 payload entries were separately matched to their signed manifest SHA-256 digests, with no duplicates; do not describe this as a warning-free JAR check.
- Official bundletool 1.18.3 `validate --bundle=...`: exits 0. Every one of the 28 arm64 native libraries has ELF LOAD segment alignment of at least 16 KiB. This is a static compatibility check, not a 16 KiB-device runtime test or Play approval.
- Final packaged APK: camera hardware optional; no SYSTEM_ALERT_WINDOW, RECORD_AUDIO, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION or AD_ID permission. Android backup false; legacy native packaging true; release is not debuggable.

Private key: `/home/box/secrets/carbook/carbook-upload.jks`; env file: `/home/box/secrets/carbook/keystore.env`. Both mode 600, parent directory mode 700. They are NOT in git and no passwords are included in this record. Encrypted operator-controlled backup remains an operational prerequisite.

## Build recipe (on the box)
```sh
source /workspace/tools/env.sh
source /home/box/secrets/carbook/keystore.env
export PATH=/workspace/tools/node-v22.23.4-linux-x64/bin:$PATH
cd /workspace/web-automotive-apps/carbook/mobile
npx expo prebuild --platform android --no-install
cd android
./gradlew bundleRelease assembleRelease --max-workers=3 --no-daemon -Pkotlin.compiler.execution.strategy=in-process
```
The config plugin persists arm64/Hermes/R8/resource shrinking/legacy packaging, three workers and a 3 GiB heap. An initial build lost its Gradle daemon during severe shared-box memory contention; a retry succeeded after releasing only its own orphaned Kotlin compiler. Final permission-cleanup rebuild passed. No other agent's process was stopped.

## Validation evidence
`/workspace/carbook-apk/checks-0.3.1.log`: root Carbook tests, mobile typecheck, API typecheck, 34 core checks, RSA/JWKS checks, SQLite API/premium integrations (including a concurrent cross-offer race), release-config plugin tests and 29 native route import/syntax checks all pass.

`production-gate-0.3.1.log`: production readiness check intentionally fails for the eight missing API/OIDC/support/privacy/terms/EAS values. This remains an unconfigured preview. Build/signature evidence: `build-0.3.1-final.log`, `apk-signature-0.3.1.txt`, `aab-signature-0.3.1.txt`, `aab-certificate-0.3.1.txt`, `aab-integrity-0.3.1.json`, `bundletool-validation-0.3.1.txt`, `apk-badging-0.3.1.txt`.

Previous previews were debug-signed: uninstall them before installing this APK, exporting desired data first. A Play-distributed app may use a different Play App Signing certificate; upload-key-signed sideload installs may require another uninstall when switching to Play. No phone/emulator runtime launch is claimed.

## Publication status
Prepared locally only. The branch push and GitHub pre-release creation are not executed without explicit owner approval of this external publication. Proposed tag `carbook-mobile-v0.3.1-preview`, APK-only public asset; release text at `/workspace/carbook-apk/RELEASE-0.3.1.draft.md`. No new download URL is live.
