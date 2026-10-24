# Carbook for iOS and Android

A native React Native / Expo application for the Carbook automotive community. The app has separate native screens, navigation, camera/library access, system sharing and secure credential storage. It is not a WebView wrapper.

**Delivery status — 24 October 2026:** the app source, shared mobile API, tests, icons and EAS build profiles are implemented. The mobile API is not provisioned, and no APK, AAB or IPA has been compiled or signed. Expo package downloads returned HTTP 403 in the build environment; it also has no Android SDK or Xcode. Native SDK type checking, native runtime behavior and store acceptance remain unverified. This is a development source release, not a certified production binary.

The existing Carbook website remains at:
https://astra-webapp-carbook.atifmahmood131.chatgpt.site

## Start here

Follow [Build from scratch, step by step](docs/BUILD_FROM_SCRATCH.md) for a clean-machine setup, the product requirements and stack, backend/OIDC provisioning, validation, Android APK and physical-iPhone IPA builds. The GitHub home is [`web-automotive-apps/carbook`](https://github.com/atifmahmoodai/web-automotive-apps/tree/main/carbook).

## What is included

- A bright, high-contrast interface with 16 px body text, large headings, generous tap targets, keyboard handling and native tabs.
- Profile, cover photo, personal garage and vehicle editing.
- Paginated feeds; photo/video posts; polls; five reactions; threaded comments; saved posts; reshares; stories and audience controls.
- Friends, following, private communities, join approvals, events/RSVPs, marketplace listings and business/club pages.
- Private conversations with photo attachments, read receipts, message removal and duplicate-send protection.
- Search, in-app notifications, reporting, blocking and an owner/moderator administration console.
- System-browser OAuth authorization code flow with PKCE; short-lived access tokens in memory; refresh credentials in Keychain/Keystore via SecureStore.
- One-time linking to an existing website profile when both services use the same authorized database.
- Data export and account deletion with a seven-day cancellation period, background media erasure, and owner transfer.

See [FEATURES.md](docs/FEATURES.md) for the scope and explicit boundaries.

## Stack

| Layer | Implementation |
| --- | --- |
| Native app | Expo SDK 58, React Native, React, TypeScript, Expo Router |
| Device integration | SecureStore, AuthSession/WebBrowser, ImagePicker, ImageManipulator, Image, Video, FileSystem, Sharing, Haptics |
| Identity | A separately configured OIDC provider issuing RS256 access tokens for this native client and API audience |
| Mobile API | Cloudflare Worker using the same Carbook domain services and Zod action schemas as the website |
| Records and media | D1 / SQLite with Drizzle migrations; R2 with authenticated media access |
| Release builds | EAS development client, Android preview APK, iOS simulator, Android production AAB and iOS production build profiles |

The bootstrap manifest intentionally declares only Expo until `npm run setup` resolves the SDK-compatible native modules. It must generate and commit a mobile `package-lock.json` before reproducible native builds are possible. React and React Native versions must come from Expo's resolver, not guesses.

## Repository layout

```text
mobile/
  app/                 Expo Router native screens
  src/components/      Design system, cards and sheets
  src/core/            Auth, API client, secure storage, state and media helpers
  src/screens/         Shared feed/profile/sign-in screens
  service/             Bearer-authenticated Worker, identity and account lifecycle
  scripts/             Setup, checks, API bundling and release preflight
  tests/               Core, signed-token and real-SQLite API tests
  assets/              Icons and existing Carbook vehicle photographs
  docs/                Architecture, features, validation and release guide
../lib/                Shared authorization, actions, reads, uploads and media ACLs
../db/                 Drizzle schema
../drizzle/            Append-only migrations, including 0004 for mobile identity/deletion
```

Keep this directory inside the Carbook repository: the service imports `../lib`, `../db` and their dependencies. Copying only `mobile/` will not produce a self-contained API project. The downloadable source ZIP includes the repository around it.

## Start development

Prerequisites: Node 22.13+ (or a current supported Node 24), npm registry access, the root repository dependencies, and an Expo account for EAS cloud builds. Local iOS compilation requires macOS/Xcode; local Android compilation requires Android Studio/SDK.

From the repository root, install the pinned web/API dependencies using the repository's package manager and lockfile. Then:

```sh
cd mobile
npm run setup
```

This installs Expo, asks `expo install` to choose native-module versions, and creates a lockfile. Review and commit both package files. Copy `.env.example` to `.env` and configure its values using [RELEASE.md](docs/RELEASE.md). No secrets belong in any `EXPO_PUBLIC_*` variable.

```sh
npm run typecheck
npm run doctor
npm run export
npm test
npm run api:typecheck
```

The native sign-in button remains disabled if service configuration is missing. The app does not invent a successful login or show fake member activity.

Build a development client through EAS, install it, then run:

```sh
npm start
```

Use development builds for this project rather than assuming the installed Expo Go version supports every SDK/module combination.

## Native and API tests available before Expo setup

With the existing root dependencies installed:

```sh
node mobile/scripts/check.mjs
npm run typecheck
npm test
cd mobile
../node_modules/.bin/tsc --noEmit -p service/tsconfig.json
npm run api:build
```

`check.mjs` runs pure mobile-core tests, real RSA signature/claim validation, actual mobile handlers against SQLite created from all migrations, and syntax/local-import checks for every native route. The final syntax check treats external SDK modules as external; **it is not a substitute for native TypeScript checking or a device build**.

## Release requirements

Follow [RELEASE.md](docs/RELEASE.md) in order. Connect the identity provider and database/media infrastructure before distributing a build. The website's private ChatGPT login cannot act as a native bearer API, and no Sites service token belongs in a mobile app. Using a separate blank database starts a separate community; it does not synchronize website accounts or content.

After configuration and native verification:

```sh
node scripts/release-check.mjs --production
npx eas-cli build --platform android --profile preview
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform all --profile production
```

Production profiles generate signed builds only after the relevant accounts and signing credentials are configured. Uploading to TestFlight or Google Play and completing store review are separate steps. This delivery did not perform them.
