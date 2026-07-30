import { getLastSyncTime } from '../drive.js';
import { runHerSync } from '../sync.js';

const DISMISS_KEY = 'ptrack_onboarding_dismissed';
const PASS_KEY = 'ptrack_sync_passphrase';

/** Reads ?setup=<passphrase> from a one-tap invite link, stores it locally,
 * then strips it from the visible URL/history so the secret doesn't linger there. */
export function consumeSetupLinkParam() {
  const params = new URLSearchParams(location.search);
  const passphrase = params.get('setup');
  if (!passphrase) return;
  localStorage.setItem(PASS_KEY, passphrase);
  localStorage.removeItem(DISMISS_KEY);
  history.replaceState(null, '', location.pathname + location.hash);
}

export function shouldShowPrompt() {
  if (localStorage.getItem(DISMISS_KEY) === '1') return false;
  if (getLastSyncTime()) return false;
  return !!localStorage.getItem(PASS_KEY);
}

export function renderPartnerPrompt(container, onDone) {
  container.innerHTML = `
    <div class="onboard-card">
      <p>Your partner set up a private link so they can see your full tracker — logs, symptoms, and the
      exercises they've asked you to do. It'll also stay in sync automatically after this. Turn this on?</p>
      <div class="settings-actions">
        <button class="btn primary" id="enable-sync-btn">Yes, turn it on</button>
        <button class="btn secondary" id="dismiss-sync-btn">Not now</button>
      </div>
      <p class="muted" id="onboard-status"></p>
    </div>
  `;

  container.querySelector('#enable-sync-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#enable-sync-btn');
    const status = container.querySelector('#onboard-status');
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    try {
      const passphrase = localStorage.getItem(PASS_KEY);
      await runHerSync(passphrase);
      status.textContent = 'Done — sharing is on.';
      setTimeout(onDone, 900);
    } catch (err) {
      status.textContent = 'Could not connect: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Yes, turn it on';
    }
  });

  container.querySelector('#dismiss-sync-btn').addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    onDone();
  });
}
