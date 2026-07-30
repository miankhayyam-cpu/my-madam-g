import { getLogs } from './storage.js';
import { getPredictions } from './cycle.js';
import { runPartnerSync } from './sync.js';
import { renderCalendar } from './render/calendar.js';
import { renderInsights } from './render/insights.js';
import { renderScheduleEditor } from './render/scheduleEditor.js';
import { openDayView } from './render/dayView.js';

const PASS_KEY = 'ptrack_partner_passphrase';
const CONNECTED_KEY = 'ptrack_partner_connected';
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

const view = document.getElementById('partner-view');
const tabBar = document.getElementById('partner-tab-bar');
const sheet = document.getElementById('partner-sheet');
const tabs = tabBar.querySelectorAll('.tab-btn');

let activeTab = 'calendar';

function consumeSetupLinkParam() {
  const params = new URLSearchParams(location.search);
  const passphrase = params.get('setup');
  if (!passphrase) return;
  localStorage.setItem(PASS_KEY, passphrase);
  history.replaceState(null, '', location.pathname + location.hash);
}

function hasLoggedData() {
  return Object.keys(getLogs()).length > 0;
}

function renderConnectForm(errorMsg) {
  tabBar.hidden = true;
  view.innerHTML = `
    <p class="muted">Enter the same passphrase agreed on with your partner to view her tracker.</p>
    ${errorMsg ? `<div class="notice-banner">${errorMsg}</div>` : ''}
    <label class="field-label">Shared passphrase</label>
    <input type="text" id="passphrase-input" value="${localStorage.getItem(PASS_KEY) || ''}" />
    <div class="settings-actions">
      <button class="btn primary" id="connect-btn">Connect &amp; view</button>
    </div>
  `;
  view.querySelector('#connect-btn').addEventListener('click', () => {
    const passphrase = view.querySelector('#passphrase-input').value;
    if (!passphrase) return;
    localStorage.setItem(PASS_KEY, passphrase);
    connectAndSync();
  });
}

function renderDashboard() {
  tabBar.hidden = false;
  const predictions = getPredictions();
  if (activeTab === 'calendar') {
    renderCalendar(view, predictions, (dateStr) => openDayView(dateStr, sheet));
  } else if (activeTab === 'insights') {
    renderInsights(view, predictions);
  } else if (activeTab === 'schedule') {
    renderScheduleEditor(view, localStorage.getItem(PASS_KEY), renderDashboard);
  }
}

async function connectAndSync({ silent } = {}) {
  const passphrase = localStorage.getItem(PASS_KEY);
  if (!passphrase) { renderConnectForm(); return; }
  try {
    await runPartnerSync(passphrase);
    localStorage.setItem(CONNECTED_KEY, '1');
    renderDashboard();
  } catch (err) {
    if (hasLoggedData()) {
      renderDashboard();
    } else if (!silent) {
      renderConnectForm(err.message);
    }
  }
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    tabs.forEach((b) => b.classList.toggle('active', b === btn));
    renderDashboard();
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') connectAndSync({ silent: true });
});
setInterval(() => connectAndSync({ silent: true }), AUTO_SYNC_INTERVAL_MS);

consumeSetupLinkParam();
if (localStorage.getItem(CONNECTED_KEY) === '1' && hasLoggedData()) {
  renderDashboard();
  connectAndSync({ silent: true });
} else {
  connectAndSync();
}
