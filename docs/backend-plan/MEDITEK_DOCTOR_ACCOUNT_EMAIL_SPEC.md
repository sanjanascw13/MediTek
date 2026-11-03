# MediTek --- Doctor Account Email Notification Specification

**Status:** Proposed \| **Priority:** High

## Goal

When a Super Admin successfully creates a Doctor login, send an
account-created notification to the email address stored on that
Doctor's Person record.

## Recommended secure design

Prefer a **single-use, time-limited password-setup link** over emailing
a password: 1. Create Doctor, Person, and UserAccount successfully in
the existing transaction. 2. Generate a cryptographically random,
single-use activation token with an expiry. 3. Email the Doctor's
registered address with the MediTek account notice, username, setup
link, expiry, and support instructions. 4. Doctor uses the link to set a
password; invalidate the token after use or expiry.

If activation links cannot reasonably be implemented in this phase, use
a randomly generated temporary password only as a fallback. Require
password change at first login and expire the temporary credential
promptly. Never email a permanent password or an existing password.

## Requirements

-   Only trigger after successful authorized Super Admin Doctor
    creation.
-   Use the email persisted on the Doctor's Person record, not an
    arbitrary client-supplied recipient.
-   Failed/rolled-back account creation must not send email.
-   SMTP failure must not delete or corrupt the account. Clearly report
    "account created, notification failed" and provide an authorized
    resend action.
-   Avoid duplicate notifications on retries where practical; consider
    an outbox/retry pattern if compatible with the current architecture.
-   Protect activation/resend endpoints against abuse and token
    guessing; store token hashes where feasible.
-   Never expose passwords, activation tokens, JWTs, SMTP secrets, or
    database credentials in logs or API responses.
-   Reuse the existing account-creation/authentication services and role
    model; do not duplicate account logic.
-   Use a mock mail sender in automated tests. If SMTP is unconfigured
    locally, report that clearly and do not claim an email was sent.

## Configuration

Externalize all SMTP configuration; never hardcode credentials.
Suggested environment variables: - `MEDITEK_SMTP_HOST` -
`MEDITEK_SMTP_PORT` (default 587) - `MEDITEK_SMTP_USERNAME` -
`MEDITEK_SMTP_PASSWORD` - `MEDITEK_MAIL_FROM` -
`MEDITEK_FRONTEND_BASE_URL`

Use TLS/STARTTLS as supported by the mail provider. Keep test runs
independent of real SMTP credentials.

## Database/migration rules

Inspect existing schema and auth flow first. Add a new Flyway migration
only if activation-token or outbox persistence is required. **Never edit
already-applied V1--V5 migrations.**

## Acceptance tests

1.  Super Admin creates Doctor: one notification sent to the persisted
    email.
2.  Doctor can set password through activation flow; token is
    single-use.
3.  Expired/invalid token is rejected.
4.  Failed account creation sends no email.
5.  SMTP failure preserves account and is clearly reported.
6.  Authorized resend works without creating a duplicate account.
7.  Unauthorized roles cannot create/resend another user's account.
8.  Tests assert recipient/content using a mock sender.
9.  No secrets or tokens appear in logs/responses.

## Safety

Preserve existing source changes, users, records, and database. No
destructive SQL, reset, seed, commit, or push. Use fictional test data
only.
