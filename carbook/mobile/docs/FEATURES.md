# Feature scope

“Implemented” below means present in the native source/API. Native device behavior remains unverified until the release gate is run.

| Area | Implemented |
| --- | --- |
| Navigation | Native tabs, stack/modal screens, loading/error/empty states, draft-loss confirmation, guarded forms |
| Identity | System browser + PKCE, refresh rotation storage, sign-out/revocation attempt, closed pilot, explicit owner |
| Profile | Avatar/cover, name/bio/city/website, own/other profiles, edit, post history |
| Garage | Add/edit/remove up to 20 vehicles with photographs and stories |
| Feed | Cursor pagination, discover/following/friends, refresh, saves, author/group/page feeds |
| Posts | Text, up to six attachments/one video, 5 MB photos/20 MB videos, polls, reactions, comments/replies, edit/delete, reshare |
| Stories | Photo/caption, audiences, expiration access checks, view tracking, author views, delete/report |
| People | Search, follow, friendship request/accept/decline/cancel/remove, block/unblock |
| Messaging | Conversations, photo attachments, cursor history, read receipts, deduplicated send, unsend, reported-message moderation |
| Communities | Open/private groups, membership requests, approvals, rules, owner member removal, scoped feeds |
| Events | Create/edit, location, capacity, interested/going/cancel RSVP, organizer guest list and cancellation |
| Marketplace | Browse/search/category/price filters, create/edit, saves, seller messaging, active/sold/deleted states |
| Pages | Club/workshop/dealership/creator/brand profiles, follows, page posts, contact owner |
| Moderation | Report post/profile/story/group/event/listing/page/message, moderation queue, owner roles/suspension, audit history |
| Appearance | Design tokens, light/dark themes following the system or a manual choice, skeletons, haptics, Reanimated transitions, onboarding |
| Smart garage | Service, fuel, expense and document records per car; fuel economy and cost stats; category and monthly spend charts; private document photos; due/expiry tracking with local reminders |
| VIN decoder | ISO 3779 check digit, I/O/Q rejection, NHTSA vPIC decode, prefill of garage cars and listings |
| Offers | Offer, update, withdraw, accept, decline and counter, with seller-only visibility of all offers and blocks honoured; notifications to the other party |
| Price insight | Median and interquartile range of comparable active/sold Carbook listings (same category, similar title when enough exist), labelled as Carbook-only |
| Maps & check-ins | Keyless OSM map of pinned meetups, organizer pins via geocoder or coordinates, a check-in window, attendee check-ins, directions handoff |
| AI assistant | Server-side OpenAI-compatible proxy, optional vehicle context, 12-message history, rate limited, not-configured state and safety disclaimer |
| Push | Expo push token registration (max 10 per member), message/reaction/comment/event-update/offer pushes honouring preferences and blocks, dead-token pruning, cron sweep for website activity |
| Settings | Appearance, device push switch, tools, audience/message policy, in-app notifications, data export, website linking, support/privacy/terms links |
| Deletion | Seven-day cancellation, owner transfer, scheduled content/media removal and anti-resurrection tombstone |
| Builds | Native config/icons, Android APK/AAB and iOS development/simulator/production profiles |

## Not delivered or connected

- Garage records, offers, check-ins and event pins are served by the mobile API only. The website does not show them yet, and the website self-export does not include them (account deletion does purge them).
- The price insight uses Carbook listings only. There is no external market data, and it needs at least 3 comparable listings.
- The VIN decoder relies on NHTSA vPIC, which covers mainly US-market vehicles. Many Pakistani/JDM VINs and chassis numbers will decode partially or not at all.

- No compiled APK/AAB/IPA; no native simulator/device run; no TestFlight or Google Play submission.
- No live mobile API, OIDC tenant/client, EAS project or shared production storage bindings.
- Remote push is implemented but needs an EAS project ID (`EAS_PROJECT_ID`, still empty) and a physical-device test; local reminders work without it. No email/SMS delivery, voice/video calls, livestreaming or realtime socket infrastructure.
- No payment checkout, purchase protection, advertising, subscriptions, billing or financial settlement.
- No end-to-end encrypted messaging or background/offline write synchronization.
- No associated-domain universal/app links; custom-scheme links require the installed app and can be handled by competing apps. Server authorization still applies.
- No automatic merging of two populated accounts, or migration from the managed website database to an independently created database.
- No automatic cleanup policy for expired stories or abandoned uploads beyond the account-deletion workflow.
- No public-network load certification, store-policy certification or external security audit.

Marketplace transactions and event venues are arranged by members. Support, policies, moderation staffing, operational alerts, backups and recovery procedures must be established before launch.
