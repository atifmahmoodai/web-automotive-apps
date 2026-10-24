# Carbook: build from scratch, step by step

Updated 25 October 2026. This is the developer handover for the Carbook source in [`atifmahmoodai/web-automotive-apps/carbook`](https://github.com/atifmahmoodai/web-automotive-apps/tree/main/carbook).

**Start here:** the website and native source are implemented. No installable APK, AAB or IPA is included in this GitHub upload. The mobile service, identity provider, native dependencies and signing accounts still need configuration. The original build environment could not download Expo packages (HTTP 403) and had neither Android SDK nor Xcode. See [the executed validation record](VALIDATION.md); do not interpret source upload as device or store approval.

This guide takes a new developer from a clean computer to a configured pilot and signed testing builds. It also maps each product requirement to the implementation so the application can be understood and extended systematically.

## 1. Understand the product and requirements

Carbook is a social community for car enthusiasts, clubs and automotive businesses. Members maintain a profile and garage, share posts, meet in communities/events, message one another and discover vehicles or services in the marketplace. The requested product direction is a substantial Facebook-style experience adapted to cars, with a bright interface, readable typography and iOS/Android access. These are the product owner's requirements from the project brief, not evidence of a separate paying client contract.

| Requirement | Existing implementation | Acceptance example |
| --- | --- | --- |
| Member identity and garage | Profiles, covers, biographies, vehicle records | A member can edit their own vehicle; another member cannot |
| Social publishing | Feed, photographs/video, polls, stories, reactions, replies, saves | A friends-only post and its media stay hidden from a stranger |
| Relationships | Friends, following, blocks, private group approvals | Blocking removes access to protected interactions and media |
| Private conversations | Text/photos, receipts, unsend, retry deduplication | Retrying the same message UUID creates one message |
| Automotive community | Groups, events/RSVPs, marketplace listings, pages | Capacity is enforced; only the listing owner marks it sold |
| Trust and account control | Reports, moderation, export, native account erasure | A member cannot use owner/moderator operations |
| Mobile experience | Native screens, device media, secure credentials, system sharing | Sign-in returns from the system browser on both platforms |

The source does not implement every Facebook feature. Background push, voice/video calls, payments, ads, end-to-end encrypted chat, offline write synchronization and large-network capacity certification are outstanding product work. Read [FEATURES.md](FEATURES.md) before advertising capabilities.

## 2. Understand the stack

| Layer | Stack | Why it is used here |
| --- | --- | --- |
| Website | React 19, TypeScript, Vinext/Vite, Tailwind | Responsive browser interface deployed through Sites |
| Native app | Expo SDK 58, React Native, Expo Router, TypeScript | Native iOS/Android screens and navigation from shared app code |
| Device features | AuthSession/WebBrowser, SecureStore, ImagePicker, Video, FileSystem, Sharing | Browser-based login, protected refresh credentials and device integration |
| Domain/API | TypeScript, Cloudflare Workers, Zod | Shared business rules with validated inputs and server authorization |
| Database | Cloudflare D1 / SQLite, Drizzle | Durable relationships and append-only schema migrations |
| Media | Cloudflare R2 | Private objects served after access checks, including video byte ranges |
| Native identity | OIDC public native client, PKCE, RS256 access tokens | Separately authenticated mobile requests |
| Packaging | EAS Build; APK/AAB and signed iOS builds | Platform builds and credential management |

React Native and related module versions are deliberately resolved by Expo setup. The current bootstrap manifest is not yet a complete locked mobile dependency graph.

## 3. Prepare accounts and your computer

Use Git, Node.js 22.13 or later supported by the selected Expo SDK, npm, Python 3 for the existing repository catalog checker, and a code editor. The root package pins pnpm 11.25.0. The test runner uses Node's SQLite support; use a maintained Node release that satisfies the checked-in engines.

You need access to this private GitHub repository, an Expo account/project, a Cloudflare account with Workers/D1/R2, and an OIDC provider meeting step 8. For physical iPhone distribution, prepare the appropriate Apple Developer team and signing access. Google Play Console is needed for Play distribution; an internal Android APK can be installed directly. Complete account enrollment and any provider charges in your own accounts.

EAS can perform cloud compilation from a supported development computer. Local Android builds additionally require Android Studio/SDK and a compatible JDK. Local iOS builds require macOS/Xcode. An iOS simulator artifact cannot be installed on a physical iPhone.

Commands below use a POSIX shell, such as macOS Terminal, Linux, or Git Bash on Windows. PowerShell users can replace `cp` with `Copy-Item`. When a step says `carbook/` or `carbook/mobile/`, change to that directory first; do not run the commands from the outer catalog root by accident.

## 4. Clone the complete repository

Authenticate to GitHub with your normal credential manager or SSH setup. Do not put a token in a clone URL.

```sh
git clone https://github.com/atifmahmoodai/web-automotive-apps.git
cd web-automotive-apps/carbook
git switch -c carbook/setup-pilot
node --version
npm --version
```

Keep the whole `carbook/` directory. The mobile API imports the shared `lib/` and `db/` directories, so copying only `mobile/` is insufficient.

| Path from `carbook/` | Purpose |
| --- | --- |
| `app/`, `app/components/` | Website routes, authentication adapters and interface |
| `lib/actions.ts`, `lib/server.ts`, `lib/validation.ts` | Domain mutations, access rules, validated action inputs |
| `lib/read-service.ts`, `lib/upload-service.ts`, `lib/media-service.ts` | Shared reads and protected media |
| `db/schema.ts`, `drizzle/` | Database model and committed migrations |
| `mobile/app/`, `mobile/src/` | Native routes, components, state, login and API client |
| `mobile/service/` | Independent mobile Worker and account lifecycle |
| `tests/`, `mobile/tests/` | Web, core, identity and mobile API checks |
| `mobile/docs/` | Architecture, features, release gates and validation record |

## 5. Install the root and native dependencies

From `carbook/`:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
npm run typecheck
npm test
node mobile/scripts/check.mjs
```

The root uses `pnpm-lock.yaml`; do not generate a competing root npm lockfile. Preserve the checked-in package-age/build policies. The managed Sites installer is for its managed environment; ordinary developer setup uses pnpm directly.

Then, from `carbook/mobile/`:

```sh
npm run setup
npx expo install --check
npm run doctor
```

Setup installs Expo, resolves its compatible native modules and creates `mobile/package-lock.json`. Review changes to both mobile package files. Commit those files after setup succeeds. Future clean native installs use `npm ci`. If the registry returns 403, resolve access with your network/registry administrator or use an authorized development environment. Do not bypass access controls or substitute random dependency versions.

**Checkpoint:** setup exits successfully, the native React/React Native/Router dependencies exist, and a mobile lockfile has been generated. Native type checking cannot be considered complete before this point.

## 6. Choose the data environment

For a first independent pilot, create a **new** database and private bucket in your Cloudflare account. It begins as a separate community. The published owner-private website is at [the existing Carbook Site](https://astra-webapp-carbook.atifmahmood131.chatgpt.site); this GitHub upload does not change its hosting or audience.

To serve the same members and content on web and mobile, both services need authorized bindings to the same D1 database and R2 bucket, or a reviewed migration of both services. Sites-managed resource identifiers are not supplied here. A new database does not synchronize the website. Do not extract platform credentials or use the website URL as the mobile API.

Use separate staging and production resources. The following commands are for a new pilot only. Existing data requires a backup, restore check and migration review first.

## 7. Provision storage and apply the schema

From `carbook/mobile/`, after dependency installation:

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 create carbook-mobile --config service/wrangler.jsonc
npx wrangler r2 bucket create carbook-mobile-media --config service/wrangler.jsonc
```

Confirm the displayed Cloudflare account. In `service/wrangler.jsonc`, replace `CONFIGURE_DATABASE_ID` with the actual returned database UUID, and `CONFIGURE_MEDIA_BUCKET` with the created bucket name. Keep binding names `DB` and `BUCKET`. If you choose different resource names, use those exact names in every later command. Leave the R2 bucket private.

```sh
npx wrangler d1 migrations list carbook-mobile --local --config service/wrangler.jsonc
npx wrangler d1 migrations apply carbook-mobile --local --config service/wrangler.jsonc
npm run api:build
npm run api:typecheck
```

The migration directory resolves to `carbook/drizzle/`. Apply all migrations in order, including `0004` for native identities, linking and erasure. Do not edit previously applied migration files. To add future fields, change `db/schema.ts`, run `npm run db:generate` from `carbook/`, inspect the generated SQL and test it before deployment.

Apply to the intended **new pilot remote** database separately:

```sh
npx wrangler d1 migrations list carbook-mobile --remote --config service/wrangler.jsonc
npx wrangler d1 migrations apply carbook-mobile --remote --config service/wrangler.jsonc
```

Local and remote databases are different. A successful local migration does not migrate production. See the official [D1 CLI reference](https://developers.cloudflare.com/d1/wrangler-commands/) and [R2 bucket setup](https://developers.cloudflare.com/r2/buckets/create-buckets/).

## 8. Configure real native authentication

In your identity provider:

1. Create a **public native application** using authorization code flow and PKCE S256. No client secret belongs in the app.
2. Register callback `com.analysight.carbook://auth/callback`. Confirm the exact URI on a real development build.
3. Define a custom API audience and scope `carbook`. Permit the app's requested `openid profile email offline_access carbook` scopes.
4. Enable refresh-token rotation/revocation and short-lived RS256 JWT access tokens.
5. Ensure access tokens contain exact `iss`, matching `aud`, stable `sub`, integer `iat`/`exp`, `scope` containing `carbook`, and the allowed native client in `azp` or `client_id`.
6. Obtain the exact owner subject and invited tester subjects from the provider's authenticated management interface. Keep registration closed.

Copy `service/.dev.vars.example` to `service/.dev.vars` for local service testing and fill it with real values. This file must stay untracked. The provider issuer and JWKS must use HTTPS. Preserve issuer trailing slashes exactly. ID tokens and tokens issued for a different audience/client must be rejected.

| Server setting | Meaning |
| --- | --- |
| `OIDC_ISSUER` | Exact token issuer |
| `OIDC_AUDIENCE` | Audience of the custom Carbook API |
| `OIDC_CLIENT_ID` | Allowed public native application ID |
| `OIDC_JWKS_URL` | Trusted provider signing-key endpoint |
| `OWNER_SUBJECT` | Explicit owner identity; never a first-visitor guess |
| `REGISTRATION_OPEN` | Keep `false` for the pilot |
| `ALLOWED_SUBJECTS` | Comma-separated invited provider subjects |
| `CORS_ORIGINS` | Empty for native-only use; exact approved origins if a browser API client is intentionally added |

The implementation is in `service/identity.ts`, `service/accounts.ts` and `src/core/auth.tsx`. If a provider issues incompatible tokens, implement and test its explicit contract; do not disable signature, issuer, audience, client or scope validation.

## 9. Deploy and verify the mobile API

From `carbook/mobile/`:

```sh
npm run api:deploy
```

This first deployment remains unavailable for member operations until identity configuration is supplied. Store production server settings using the authenticated Cloudflare Worker Settings interface or the interactive CLI, for example:

```sh
npx wrangler secret put OIDC_ISSUER --config service/wrangler.jsonc
npx wrangler secret put OIDC_AUDIENCE --config service/wrangler.jsonc
npx wrangler secret put OIDC_CLIENT_ID --config service/wrangler.jsonc
npx wrangler secret put OIDC_JWKS_URL --config service/wrangler.jsonc
npx wrangler secret put OWNER_SUBJECT --config service/wrangler.jsonc
npx wrangler secret put ALLOWED_SUBJECTS --config service/wrangler.jsonc
```

Enter values at each private prompt. Keep `REGISTRATION_OPEN=false` in configuration. Do not paste tokens or subject lists into GitHub issues or terminal transcripts. Copy the actual HTTPS Worker origin returned by deployment.

Replace the placeholder host below with that origin:

```sh
curl -i https://YOUR_ACTUAL_WORKER_HOST/health
curl -i https://YOUR_ACTUAL_WORKER_HOST/api/state
```

Expect `configured: true` from health after configuration and **401** from the unauthenticated state request. Health only checks configuration presence; it does not prove the database, provider or media integration works. Sign in with owner, invited member and uninvited identities to verify actual admission and role behavior. Exercise private posts and authenticated media with different accounts.

For local API debugging, use `npm run api:dev`; it uses local bindings by default. The native release configuration requires HTTPS, so test on a properly configured staging HTTPS service rather than weakening production URL validation.

## 10. Configure and inspect the native app

From `carbook/mobile/`:

```sh
cp .env.example .env
```

Fill the public API origin, issuer, client ID, audience and working support/privacy/terms URLs. These `EXPO_PUBLIC_*` values are bundled into the app; they are public configuration, not secrets. The API host must be the deployed bearer-authenticated Worker, not a private `chatgpt.site` host. Step 12 supplies `EAS_PROJECT_ID`.

Before the first signed release, confirm ownership and uniqueness of `com.analysight.carbook` in `app.config.ts`. If changing it, update the native package/bundle ID, scheme, provider callback allowlist, callback construction/parsing and tests together.

Study the app in this implementation order:

| Order | Files | Behavior to understand or extend |
| --- | --- | --- |
| 1 | `src/core/config.ts`, `client.ts` | Required configuration, HTTPS API, bounded requests, bearer handling, uncertain writes |
| 2 | `src/core/auth.tsx`, `vault.ts` | System-browser PKCE, refresh rotation, serialized SecureStore updates, logout |
| 3 | `src/core/store.tsx`, `app/_layout.tsx` | Session state, navigation gates, refresh and background transitions |
| 4 | `src/components/`, `src/screens/Feed.tsx` | Readable typography, accessible controls, feed pagination and cards |
| 5 | `app/compose.tsx`, `app/edit.tsx`, `app/post/[id].tsx` | Posts, attachments, drafts, polls, reactions and replies |
| 6 | `app/member/[id].tsx`, `app/detail.tsx`, `app/collection/[kind].tsx` | Profiles, garages, groups, pages, listings and events |
| 7 | `app/chat/[id].tsx`, `app/notifications.tsx` | Conversation pagination, retry UUIDs, receipts and in-app activity |
| 8 | `app/settings.tsx`, `app/admin.tsx`, `app/report.tsx` | Linking, export, erasure, owner transfer and moderation |

New UI actions must call validated server operations and enforce permissions there. Hiding an edit button does not authorize a write. Media reads must retain audience, blocking, group-membership and expiry checks. Message retries must preserve the original client UUID. General mutations must not be automatically replayed after uncertain network failures.

Chats poll every 10 seconds while open; activity summaries poll every 20 seconds while active. Do not describe this as background push or end-to-end encrypted messaging.

## 11. Run the checks before building

From `carbook/`:

```sh
npm run typecheck
npm test
node mobile/scripts/check.mjs
```

From `carbook/mobile/`, after successful native setup:

```sh
npm run typecheck
npm run doctor
npm run export
npm test
npm run api:typecheck
npm run api:build
```

The root checks cover actual handlers against migrated SQLite. Mobile checks cover core behavior, real RSA verification, actual API handlers and native source syntax. The route syntax check externalizes SDK imports; it is **not** native SDK type checking. Record actual results, resolve failures and do not replace failed checks with stubs or silently ignore errors.

The website can be developed with its existing Sites workflow. Its managed ChatGPT identity and storage bindings do not become independently hosted merely by cloning GitHub. A standalone browser deployment needs a deliberate authentication/hosting adaptation; the separately configured mobile Worker already has its own authentication boundary.

## 12. Create the Expo EAS project

Run EAS commands from `carbook/mobile/`, where `eas.json` lives:

```sh
npx eas-cli login
npx eas-cli whoami
npx eas-cli init
```

Use the account/team that should own Carbook. The dynamic `app.config.ts` reads `EAS_PROJECT_ID`; copy the actual project UUID into `.env`. If `eas init` asks you to update dynamic configuration manually, use this existing environment hook instead of inventing another UUID.

Create corresponding `development`, `preview` and `production` environment values in the EAS project dashboard. Include all eight names in `.env.example`, including `EAS_PROJECT_ID`. Local ignored `.env` files are not a substitute for cloud build configuration. The checked-in `eas.json` selects an explicit `environment` for development, preview and production. The simulator profile extends preview. Populate each selected environment in EAS before building.

Verify the mobile lockfile is committed. Keep signing material in the credential store. See [EAS environment configuration](https://docs.expo.dev/eas/environment-variables/) and [nested app/monorepo build setup](https://docs.expo.dev/build-reference/build-with-monorepos/). Run from the mobile directory and inspect the first cloud install log to confirm the intended app lockfile/dependencies are used.

```sh
node scripts/release-check.mjs --production
```

This must exit successfully before distributing a usable pilot. The ordinary development hook only reports missing configuration; passing a cloud compile alone is insufficient.

## 13. Build a development client

```sh
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

Follow the authenticated signing prompts. Install the appropriate development build from its EAS build page. Then run `npm start` from `carbook/mobile/` and connect the installed development client to Metro. Test browser login, callback return, token refresh and logout on each platform before feature testing. Do not assume Expo Go supports this exact SDK/module combination.

## 14. Produce the installable Android APK

With the preview environment configured and checks passing:

```sh
node scripts/release-check.mjs --production
npx eas-cli build --platform android --profile preview
```

The checked-in preview profile sets `android.buildType` to `apk`. Wait for a successful EAS build, open its authenticated build page and download the `.apk`. Record the build ID and Git commit. Open the installation URL on the Android device and follow its installation prompts, or use an installed Android SDK:

```sh
adb install -r /absolute/path/to/carbook-preview.apk
```

Verify the expected package ID and signing certificate with Android SDK tooling, and retain the same signing identity for updates. An installed app with a different signing key cannot be upgraded in place. A production `.aab` is intended for Play distribution and is not a directly installable APK. See [Expo's APK guide](https://docs.expo.dev/build-reference/apk/).

## 15. Produce a signed IPA for registered iPhones

Use the authorized Apple Developer team and register each test device **before** creating the provisioning profile/build:

```sh
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

Follow EAS's device-registration and Apple signing flow. Download the signed `.ipa` from the successful build and install using its internal distribution link on a provisioned device. Ad hoc builds only install on devices included in the provisioning profile. Adding a new device requires an updated profile and build or an explicitly managed re-signing process.

`npx eas-cli build --platform ios --profile simulator` is useful for simulator testing; its output is not an installable physical-device IPA. A production App Store IPA uses a different distribution route, normally TestFlight/App Store. See [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/). Restrict internal build access in EAS settings before sharing private pilot builds.

## 16. Accept the builds on real devices

Use an owner, two invited ordinary members and an uninvited account. Test both Android and iPhone, a small screen and large text. Record device/OS, build ID, source commit and pass/fail evidence.

1. Cold/warm launch; successful, cancelled and expired login; refresh rotation; logout/relogin; wrong-role denial.
2. Post/edit/delete; friends-only/private/group visibility; attachments and video seek; comments, reactions, polls and draft-loss prompts.
3. Camera/library permission denial; keyboard scrolling; Android Back; iOS gestures; screen-reader labels and text scaling.
4. Friends/block/unblock; private group requests and removal; event capacity; listing ownership; page permissions.
5. Duplicate message taps/retries; attachments; read receipts; unsend; blocked-member behavior.
6. Airplane mode, lost response, poor connection, background/foreground and token expiry. Confirm uncertain writes are described honestly.
7. Reports/moderation; data export; deletion/cancellation; owner transfer; removal of protected content/media.

If shared authorized web storage is configured, test the website Settings connection code: five-minute expiry, single use, correct existing profile and refusal to merge a populated native account. The code must not work across separate databases.

The scheduled API Worker runs every 15 minutes. Native erasure has a seven-day cancellation window and removes up to 100 media objects per run before record cleanup. Verify continuation, failed storage deletion/retry, no erased-account resurrection and the retained pseudonymous tombstones. Provider identity deletion and backup retention are separate operational responsibilities.

## 17. Prepare store builds and ongoing operation

After device acceptance, configure production infrastructure/environment, legal/support pages, moderation staffing, accurate privacy disclosures, store screenshots and review access. Review current store requirements with the actual release features. This repository does not claim store approval.

```sh
npx eas-cli build --platform all --profile production
```

This requests an Android AAB and an iOS production build. Configure submission credentials in the authorized consoles/EAS before submitting. Use TestFlight and Play internal testing before a public release. The empty `submit.production` object is not a completed submission setup.

For every released artifact, retain its EAS build ID, source commit, dependency lock hash, SHA-256 artifact hash, environment, package/bundle ID, version/build number and device acceptance result. Keep binaries and signing credentials out of ordinary source commits; use access-controlled build/release storage.

Set up error/crash monitoring without tokens or private content, Worker failure alerts, deletion backlog alerts, database/media backups and a practiced restore procedure. Load-test the expected audience and obtain an independent security review before broad access. Additional features such as push, calling, payments or media retention need their own implementation and acceptance work.

## 18. Commit your configuration work safely

From `carbook/`, after reviewing changes:

```sh
git status --short
git diff --check
git diff
git add mobile/package.json mobile/package-lock.json mobile/eas.json
git commit -m "Configure and lock Carbook native pilot builds"
git push -u origin carbook/setup-pilot
```

Stage other reviewed source changes explicitly when needed. Do not stage `.env`, `.dev.vars`, credentials, keystores, certificates, provisioning profiles or personal test exports. Open a pull request in GitHub, record actual test/build results and merge once reviewed. Production deployment and store submission remain separate, intentional release actions.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Sign-in disabled | API/OIDC public configuration is absent or invalid |
| API health configured false / 503 | Missing server identity settings, especially explicit owner subject |
| 401 after provider login | Access token vs ID token; exact issuer/audience/client/scope; token expiry; JWKS |
| Invited member denied | Exact provider subject and allowlist; registration deliberately closed |
| Cloud build lacks variables | EAS environment/profile selection; ignored local `.env` is not uploaded configuration |
| Web link code fails | Same authorized database, unexpired/unused code, native profile still eligible for linking |
| iPhone cannot install IPA | Apple team, bundle ID, device UDID and provisioning profile match |
| Android refuses update | Package/signing identity differs from installed app |
| Expo install returns 403 | Authorized registry/network access needs repair; native validation remains pending |
| Deletion stays processing | Scheduled Worker deployed, correct bindings, R2 failures or remaining media batches |

Continue with [RELEASE.md](RELEASE.md) for the release checklist, [ARCHITECTURE.md](ARCHITECTURE.md) for trust boundaries, and [VALIDATION.md](VALIDATION.md) for what was actually tested before this upload.
