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
| Settings | Audience/message policy, in-app notifications, data export, website linking, support/privacy/terms links |
| Deletion | Seven-day cancellation, owner transfer, scheduled content/media removal and anti-resurrection tombstone |
| Builds | Native config/icons, Android APK/AAB and iOS development/simulator/production profiles |

## Not delivered or connected

- No compiled APK/AAB/IPA; no native simulator/device run; no TestFlight or Google Play submission.
- No live mobile API, OIDC tenant/client, EAS project or shared production storage bindings.
- No push notifications, email/SMS delivery, voice/video calls, livestreaming or realtime socket infrastructure.
- No payment checkout, purchase protection, advertising, subscriptions, billing or financial settlement.
- No end-to-end encrypted messaging or background/offline write synchronization.
- No associated-domain universal/app links; custom-scheme links require the installed app and can be handled by competing apps. Server authorization still applies.
- No automatic merging of two populated accounts, or migration from the managed website database to an independently created database.
- No automatic cleanup policy for expired stories or abandoned uploads beyond the account-deletion workflow.
- No public-network load certification, store-policy certification or external security audit.

Marketplace transactions and event venues are arranged by members. Support, policies, moderation staffing, operational alerts, backups and recovery procedures must be established before launch.
