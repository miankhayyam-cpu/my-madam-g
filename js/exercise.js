import { getLogs, getExerciseSchedule } from './storage.js';
import { toDateStr, addDays } from './cycle.js';

function loggedOnDay(exercise) {
  return !!exercise && Object.values(exercise).some((v) => v != null && v > 0);
}

export function computeExerciseStats() {
  const logs = getLogs();
  const schedule = getExerciseSchedule();
  const today = toDateStr(new Date());

  const totals = {};
  schedule.forEach((ex) => { totals[ex.id] = { weekTotal: 0, allTimeTotal: 0 }; });

  Object.entries(logs).forEach(([dateStr, log]) => {
    if (!log.exercise) return;
    const daysAgo = Math.round((new Date(today) - new Date(dateStr)) / 86400000);
    Object.entries(log.exercise).forEach(([id, value]) => {
      if (!totals[id]) totals[id] = { weekTotal: 0, allTimeTotal: 0 };
      const n = Number(value) || 0;
      totals[id].allTimeTotal += n;
      if (daysAgo >= 0 && daysAgo < 7) totals[id].weekTotal += n;
    });
  });

  let streakDays = 0;
  let cursor = today;
  while (loggedOnDay(logs[cursor]?.exercise)) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  return { schedule, totals, streakDays };
}
