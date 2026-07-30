# My Madam G

A private, on-device period tracker built as an installable web app (PWA). No accounts, no ads, no
analytics, no server. All logs live only in the browser's local storage on the phone that logs them.

## What's here

- `index.html` / `js/` / `css/` — the main tracker (calendar, day logging, predictions, insights, settings)
- `partner.html` — a read-only dashboard showing only the current cycle *phase* (never notes, symptoms,
  or temperature), meant for a partner's phone
- `manifest.json` / `sw.js` / `icons/` — makes it installable on Android and usable offline

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

## Optional: partner phase-sync dashboard

By default the app is 100% offline with no sync of any kind. If you want a "what phase is she in" view
on your own phone, there's an opt-in sync using a shared Google Drive file, encrypted client-side with a
passphrase only the two of you know — Google only ever sees ciphertext. This part needs a one-time setup
by you (it requires a Google Cloud account), but her side is a single link tap + one confirmation button.

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
- A card appears: *"Your partner set up a private link... Turn this on?"* — she taps **Yes, turn it on**.
- A Google sign-in popup appears (using the shared account from step 6) — she signs in once. Because
  it's a personal app in Testing mode, Google will show an "unverified app" warning screen first — she
  taps **Advanced** → **Go to My Madam G (unsafe)** to continue. That warning is standard for any
  personal-use Google integration that hasn't gone through Google's business verification; it's not a
  sign anything is actually wrong, but it's worth telling her in advance so it isn't alarming (see
  `SEND_TO_HER.md`).
- Done — from then on it syncs silently in the background whenever she logs something and is online. No
  passphrase typing, no settings menu required on her end.

**Your side:**
- Open `partner.html` on your own phone (install it the same way, or just bookmark it) using the same
  `?setup=` link (or type the passphrase in manually — same field, your choice). It shows her current
  phase, cycle day, days until next period, fertile-window status, and PMS window — nothing more
  detailed than that. It caches the last-synced summary so it still shows something if opened offline.

If you skip Drive setup entirely, the sync buttons just show a friendly "not configured yet" message —
the rest of the app is unaffected either way.

## Backups

Settings → **Export backup (JSON)** downloads everything on the device. Since there's no cloud storage,
this is the only way to recover data if the phone is lost, reset, or the browser's storage is cleared.
Do this occasionally and keep the file somewhere safe. **Import backup** restores from that file.
