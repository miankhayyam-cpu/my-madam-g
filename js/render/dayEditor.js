import { getLog, saveLog, getSymptoms } from '../storage.js';

const FLOW_LABELS = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];

let currentDate = null;
let draft = null;

function formatDateHeading(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export function openDayEditor(dateStr, sheetRoot, onSaved) {
  currentDate = dateStr;
  const existing = getLog(dateStr) || { flow: 0, bbt: null, energy: null, symptoms: [], notes: '' };
  draft = structuredClone(existing);
  render(sheetRoot, onSaved);
  sheetRoot.classList.add('open');
}

function render(sheetRoot, onSaved) {
  const symptoms = getSymptoms();
  const byCategory = {};
  symptoms.forEach((s) => {
    byCategory[s.category] = byCategory[s.category] || [];
    byCategory[s.category].push(s);
  });

  const symptomsHtml = Object.entries(byCategory)
    .map(
      ([cat, list]) => `
      <div class="symptom-group">
        <div class="symptom-cat">${cat}</div>
        <div class="chip-row">
          ${list
            .map(
              (s) => `<button class="chip ${draft.symptoms.includes(s.id) ? 'active' : ''}" data-symptom="${s.id}">${s.name}</button>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  sheetRoot.innerHTML = `
    <div class="sheet-backdrop" id="sheet-backdrop"></div>
    <div class="sheet-content">
      <div class="sheet-handle"></div>
      <div class="sheet-header">
        <h2>${formatDateHeading(currentDate)}</h2>
        <button class="icon-btn" id="sheet-close" aria-label="Close">&times;</button>
      </div>

      <div class="field-label">Flow</div>
      <div class="chip-row" id="flow-row">
        ${FLOW_LABELS.map(
          (label, i) => `<button class="chip flow-chip ${draft.flow === i ? 'active' : ''}" data-flow="${i}">${label}</button>`
        ).join('')}
      </div>

      <div class="field-label">Basal body temp (&deg;C)</div>
      <input type="number" step="0.01" min="34" max="42" id="bbt-input" value="${draft.bbt ?? ''}" placeholder="e.g. 36.50" />

      <div class="field-label">Energy level</div>
      <div class="chip-row" id="energy-row">
        ${[1, 2, 3, 4, 5].map(
          (n) => `<button class="chip ${draft.energy === n ? 'active' : ''}" data-energy="${n}">${n}</button>`
        ).join('')}
      </div>

      <div class="field-label">Symptoms</div>
      ${symptomsHtml}

      <div class="field-label">Notes</div>
      <textarea id="notes-input" rows="3" placeholder="Anything else worth remembering...">${draft.notes || ''}</textarea>

      <div class="sheet-actions">
        <button class="btn secondary" id="sheet-delete">Clear day</button>
        <button class="btn primary" id="sheet-save">Save</button>
      </div>
    </div>
  `;

  const close = () => sheetRoot.classList.remove('open');

  sheetRoot.querySelector('#sheet-backdrop').addEventListener('click', close);
  sheetRoot.querySelector('#sheet-close').addEventListener('click', close);

  sheetRoot.querySelectorAll('[data-flow]').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.flow = Number(btn.dataset.flow);
      render(sheetRoot, onSaved);
    });
  });
  sheetRoot.querySelectorAll('[data-energy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const n = Number(btn.dataset.energy);
      draft.energy = draft.energy === n ? null : n;
      render(sheetRoot, onSaved);
    });
  });
  sheetRoot.querySelectorAll('[data-symptom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.symptom;
      draft.symptoms = draft.symptoms.includes(id)
        ? draft.symptoms.filter((x) => x !== id)
        : [...draft.symptoms, id];
      render(sheetRoot, onSaved);
    });
  });

  sheetRoot.querySelector('#sheet-save').addEventListener('click', () => {
    draft.bbt = parseFloat(sheetRoot.querySelector('#bbt-input').value) || null;
    draft.notes = sheetRoot.querySelector('#notes-input').value.trim();
    saveLog(currentDate, draft);
    close();
    onSaved();
  });
  sheetRoot.querySelector('#sheet-delete').addEventListener('click', () => {
    draft = { flow: 0, bbt: null, energy: null, symptoms: [], notes: '' };
    saveLog(currentDate, draft);
    close();
    onSaved();
  });
}
