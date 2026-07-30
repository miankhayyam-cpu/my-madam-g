import { getSettings, saveSettings, getSymptoms, saveSymptoms, exportAll, importAll, wipeAll } from '../storage.js';
import { getPredictions, buildPhaseSummary } from '../cycle.js';
import { encryptJSON } from '../crypto.js';
import { pushToDrive, getLastSyncTime } from '../drive.js';

function getSyncPrefs() {
  return {
    passphrase: localStorage.getItem('ptrack_sync_passphrase') || '',
    autoSync: localStorage.getItem('ptrack_sync_autosync') === '1',
  };
}

function relativeTime(iso) {
  if (!iso) return 'Never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day(s) ago`;
}

function generatePassphrase() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function buildInviteLink(passphrase) {
  return `${location.origin}${location.pathname}?setup=${encodeURIComponent(passphrase)}`;
}

function download(filename, dataObj) {
  const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function syncPhaseSummaryToDrive(passphrase) {
  const summary = buildPhaseSummary(getPredictions());
  const encrypted = await encryptJSON(summary, passphrase);
  await pushToDrive(encrypted);
}

export function renderSettings(root, onChanged) {
  const settings = getSettings();
  const symptoms = getSymptoms();

  root.innerHTML = `
    <h3 class="section-title">Mode</h3>
    <div class="chip-row">
      ${['track', 'ttc', 'avoid', 'pregnancy']
        .map(
          (g) => `<button class="chip ${settings.cycleGoal === g ? 'active' : ''}" data-goal="${g}">${
            { track: 'Track cycle', ttc: 'Trying to conceive', avoid: 'Avoiding pregnancy', pregnancy: 'Pregnancy' }[g]
          }</button>`
        )
        .join('')}
    </div>

    <h3 class="section-title">Prediction tuning</h3>
    <label class="field-label">Default luteal phase length (days)</label>
    <input type="number" id="luteal-input" min="8" max="20" value="${settings.lutealPhaseLength}" />
    <label class="field-label">PMS lead time (days before period)</label>
    <input type="number" id="pms-input" min="1" max="14" value="${settings.pmsLeadDays}" />
    <label class="field-label">Cycles used for averages</label>
    <input type="number" id="cycles-input" min="2" max="12" value="${settings.predictionCycleCount}" />

    <h3 class="section-title">Custom symptoms</h3>
    <div id="symptom-list" class="symptom-manage-list">
      ${symptoms
        .map(
          (s) => `<div class="symptom-manage-row" data-id="${s.id}">
            <span>${s.name} <em>(${s.category})</em></span>
            <button class="icon-btn" data-remove="${s.id}">&times;</button>
          </div>`
        )
        .join('')}
    </div>
    <div class="add-symptom-row">
      <input type="text" id="new-symptom-name" placeholder="Add a symptom..." />
      <button class="btn secondary" id="add-symptom-btn">Add</button>
    </div>

    <h3 class="section-title">Partner sync</h3>
    <p class="muted">Shares only your current cycle phase and predicted dates (no notes, symptoms, or temperature) to a
      shared Google Drive file, encrypted with a passphrase only the two of you know. Requires a one-time Google
      Drive connection and Google account sign-in.</p>
    <label class="field-label">Shared passphrase</label>
    <input type="text" id="sync-passphrase" placeholder="Agree on this with your partner" value="${getSyncPrefs().passphrase}" />
    <div class="chip-row" style="margin-top:10px;">
      <button class="chip ${getSyncPrefs().autoSync ? 'active' : ''}" id="autosync-toggle">Auto-sync on save</button>
    </div>
    <p class="muted" id="sync-status">Last synced: ${relativeTime(getLastSyncTime())}</p>
    <div class="settings-actions">
      <button class="btn primary" id="sync-now-btn">Sync now</button>
      <button class="btn secondary" id="copy-invite-btn">Copy her one-tap setup link</button>
      <p class="muted" id="invite-status"></p>
    </div>

    <h3 class="section-title">Data</h3>
    <p class="muted">Everything is stored only on this device. Nothing is ever sent anywhere. Back up regularly.</p>
    <div class="settings-actions">
      <button class="btn primary" id="export-btn">Export backup (JSON)</button>
      <label class="btn secondary file-btn">
        Import backup
        <input type="file" id="import-input" accept="application/json" hidden />
      </label>
      <button class="btn danger" id="wipe-btn">Erase all data</button>
    </div>
  `;

  root.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      saveSettings({ cycleGoal: btn.dataset.goal });
      renderSettings(root, onChanged);
    });
  });

  const commitNumberField = (id, key, parse = Number) => {
    root.querySelector(id).addEventListener('change', (e) => {
      saveSettings({ [key]: parse(e.target.value) });
      onChanged();
    });
  };
  commitNumberField('#luteal-input', 'lutealPhaseLength');
  commitNumberField('#pms-input', 'pmsLeadDays');
  commitNumberField('#cycles-input', 'predictionCycleCount');

  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const remaining = symptoms.filter((s) => s.id !== btn.dataset.remove);
      saveSymptoms(remaining);
      renderSettings(root, onChanged);
    });
  });

  root.querySelector('#add-symptom-btn').addEventListener('click', () => {
    const input = root.querySelector('#new-symptom-name');
    const name = input.value.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) + '_' + Date.now();
    saveSymptoms([...symptoms, { id, name, category: 'Custom' }]);
    renderSettings(root, onChanged);
  });

  root.querySelector('#export-btn').addEventListener('click', () => {
    download(`my-madam-g-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll());
  });

  root.querySelector('#import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Import will merge/overwrite matching data with this backup. Continue?')) return;
    try {
      const text = await file.text();
      importAll(JSON.parse(text));
      onChanged();
      renderSettings(root, onChanged);
      alert('Backup imported.');
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
  });

  root.querySelector('#sync-passphrase').addEventListener('change', (e) => {
    localStorage.setItem('ptrack_sync_passphrase', e.target.value);
  });

  root.querySelector('#autosync-toggle').addEventListener('click', () => {
    const next = !getSyncPrefs().autoSync;
    localStorage.setItem('ptrack_sync_autosync', next ? '1' : '0');
    renderSettings(root, onChanged);
  });

  root.querySelector('#sync-now-btn').addEventListener('click', async () => {
    const btn = root.querySelector('#sync-now-btn');
    const passphrase = root.querySelector('#sync-passphrase').value;
    if (!passphrase) { alert('Set a shared passphrase first.'); return; }
    localStorage.setItem('ptrack_sync_passphrase', passphrase);
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    try {
      await syncPhaseSummaryToDrive(passphrase);
      root.querySelector('#sync-status').textContent = `Last synced: ${relativeTime(getLastSyncTime())}`;
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sync now';
    }
  });

  root.querySelector('#copy-invite-btn').addEventListener('click', async () => {
    const status = root.querySelector('#invite-status');
    let passphrase = root.querySelector('#sync-passphrase').value.trim();
    if (!passphrase) {
      passphrase = generatePassphrase();
      root.querySelector('#sync-passphrase').value = passphrase;
      localStorage.setItem('ptrack_sync_passphrase', passphrase);
    }
    const link = buildInviteLink(passphrase);
    try {
      await navigator.clipboard.writeText(link);
      status.textContent = 'Link copied — send it to her. Opening it sets everything up in one tap.';
    } catch {
      status.textContent = link;
    }
  });

  root.querySelector('#wipe-btn').addEventListener('click', () => {
    if (!confirm('This permanently erases all logs and settings on this device. Are you sure?')) return;
    if (!confirm('Really sure? This cannot be undone unless you exported a backup.')) return;
    wipeAll();
    onChanged();
    renderSettings(root, onChanged);
  });
}
