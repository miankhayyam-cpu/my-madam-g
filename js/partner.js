import { decryptJSON } from './crypto.js';
import { pullFromDrive } from './drive.js';

const view = document.getElementById('partner-view');
const CACHE_KEY = 'ptrack_partner_cache';
const PASS_KEY = 'ptrack_partner_passphrase';

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

function setCache(summary) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
}

function relativeTime(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} day(s) ago`;
}

function daysUntil(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((new Date(dateStr) - new Date(today)) / 86400000);
}

function renderSummary(summary) {
  if (!summary || !summary.hasData) {
    view.innerHTML = `<div class="empty-state"><p>No cycle data has been shared yet.</p></div>`;
    return;
  }
  const untilNext = daysUntil(summary.nextPredictedStart);
  const fertileNow =
    new Date().toISOString().slice(0, 10) >= summary.fertileWindowStart &&
    new Date().toISOString().slice(0, 10) <= summary.fertileWindowEnd;

  view.innerHTML = `
    <div class="insight-cards">
      <div class="insight-card highlight">
        <div class="insight-value">${summary.phaseLabel}</div>
        <div class="insight-label">Current phase</div>
      </div>
      <div class="insight-card">
        <div class="insight-value">${summary.cycleDayToday}</div>
        <div class="insight-label">Cycle day</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-row"><span>Next period</span><strong>${untilNext <= 0 ? 'Any day now' : `in ${untilNext}d`}</strong></div>
      <div class="stat-row"><span>Fertile window</span><strong>${fertileNow ? 'Active now' : `${summary.fertileWindowStart} → ${summary.fertileWindowEnd}`}</strong></div>
      <div class="stat-row"><span>PMS window starts</span><strong>${summary.pmsStart}</strong></div>
      <div class="stat-row"><span>Average cycle length</span><strong>${summary.avgCycleLength} days</strong></div>
    </div>
    ${summary.isIrregular ? '<div class="notice-banner">Recent cycles have been irregular in length.</div>' : ''}
    <p class="muted">Last synced: ${relativeTime(summary.updatedAt)}</p>
    <div class="settings-actions">
      <button class="btn secondary" id="refresh-btn">Refresh from Drive</button>
    </div>
  `;
  view.querySelector('#refresh-btn').addEventListener('click', refresh);
}

function renderConnectForm(errorMsg) {
  view.innerHTML = `
    <p class="muted">Enter the same passphrase agreed on with your partner to view her shared cycle status.
      This dashboard is read-only and never shows notes, symptoms, or temperature.</p>
    ${errorMsg ? `<div class="notice-banner">${errorMsg}</div>` : ''}
    <label class="field-label">Shared passphrase</label>
    <input type="text" id="passphrase-input" value="${localStorage.getItem(PASS_KEY) || ''}" />
    <div class="settings-actions">
      <button class="btn primary" id="connect-btn">Connect &amp; view</button>
    </div>
  `;
  view.querySelector('#connect-btn').addEventListener('click', refresh);
}

async function refresh() {
  const passphraseInput = document.getElementById('passphrase-input');
  const passphrase = passphraseInput ? passphraseInput.value : localStorage.getItem(PASS_KEY);
  if (!passphrase) { renderConnectForm(); return; }
  localStorage.setItem(PASS_KEY, passphrase);

  try {
    const encrypted = await pullFromDrive();
    const summary = await decryptJSON(encrypted, passphrase);
    setCache(summary);
    renderSummary(summary);
  } catch (err) {
    const cached = getCache();
    if (cached) {
      renderSummary(cached);
    } else {
      renderConnectForm(err.message);
    }
  }
}

function consumeSetupLinkParam() {
  const params = new URLSearchParams(location.search);
  const passphrase = params.get('setup');
  if (!passphrase) return;
  localStorage.setItem(PASS_KEY, passphrase);
  history.replaceState(null, '', location.pathname + location.hash);
}

consumeSetupLinkParam();
const cached = getCache();
if (cached) renderSummary(cached);
else if (localStorage.getItem(PASS_KEY)) refresh();
else renderConnectForm();
