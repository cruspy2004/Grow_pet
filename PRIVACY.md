# Grow Buddy — Privacy

Last updated: 2026-08-07

## The short version

- **Free tier: nothing leaves your machine.** No account. No telemetry.
  No network calls. If your computer is offline, Grow Buddy still
  works perfectly.
- **Pro tier: opt-in cloud sync of a small snapshot per shared goal.**
  You choose which goals to share and who receives your code. Your raw
  history and personal target amount are never uploaded — only the
  fields required to render another person's marker on your bar.

## Free tier — what is stored, and where

All Grow Buddy data lives in a single JSON file on your computer:

- **Windows:** `%APPDATA%\Grow Buddy\goals.json`
- **macOS:** `~/Library/Application Support/Grow Buddy/goals.json`
- **Linux:** `~/.config/Grow Buddy/goals.json`

That file contains your goals, step events, and settings. A rotating
log file (`logs/app.log`, capped at 1 MB) sits alongside it and
contains local error messages only. Neither file is read or written by
anyone but you.

Uninstalling Grow Buddy or deleting the folder above removes all data.

## Pro tier — what leaves your machine

Pro is an **explicit, opt-in** sync layer. When you enable it and
create or join a share code, the following happens:

**When you push a snapshot (as the goal owner):**
- Your goal name (a text label you chose)
- Your `actual` (numeric progress) and `ideal` (pace target) values
- Two ratios (`actualRatio`, `idealRatio`) between 0 and 1.2
- Booleans `isBehind` and `isComplete`
- A UTC timestamp

We do **not** upload:
- Your step-by-step history
- Your unit value or per-step amount
- Any personal notes or metadata

**When you join a share (as a friend):**
- Your email address (used to identify your account for the bearer
  session)
- The share code you were given

## Authentication

The Pro tier uses magic-link email sign-in (no passwords). We store
your email, a hashed session token, and the shares you've joined. If
you delete your account (planned for v1.1), all rows tied to your
user id are removed.

## Third parties

The Pro tier backend runs on Cloudflare Workers with a Cloudflare D1
database. Email delivery uses Resend. Both are contract processors —
your data is not sold or used for advertising.

## Analytics

There are none. Grow Buddy does not use Google Analytics, Mixpanel,
PostHog, Sentry, or any other analytics or crash-reporting service.
Local logs are for your own troubleshooting only.

## Contact

Questions: [haadheesheeraz2004@gmail.com](mailto:haadheesheeraz2004@gmail.com).
