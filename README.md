# My Madam G

A private, on-device period tracker built as an installable web app (PWA). No accounts, no ads, no
analytics, no server. All logs live only in the browser's local storage on the phone that logs them.

## What's here

- `index.html` / `js/` / `css/` — the main tracker (calendar, day logging, predictions, insights, settings,
  exercise logging, daily reminders)
- `partner.html` — a full read-only mirror of her tracker (calendar, insights, and an editable exercise
  schedule), meant for a partner's phone
- `manifest.json` / `sw.js` / `icons/` — makes it installable on Android and usable offline

## Exercise tracking

Each day's log has number fields for whatever's in the current exercise schedule (defaults to push-ups
and sit-ups). The schedule itself can be edited from the partner dashboard's **Schedule** tab — add
"Planks" there and it shows up as a new field in her day editor next time her app syncs. Insights (on
both her app and the partner dashboard) shows weekly totals per exercise and a current streak.

## Daily reminder

Settings → **Daily reminder** lets her opt into a nudge if she hasn't logged anything by a chosen time —
an in-app banner, plus a browser notification if permission is granted. Being honest about the limits:
without a backend push server, there's no way to reliably wake the phone when the app is fully closed all
day — this fires only when the app happens to be open (foreground, just reopened, or within roughly 15
minutes via the periodic check while it's open). A true "always fires at 8pm even if closed" reminder
would need Web Push + a scheduler (e.g. a free scheduled GitHub Action calling the push service) — doable
as a follow-up if it turns out the in-app version isn't enough.

## How the predictions work

Cycles are derived automatically from the days you mark with a flow level — no manual "cycle length"
entry needed. The app averages your last several cycles (configurable in Settings) to predict the next
period, and estimates ovulation either from your basal body temperature history (if you log it) or a
default 14-day luteal phase. Everything recalculates as you log more days.

## Installing on her phone remotely (LDR-friendly)

Since you can't set this up on her phone in person, **GitHub Pages is the only hosting option that
actually works for a remote install** — it gives a stable `https://` link she can just tap. (Termux and
same-Wi-Fi LAN hosting both technically work but require either local device access or being on the same
network, so they're not useful across an LDR — skip straight to this.)

1. Push this folder to a GitHub repo (can be private or public — see the privacy note below).
2. Repo Settings → Pages → deploy from the `main` branch, root folder.
3. Send her the resulting `https://<you>.github.io/<repo>/` link (any messaging app is fine — see
   `SEND_TO_HER.md` for exact wording you can copy-paste).
4. All she has to do:
   - Tap the link, opens in Chrome.
   - Chrome menu (⋮) → **Add to Home screen**.
   - Open it from the new icon on her home screen from then on. It works fully offline from that point —
     no further setup needed to just track.
5. The HTML/CSS/JS served from GitHub Pages is public, but it's just code — it contains no personal data.
   Her actual logs are created and stay only in her phone's local storage; nothing about her cycle is
   ever in the repo or on GitHub.

## Optional: partner sync dashboard

By default the app is 100% offline with no sync of any kind. If you want your own view of her full
tracker, there's an opt-in sync using two shared Google Drive files, each encrypted client-side with a
passphrase only the two of you know — Google only ever sees ciphertext:
- her app → a file with her full logs, symptoms, settings, and exercise schedule (everything, not just a
  phase summary — she should know that before turning it on, see `SEND_TO_HER.md`)
- your dashboard → a separate file with just the exercise schedule, so you can add things like planks and
  have them appear on her side

This part needs a one-time setup by you (it requires a Google Cloud account), but her side is a single
link tap + one confirmation button, and it syncs automatically after that — no manual "sync" step, no
toggle to remember. It re-syncs whenever she logs something, opens the app, or roughly every 15 minutes
while it's open and online.

**Your one-time setup (~10 minutes, do this before sending her anything):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a new project.
2. **APIs & Services → Library** → enable the **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → User type **External** → set the app name to
   **"My Madam G"** (so the warning screen in the next step reads clearly) → under
   **Test users**, add both of your Google account emails. Leave publishing status as **Testing** (no
   Google review needed for personal use).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type **Web
   application** → under **Authorized JavaScript origins**, add the exact GitHub Pages origin from the
   install step above (e.g. `https://<you>.github.io` — no trailing path).
5. Copy the generated Client ID into [js/drive-config.js](js/drive-config.js), replacing
   `YOUR_CLIENT_ID.apps.googleusercontent.com`, then push/redeploy.
6. Decide on a shared Google account for this — simplest is to have both of you sign in with the *same*
   Google account for Drive purposes only (a spare/shared account works fine). This sidesteps Drive's
   file-sharing/permissions dance entirely and is what makes her side a single confirmation tap instead
   of a multi-step Drive share.
7. Open your live GitHub Pages URL yourself once → **Settings** tab → **Partner sync** → tap
   **"Copy her one-tap setup link"** (this auto-generates a passphrase if you haven't set one and copies
   a link like `https://<you>.github.io/<repo>/?setup=XXXXXXXX` to your clipboard).

**Her side — genuinely just this:**
- She opens the link you send her (works whether or not she's already installed the app).
- A card appears explaining what it shares and asking *"Turn this on?"* — she taps **Yes, turn it on**.
- A Google sign-in popup appears (using the shared account from step 6) — she signs in once. Because
  it's a personal app in Testing mode, Google will show an "unverified app" warning screen first — she
  taps **Advanced** → **Go to My Madam G (unsafe)** to continue. That warning is standard for any
  personal-use Google integration that hasn't gone through Google's business verification; it's not a
  sign anything is actually wrong, but it's worth telling her in advance so it isn't alarming (see
  `SEND_TO_HER.md`).
- Done — from then on it syncs silently in the background whenever she logs something, opens the app, or
  roughly every 15 minutes while it's open. No passphrase typing, no settings menu required on her end.

**Your side:**
- Open `partner.html` on your own phone (install it the same way, or just bookmark it) using the same
  `?setup=` link (or type the passphrase in manually — same field, your choice). It shows her full
  calendar and insights (tap any day for flow/symptoms/temperature/notes/exercise detail), plus a
  **Schedule** tab where you add or remove exercises — anything you add there pushes to her app
  automatically. It caches the last-synced data so it still shows something if opened offline, and
  re-checks every 5 minutes or so while open.

If you skip Drive setup entirely, the sync buttons just show a friendly "not configured yet" message —
the rest of the app is unaffected either way.

## Backups

Settings → **Export backup (JSON)** downloads everything on the device. Since there's no cloud storage,
this is the only way to recover data if the phone is lost, reset, or the browser's storage is cleared.
Do this occasionally and keep the file somewhere safe. **Import backup** restores from that file.
