import { getExerciseSchedule, saveExerciseSchedule } from '../storage.js';
import { pushScheduleToDrive } from '../sync.js';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40) + '_' + Date.now();
}

export function renderScheduleEditor(root, passphrase, onChanged) {
  const schedule = getExerciseSchedule();

  root.innerHTML = `
    <p class="muted">Whatever's in this list appears on her app for daily logging. Changes sync to her
      automatically next time her app checks in (usually within a few minutes if she's online).</p>
    <div id="schedule-list" class="symptom-manage-list">
      ${schedule
        .map(
          (ex) => `<div class="symptom-manage-row" data-id="${ex.id}">
            <span>${ex.name}</span>
            <button class="icon-btn" data-remove="${ex.id}">&times;</button>
          </div>`
        )
        .join('')}
    </div>
    <div class="add-symptom-row">
      <input type="text" id="new-exercise-name" placeholder="e.g. Planks" />
      <button class="btn secondary" id="add-exercise-btn">Add</button>
    </div>
    <p class="muted" id="schedule-status"></p>
  `;

  async function persist(next) {
    saveExerciseSchedule(next);
    const status = root.querySelector('#schedule-status');
    status.textContent = 'Syncing...';
    try {
      await pushScheduleToDrive(passphrase);
      status.textContent = 'Sent — she\'ll get it next time her app checks in.';
    } catch (err) {
      status.textContent = 'Saved locally, but sync failed: ' + err.message;
    }
    onChanged();
    renderScheduleEditor(root, passphrase, onChanged);
  }

  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      persist(schedule.filter((ex) => ex.id !== btn.dataset.remove));
    });
  });

  root.querySelector('#add-exercise-btn').addEventListener('click', () => {
    const input = root.querySelector('#new-exercise-name');
    const name = input.value.trim();
    if (!name) return;
    persist([...schedule, { id: slugify(name), name }]);
  });
}
