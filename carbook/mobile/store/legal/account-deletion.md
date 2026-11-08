# Carbook — Delete your Carbook account and data

DRAFT — no live external support intake is configured. Do not use this page URL in Play Console until the operator fills the contact details, deploys it and tests the request path.

App: Carbook (com.analysight.carbook). Operator: [COMPANY LEGAL NAME].

## Request deletion in the app
1. Sign in, open Profile → Settings & privacy → Delete your account.
2. Type DELETE MY ACCOUNT and confirm. The profile is hidden immediately.
3. You have seven days to cancel from the pending-deletion screen. After the deadline, removal cannot be cancelled.
4. The service deletes content in background batches. Large media collections or service outages can delay completion; support must communicate the status.

Community owners must first transfer ownership to an active member through administration. If no successor is available, request assisted deletion from support. Do not make an account impossible to delete merely because it is the last owner.

## Request deletion from the web, without the app
Contact [ACCOUNT-DELETION SUPPORT EMAIL OR HTTPS FORM URL] with subject “Carbook account deletion request”. Include your Carbook profile ID/name and sign-in provider used, and state that you want your account and associated data deleted. Never send your password, access token, connection code or identity documents in ordinary email. Support will use a proportionate identity-verification process through [VERIFIED CHANNEL] and confirm receipt, deadline and completion. [SET RESPONSE TARGET AND IMPLEMENT/TEST SUPPORT RUNBOOK]. The operator must replace this paragraph with a working contact link/form before public launch; this static draft submits nothing.

## Removed, anonymized and retained
Removed: authored posts/comments/stories, garage cars and private logbook records, listings/offers, owned groups/pages/events, related memberships/follows/reactions/saves/check-ins, notification records, push tokens, uploads and relevant reports. Sent messages are blanked/marked deleted; profile name/bio/city/images/website are anonymized. Purge processing handles up to 100 media files per pass, intended every 15 minutes after the seven-day waiting period.

Retained by current implementation: pseudonymous profile/identity mapping to prevent automatic account recreation, conversation relationships, deletion timestamps/status, and audit metadata (detail blanked). These can remain linkable identifiers. Operational logs, backups and third-party provider records are not erased by this job. [PUBLISH SPECIFIC JUSTIFIED RETENTION DURATIONS AND BACKUP EXPIRY, AND IMPLEMENT EXPIRY BEFORE LAUNCH]. Copies saved by other members cannot be recalled.

Deleting Carbook does not delete your external sign-in-provider account. For optional AI, VIN, maps, hosting and push processors, [OPERATOR TO DOCUMENT APPLICABLE PROVIDER-DELETION PATHS]. To request deletion of selected data without closing your account, delete individual content/garage entries where controls exist, or contact [PRIVACY SUPPORT]. Do not promise a separate comprehensive selective-deletion API: none is implemented.

See also the privacy policy and terms of service. Contact: [ACCOUNT-DELETION SUPPORT EMAIL].
