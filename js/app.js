import { getPredictions } from './cycle.js';
import { renderCalendar } from './render/calendar.js';
import { renderInsights } from './render/insights.js';
import { renderSettings, syncPhaseSummaryToDrive } from './render/settings.js';
import { openDayEditor } from './render/dayEditor.js';
import { consumeSetupLinkParam, shouldShowPrompt, renderPartnerPrompt } from './render/partnerPrompt.js';

const view = document.getElementById('view');
const sheet = document.getElementById('sheet');
const onboardSlot = document.getElementById('onboard-slot');
const tabs = document.querySelectorAll('.tab-btn');

let activeTab = 'calendar';

consumeSetupLinkParam();

function maybeAutoSync() {
  const autoSync = localStorage.getItem('ptrack_sync_autosync') === '1';
  const passphrase = localStorage.getItem('ptrack_sync_passphrase');
  if (!autoSync || !passphrase || !navigator.onLine) return;
  syncPhaseSummaryToDrive(passphrase).catch(() => {});
}

function refreshOnboardPrompt() {
  if (shouldShowPrompt()) {
    renderPartnerPrompt(onboardSlot, () => { onboardSlot.innerHTML = ''; refresh(); });
  } else {
    onboardSlot.innerHTML = '';
  }
}

function refresh() {
  refreshOnboardPrompt();
  const predictions = getPredictions();
  if (activeTab === 'calendar') {
    renderCalendar(view, predictions, (dateStr) => {
      openDayEditor(dateStr, sheet, () => { refresh(); maybeAutoSync(); });
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

refresh();
