# Carbook

**Developer handover:** [Build from scratch, step by step](mobile/docs/BUILD_FROM_SCRATCH.md) covers setup, backend deployment, native sign-in, Android APK and signed iOS IPA builds. [Native release status](mobile/docs/VALIDATION.md): source delivered; native infrastructure, signing and device acceptance remain pending. No APK or IPA is included in this upload.

Carbook is an automotive social web app with durable member accounts, feeds, private messaging, communities, events, a marketplace, business pages and personal garages. This release expands the original community app into a working social platform.

## Product capabilities

| Area | Implemented behavior |
| --- | --- |
| Identity and profiles | Platform-managed ChatGPT sign-in, onboarding, avatar, cover, biography, city and website; account deactivation and reactivation |
| Social graph | Friend requests, accept/decline/cancel/remove, following, bidirectional blocking |
| Feed | Text, multiple photographs, video attachments, community/friends/private audiences, edit/delete, five reactions, threaded comments, polls, permitted reshares and private bookmarks |
| Stories | Photo/text stories, 24-hour expiry, deduplicated views and an author-only viewer list |
| Messenger | Member-to-member conversations, text/photo messages, read receipts, unread counts, retry-safe sends, unsend, message privacy and blocked-member enforcement |
| Communities | Open/private groups, membership requests, owner approval and removal, rules, covers and a group feed |
| Events | Member-created events, edits, cancellation notifications, capacity-controlled attendance, interested/going responses, organizer guest lists and calendar downloads |
| Marketplace | Listings, photographs, categories, currencies, location/price filters, saved items, sold status and contact through Messenger |
| Pages | Business/creator/club pages, page follows, contact details and owner-authorized page posts |
| Garage | Personal vehicle records, photographs and ownership stories, with edit/delete controls |
| Discovery | Cross-product search; paginated feeds, comments and message history |
| Trust and administration | Content reports, owner/moderator roles, member suspension, role administration and durable moderation audit records |
| Member settings | Default audience, messaging policy, notification preferences, example-content preference and streamed JSON data export |

The interface uses a bright, high-contrast layout with desktop, tablet and mobile navigation. Fictional examples are labelled; signed-in members see their real community by default and can opt into examples in Settings.

## Architecture

- React 19 and TypeScript with Vinext, hosted as a Cloudflare Worker through Sites.
- D1/SQLite stores application records. Drizzle defines the schema and append-only migrations.
- R2 stores uploaded photographs and videos. Media requests re-check ownership, audiences, membership, blocks and story expiry; videos support byte ranges.
- Zod validates mutation inputs. Authenticated, same-origin mutations enforce server-side authorization and per-account rate limits.
- Platform-owned `app/chatgpt-auth.ts` helpers handle identity. The browser has no custom password store or alternate authentication path. The separate native Worker has its own verified OIDC transport; see `mobile/docs/ARCHITECTURE.md`.
- `lib/actions.ts` implements mutations; `lib/server.ts` centralizes access predicates, data queries and hydration. `app/api/read` serves scoped resources. `app/components` contains the product views and forms.

Notifications and conversation summaries refresh every 20 seconds while the app is visible. An open conversation refreshes every 10 seconds. These are polling intervals, not WebSocket delivery guarantees. Messages are access-controlled and are not end-to-end encrypted.

## Develop and verify

- `npm run typecheck` checks TypeScript.
- `npm test` runs the actual API handlers against an in-memory SQLite database created from every committed migration and test-only identity/R2 boundaries. It never writes test accounts to the deployed database.
- `npm run db:generate` appends schema migrations after a schema change.
- Use the Sites skill's supported managed preview daemon and `build-site.mjs` production builder. Keep the Sites Vite plugin and hosting configuration intact.

The integration suite exercises authorization, audience privacy, blocked-user isolation, media ownership and byte ranges, group approvals, event capacity and cancellation delivery, voting, reshares, duplicate message prevention, read receipts, story expiry, marketplace/page ownership, role separation, moderation audit records, account lifecycle, export privacy, pagination, malformed input and write limits. Cancellation delivery is checked beyond 200 attendees with notification opt-outs and retry deduplication.

The preceding web release was reviewed in browser at desktop, tablet and mobile widths, including navigation, search, groups, Messenger, images and the sign-in gate. The test identity boundary does not validate the hosted sign-in exchange. A hosted multi-account acceptance session and load test remain necessary before opening access broadly.

## Deployment and data

The existing Site is owner-private. This release preserves its audience and deploys through Sites to the same project. The first authenticated account becomes the community owner; initialize it while access is still owner-private. The application cannot broaden the platform's access list itself.

Deployment applies committed migrations before publishing the Worker. Migrations `0000` and `0001` are historical; `0002` adds the social-platform tables/columns and `0003` adds query indexes. `0004` adds native identity mappings, single-use connection codes and deletion requests. Never edit applied migrations. All migrations are schema-only; optional fictional fixtures are inserted idempotently by account initialization.

Before a wider release, verify owner sign-in and upload persistence, exercise a second allowed member, appoint moderation coverage, and configure operational monitoring, backups, retention and a tested recovery procedure. The moderation console requires human review. Only specifically reported messages are exposed to moderation; it is not a private-inbox browser.

## Current boundaries

- No voice/video calls, live streaming, email/SMS/push delivery, payments, subscriptions or advertising infrastructure is connected.
- Feed/message/comment histories have keyset pagination. Discovery lists are bounded (300 profiles, 200 cars, 150 listings and 100 groups/events/pages); search provides additional matching results. This release has not been validated for large public-network traffic.
- Upload limits are 5 MB per photograph and 20 MB per video, with up to six attachments and one video per post. Recorded uploads are limited to 2 GB/2,000 files per account. A garage holds up to 20 vehicles.
- Account deactivation hides the account and permits reactivation. It is not permanent data erasure. Expired stories become inaccessible but their records/media are retained. Automated retention and orphan-media cleanup are not configured.
- Marketplace listings support member discovery and communication; there is no checkout, payment processing or purchase protection. Event RSVPs record attendance intent and do not book venues.
- Export contains account records and media references, not a ZIP of all uploaded binaries.

Vehicle photographs were copied from the user's existing `atifmahmoodai/marasi` project (`public/fleet/hero.jpg` and `porsche911.jpg`). They are example imagery, not evidence of actual member ownership. The browser makes no third-party image requests.

## iOS and Android source

The `mobile/` directory contains the native React Native / Expo app, an independently deployable bearer-authenticated API, build profiles and release documentation. Read [mobile/README.md](mobile/README.md) first. This website deployment adds account-linking support and shared service extraction; it does not compile or deploy the native app/API.

The mobile core, signed-token verifier and actual mobile API are tested using `node mobile/scripts/check.mjs`. Native SDK installation was blocked by the environment, so device builds, the full native typecheck and store releases remain pending. Production mobile preflight intentionally refuses missing infrastructure/configuration and an unresolved dependency lockfile.

When configured and sharing authorized storage, the mobile API supports a seven-day account-erasure workflow and owner transfer. Deactivation in the browser remains reversible; it is separate from erasure. The scheduled native Worker must be deployed and monitored for erasure to execute.
