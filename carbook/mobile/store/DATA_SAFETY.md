# Data safety answer sheet — code-derived draft, not a submitted declaration

Scope: Carbook mobile 0.3.1 (build 4), source mobile/service, lib/read-service, mobile/src/core/{auth,vin,geo,push,telemetry}. Review the final backend, provider contracts and all SDK behavior before completing Play Console. Collection includes optional features even when a particular user never uses them. Data safety is a declaration about the distributed app/service, not merely the small APK.

## Top-level answers
- Does the app collect or share user data? **Yes** once configured; do not answer No simply because this preview lacks a backend URL.
- Is data encrypted in transit? App API, OIDC, AI and default VIN/maps use HTTPS. Answer Yes only after verifying all deployed hosts, redirects, SDK traffic, image resources and server configuration. Messages are NOT end-to-end encrypted; these are different questions.
- Account creation: external OAuth/OIDC sign-in; provider may allow signup in its hosted flow. Select the applicable OAuth and provider methods in the current form; app itself does not store a username/password database.
- Can users request account/data deletion? In-app request and seven-day cancellation are implemented. External path is a **draft**, not functional until a contact/form is filled, hosted and operated. Do not submit a dead placeholder URL or claim complete erasure of all metadata.
- Ads: none implemented. Advertising ID: no deliberate app use; verify the merged manifest and SDK scan before answering. No cross-app tracking is implemented.
- Sale of data: none implemented. Marketplace prices/offers are not payments processed by Carbook.

## Data types / purpose / optionality
| Play category to review | What the code sends or stores | Required/optional | Main purpose |
|---|---|---|---|
| Personal info: name, user IDs | Display name, provider subject hash, Carbook profile ID, token claims | Identity required for service; profile fields optional | Account management, app functionality, security |
| Personal info: email address | OIDC requests email scope; identity provider may collect it. Mobile API verifier does not persist email claim | Provider-dependent | Account management. Audit final provider flow before declaring absence |
| Personal info: other info | Bio, city, website, vehicle profile/owner notes; content can contain volunteered personal details | Optional | App functionality |
| Messages: other in-app messages | Private message body, attachments, conversation membership, read receipts | Optional | App functionality, abuse prevention |
| Photos and videos | Selected/uploaded images/videos, avatar, vehicle photos, receipts/document photos | Optional; library/camera chosen by member | App functionality |
| Files and docs / other user-generated content | Receipt/document images and notes, posts/comments/stories, reports, group/page content | Optional | App functionality, moderation |
| Financial info: other financial info (review) | Vehicle running-cost amounts/currency, marketplace asking/offer prices. No card/bank/payment-history processing | Optional | App functionality. Confirm correct classification for user-entered costs |
| Location: approximate (conservative review) | Profile/listing/event city, user-pinned event lat/lng, map viewport and search text. No GPS permission or background device location | Optional | App functionality. Decide current-form classification with provider/network behavior; no GPS is not a blanket No |
| App activity: interactions and other actions | Reactions, follows, friendships, saves, RSVP/check-ins, views, moderation, push preferences | Feature-dependent | App functionality, safety |
| Device or other IDs | Expo device push token when enabled; provider identifiers, infrastructure metadata/IP | Push optional; server technical metadata inherent | Notifications, account/security |
| App info/performance: diagnostics, crash logs | Build/version/request IDs, API status/duration/path logs. Optional app crash/analytics endpoints disabled in preview | Logs inherent; optional telemetry off | Security/diagnostics. If endpoint enabled, reassess declaration |
| Other info / vehicle identifiers | VIN sent directly to NHTSA on user lookup; logbook/odometer/litres/due dates | Optional | App functionality |

No code intentionally collects contacts, SMS, call logs, health data, microphone recordings or precise device GPS. Inspect transitive SDKs and final permissions before checking “not collected.” Do not classify all user content only as diagnostics.

## Transfer/“sharing” worksheet
Collected by operator backend: account/profile/content/logbook/marketplace/event data and technical logs. Cloudflare (intended hosting), chosen OIDC provider, Expo/platform push services and optional AI provider may act as processors/service providers. Google Play has specific service-provider and user-initiated-transfer exceptions; do not blindly mark every transfer “shared” or “not shared.” Record the signed processing agreements and analyze each destination:
- AI: chat turns plus selected-car name/year/notes/recent service/fuel titles/dates/odometer; no API key embedded. Provider retention/training terms unknown until operator chooses one. Assistant history lives in app memory; server does not intentionally persist its text.
- VIN: entered VIN goes to NHTSA vPIC with request network metadata.
- Maps/geocoder: tile coordinates/viewport, typed search queries, selected destinations and network metadata go to the provider or external maps app.
- Push: Expo tokens, names/activity summaries and routing IDs. Direct-message push omits message body. Check platform-delivery credentials before launch.
- Optional crash/analytics: scrubbed payloads to configured endpoints, OFF by default. Scrubbing is best effort, not a legal anonymization guarantee.
- Intentional audience sharing: community posts, published profile/vehicle data, messages, public meetup attendance and listings go to selected members/audiences. Private logbook/media is owner-restricted unless the same media is separately published by its owner.

For each data type, assess collection AND sharing, whether processed ephemerally, required/optional, all applicable purposes, and retention. Most persisted account/content data is not ephemeral. User-supplied AI/VIN/map data may be retained by external providers even when Carbook does not store it.

## Deletion/retention reality
Purge deletes owned content/media/premium records, blanks sent messages and anonymizes profile after seven days, in background batches. It retains pseudonymous identity mapping/profile tombstone, deletion record, conversation relationships and audit metadata (detail cleared). Logs/backups/third-party retention are not purged by this job. Specific retention limits, legal necessity and processor deletion procedures MUST be finalized and implemented; do not promise total immediate erasure.

## Final verification checklist
- Capture actual traffic from the release APK on a physical device; reconcile every destination and SDK.
- Verify merged permissions, no unexpected AD_ID or microphone/location requests, and camera/photo behavior on current Android versions.
- Test export, pending deletion/cancel, purge with >100 files, external deletion support, retained metadata, backups/log expiry and provider requests.
- Publish approved policy and deletion URLs, replace placeholders, provide reviewer login and check functional access without installing the app.
- Re-do this worksheet whenever telemetry, AI, hosting, payments, analytics or target audience changes.

Official reference opened/reviewed 8 November 2026 (PKT):
https://support.google.com/googleplay/android-developer/answer/10787469
https://support.google.com/googleplay/android-developer/answer/10144311
https://support.google.com/googleplay/android-developer/answer/13327111
