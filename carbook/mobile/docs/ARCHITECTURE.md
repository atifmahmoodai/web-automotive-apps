# Native app and service architecture

## Identity boundaries

The browser app continues using platform-owned ChatGPT identity and same-origin mutation checks. Its login/logout helpers are unchanged. The native app signs in through the system browser against a separately configured OIDC public client using code + PKCE. Only the mobile Worker accepts that provider's access tokens. The native Worker does not trust ChatGPT/Sites identity headers, caller-provided user IDs, or roles from a request body.

The mobile verifier uses Web Crypto RSA signature verification and a server-configured HTTPS JWKS endpoint. It rejects unsupported algorithms, unknown keys, malformed credentials, wrong issuer/audience/native client, missing `carbook` scope, expired/future-invalid claims and ID-token usage. The JWKS endpoint never comes from the token. Keys are cached briefly with bounded refresh and a request timeout. This implementation is covered by signed-token tests; independent security review and real-provider integration are still required before public use.

A hash of `[issuer, subject]` identifies the native identity. `mobile_identities` maps it to one Carbook profile. An explicit owner subject and closed-by-default pilot prevent first-login ownership capture. Email matching is deliberately absent.

The website can issue 192-bit random, five-minute connection codes. Only hashes are stored. An atomic D1 batch maps a verified OIDC identity and consumes the code. Codes can be used only for an active website profile. Existing content/relationships stop an automatic native-profile replacement; a populated-account merge needs a reviewed process.

## Shared application behavior

`lib/actions.ts` implements the same mutations for both transports. `lib/server.ts` supplies account, ownership, audience, friendship, group-membership and blocking predicates. The extracted read, upload and media services receive a verified profile ID from their transport adapter; they do not authenticate arbitrary identity headers themselves.

| Surface | Authentication before shared services |
| --- | --- |
| Website API | Managed ChatGPT visitor identity; same-origin checks for writes |
| Mobile API | Verified RS256 provider access token; exact origin allowlist when an Origin header is present |
| Scheduled deletion | Worker scheduled execution bound to the authorized database/bucket |

A shared source tree does not imply shared live data. Both deployments must be authorized to use the same D1/R2 resources to serve one community. A separate database is a separate pilot.

## Native state and media

The app keeps access tokens, feed data and private conversations in memory. Only refresh credentials persist through SecureStore, in small chunks with a manifest written last. Credential mutations are serialized; a failed rotation retains the prior complete manifest. Sign-out clears the manifest/chunks and attempts provider revocation. API responses use no-store. Authenticated images disable Expo Image disk caching; media URLs are restricted to the configured API, and video uses authenticated headers.

Mutations are not automatically retried. A network failure after submission is explicitly uncertain, because the server may already have committed it. Message client UUIDs support safe retry deduplication. Private data is not queued for offline writes.

The feed, comments and conversations use cursor pagination. Activity summaries refresh while active every 20 seconds; an open conversation polls every 10 seconds. This is not a WebSocket service or background push system. Large discovery collections remain bounded, with search for additional matches.

## Account deletion

A deletion request requires the exact phrase `DELETE MY ACCOUNT`. Owners must transfer ownership to a real active member first. The profile becomes `deletion_pending` immediately and is hidden by shared access predicates. The member can cancel before the seven-day deadline. Administrators cannot use normal suspension controls to restore deletion-managed states.

The scheduled worker processes one eligible account per run and removes up to 100 media objects before database content cleanup. Retrying a run is safe; the request remains processing if storage deletion fails. After files are removed, related authored content/connections/reports are deleted, sent messages become blank removed-message tombstones, and the profile loses its personal fields. Pseudonymous identity mappings and minimal audit IDs remain so a still-valid provider credential cannot recreate the erased account. The provider account is separate and is not deleted.

Backups and external copies have separate retention rules. Configure and disclose those rules before launch. Automated orphan-media and expired-story retention are not included in this release.

## Deployment boundaries

A normal Sites deployment builds only the website, including its link-code endpoint and schema migration. It does not deploy `mobile/service/worker.ts` or produce a native binary. The mobile service has an independent Wrangler configuration; native releases have independent EAS profiles. Production native preflight fails if required public URLs, identity configuration, EAS project, or resolved dependency lock are absent.

The code uses no embedded platform bearer, production signing key, native client secret, payment credential or privileged service session. Configuration examples are placeholders and sign-in fails closed until replaced by real authorized services.
