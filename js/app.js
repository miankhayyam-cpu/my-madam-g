import { getPredictions } from './cycle.js';
import { renderCalendar } from './render/calendar.js';
import { renderInsights } from './render/insights.js';
import { renderSettings } from './render/settings.js';
import { openDayEditor } from './render/dayEditor.js';
import { consumeSetupLinkParam, shouldShowPrompt, renderPartnerPrompt } from './render/partnerPrompt.js';
import { renderReminderBanner, maybeNotify } from './render/reminder.js';
import { runHerSync } from './sync.js';

const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000;

const view = document.getElementById('view');
const sheet = document.getElementById('sheet');
const onboardSlot = document.getElementById('onboard-slot');
const reminderSlot = document.getElementById('reminder-slot');
const tabs = document.querySelectorAll('.tab-btn');

let activeTab = 'calendar';

consumeSetupLinkParam();

function isSyncConfigured() {
  return !!localStorage.getItem('ptrack_sync_passphrase');
}

function autoSync() {
  if (!isSyncConfigured() || !navigator.onLine) return;
  const passphrase = localStorage.getItem('ptrack_sync_passphrase');
  runHerSync(passphrase).then(() => refresh()).catch(() => {});
}

function refreshOnboardPrompt() {
  if (shouldShowPrompt()) {
    renderPartnerPrompt(onboardSlot, () => { onboardSlot.innerHTML = ''; refresh(); });
  } else {
    onboardSlot.innerHTML = '';
  }
}

function openTodayFromReminder(dateStr) {
  openDayEditor(dateStr, sheet, () => { refresh(); autoSync(); });
}

function refresh() {
  refreshOnboardPrompt();
  renderReminderBanner(reminderSlot, openTodayFromReminder);
  maybeNotify();
  const predictions = getPredictions();
  if (activeTab === 'calendar') {
    renderCalendar(view, predictions, (dateStr) => {
      openDayEditor(dateStr, sheet, () => { refresh(); autoSync(); });
    });
  } else if (activeTab === 'insights') {
    renderInsights(view, predictions);
  } else if (activeTab === 'settings') {
    renderSettings(view, refresh);
  }
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    tabs.forEach((b) => b.classList.toggle('active', b === btn));
    refresh();
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') autoSync();
});
setInterval(autoSync, AUTO_SYNC_INTERVAL_MS);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

refresh();
autoSync();
