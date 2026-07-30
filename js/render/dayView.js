import { getLog, getSymptoms, getExerciseSchedule } from '../storage.js';

const FLOW_LABELS = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];

function formatDateHeading(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export function openDayView(dateStr, sheetRoot) {
  const log = getLog(dateStr);
  const symptomNames = getSymptoms();
  const schedule = getExerciseSchedule();

  const symptomLabels = (log?.symptoms || [])
    .map((id) => symptomNames.find((s) => s.id === id)?.name || id)
    .join(', ') || 'None logged';

  const exerciseRows = schedule
    .map((ex) => `<div class="stat-row"><span>${ex.name}</span><strong>${log?.exercise?.[ex.id] ?? '—'}</strong></div>`)
    .join('');

  sheetRoot.innerHTML = `
    <div class="sheet-backdrop" id="view-backdrop"></div>
    <div class="sheet-content">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h2>${formatDateHeading(dateStr)}</h2>
        <button class="icon-btn" id="view-close" aria-label="Close">&times;</button>
      </div>
      <div class="stats-grid">
        <div class="stat-row"><span>Flow</span><strong>${FLOW_LABELS[log?.flow || 0]}</strong></div>
        <div class="stat-row"><span>Basal body temp</span><strong>${log?.bbt ?? '—'}</strong></div>
        <div class="stat-row"><span>Energy</span><strong>${log?.energy ?? '—'}</strong></div>
        <div class="stat-row"><span>Symptoms</span><strong>${symptomLabels}</strong></div>
      </div>
      ${exerciseRows ? `<h3 class="section-title">Exercise</h3><div class="stats-grid">${exerciseRows}</div>` : ''}
      ${log?.notes ? `<h3 class="section-title">Notes</h3><p class="muted">${log.notes}</p>` : ''}
      ${!log ? '<p class="muted" style="margin-top:16px;">Nothing logged this day.</p>' : ''}
    </div>
  `;

  const close = () => sheetRoot.classList.remove('open');
  sheetRoot.querySelector('#view-backdrop').addEventListener('click', close);
  sheetRoot.querySelector('#view-close').addEventListener('click', close);
  sheetRoot.classList.add('open');
}
