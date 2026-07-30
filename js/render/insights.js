import { getLogs, getSymptoms } from '../storage.js';
import { diffDays, toDateStr } from '../cycle.js';
import { computeExerciseStats } from '../exercise.js';

function daysUntil(dateStr) {
  const today = toDateStr(new Date());
  return diffDays(today, dateStr);
}

function symptomFrequency() {
  const logs = getLogs();
  const symptoms = getSymptoms();
  const counts = {};
  Object.values(logs).forEach((log) => {
    (log.symptoms || []).forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  const totalLoggedDays = Object.keys(logs).length || 1;
  return symptoms
    .map((s) => ({ ...s, count: counts[s.id] || 0, pct: Math.round(((counts[s.id] || 0) / totalLoggedDays) * 100) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function renderExerciseSection() {
  const { schedule, totals, streakDays } = computeExerciseStats();
  if (schedule.length === 0) return '';
  const rows = schedule
    .map(
      (ex) => `<div class="stat-row"><span>${ex.name} (this week)</span><strong>${totals[ex.id]?.weekTotal ?? 0}</strong></div>`
    )
    .join('');
  return `
    <h3 class="section-title">Exercise</h3>
    <div class="stats-grid">
      <div class="stat-row"><span>Current streak</span><strong>${streakDays} day${streakDays === 1 ? '' : 's'}</strong></div>
      ${rows}
    </div>
  `;
}

export function renderInsights(root, predictions) {
  if (!predictions) {
    root.innerHTML = `
      <div class="empty-state">
        <p>Log at least one period to start seeing predictions and insights here.</p>
      </div>
      ${renderExerciseSection()}
    `;
    return;
  }

  const untilNext = daysUntil(predictions.nextPredictedStart);
  const nextLabel = untilNext <= 0 ? 'Any day now' : `In ${untilNext} day${untilNext === 1 ? '' : 's'}`;
  const fertileNow =
    toDateStr(new Date()) >= predictions.fertileWindowStart &&
    toDateStr(new Date()) <= predictions.fertileWindowEnd;

  const freq = symptomFrequency();
  const freqHtml = freq.length
    ? freq
        .map(
          (s) => `<div class="freq-row">
            <div class="freq-label">${s.name}</div>
            <div class="freq-bar-track"><div class="freq-bar" style="width:${s.pct}%"></div></div>
            <div class="freq-pct">${s.pct}%</div>
          </div>`
        )
        .join('')
    : '<p class="muted">No symptoms logged yet.</p>';

  root.innerHTML = `
    <div class="insight-cards">
      <div class="insight-card">
        <div class="insight-value">${predictions.cycleDayToday}</div>
        <div class="insight-label">Cycle day</div>
      </div>
      <div class="insight-card">
        <div class="insight-value">${nextLabel}</div>
        <div class="insight-label">Next period (${predictions.nextPredictedStart})</div>
      </div>
      <div class="insight-card ${fertileNow ? 'highlight' : ''}">
        <div class="insight-value">${fertileNow ? 'Yes' : 'No'}</div>
        <div class="insight-label">Fertile window now</div>
      </div>
    </div>

    ${predictions.isIrregular ? `
      <div class="notice-banner">
        Your last few cycles have varied by more than a week in length. This alone isn't diagnostic of
        anything, but if it's a persistent pattern it may be worth mentioning to a doctor.
      </div>` : ''}

    <div class="stats-grid">
      <div class="stat-row"><span>Average cycle length</span><strong>${predictions.avgCycleLength} days</strong></div>
      <div class="stat-row"><span>Average period length</span><strong>${predictions.avgPeriodLength} days</strong></div>
      <div class="stat-row"><span>Estimated luteal phase</span><strong>${predictions.lutealPhaseLength} days</strong></div>
      <div class="stat-row"><span>Predicted ovulation</span><strong>${predictions.predictedOvulationDay}</strong></div>
      <div class="stat-row"><span>Cycles tracked</span><strong>${predictions.cycles.length}</strong></div>
    </div>

    <h3 class="section-title">Most common symptoms</h3>
    <div class="freq-list">${freqHtml}</div>

    ${renderExerciseSection()}
  `;
}
