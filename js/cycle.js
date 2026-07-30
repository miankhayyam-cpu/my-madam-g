import { getLogs, getSettings } from './storage.js';

const DAY_MS = 86400000;

export function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

export function diffDays(aStr, bStr) {
  return Math.round((parseDate(bStr) - parseDate(aStr)) / DAY_MS);
}

/** Derive discrete cycles from sparse flow logs. A cycle starts on the first
 * flow day that isn't immediately preceded by another flow day. */
export function computeCycles() {
  const logs = getLogs();
  const flowDates = Object.keys(logs)
    .filter((d) => logs[d].flow > 0)
    .sort();
  if (flowDates.length === 0) return [];

  const starts = [];
  let prev = null;
  for (const d of flowDates) {
    if (prev === null || diffDays(prev, d) > 1) starts.push(d);
    prev = d;
  }

  return starts.map((startDate, i) => {
    const nextStart = starts[i + 1] || null;
    const periodLength = countConsecutiveFlowDays(logs, startDate);
    return {
      startDate,
      nextStart,
      length: nextStart ? diffDays(startDate, nextStart) : null,
      periodLength,
    };
  });
}

function countConsecutiveFlowDays(logs, startDate) {
  let count = 0;
  let cursor = startDate;
  while (logs[cursor] && logs[cursor].flow > 0) {
    count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = average(arr);
  return Math.sqrt(average(arr.map((x) => (x - m) ** 2)));
}

/** Estimate ovulation day-of-cycle for a completed cycle from BBT shift:
 * looks for 3 consecutive days >=0.2C above the mean of the prior 6 days. */
function detectOvulationDayIndex(cycle) {
  const logs = getLogs();
  if (!cycle.length) return null;
  const days = [];
  for (let i = 0; i < cycle.length; i += 1) {
    const dateStr = addDays(cycle.startDate, i);
    days.push(logs[dateStr]?.bbt ?? null);
  }
  for (let i = 6; i <= days.length - 3; i += 1) {
    const baseline = days.slice(i - 6, i).filter((v) => v != null);
    if (baseline.length < 4) continue;
    const baseAvg = average(baseline);
    const shiftDays = days.slice(i, i + 3);
    if (shiftDays.every((v) => v != null && v >= baseAvg + 0.2)) {
      return i;
    }
  }
  return null;
}

export function getPredictions() {
  const settings = getSettings();
  const cycles = computeCycles();
  if (cycles.length === 0) return null;

  const completed = cycles.filter((c) => c.length != null);
  const recentCompleted = completed.slice(-settings.predictionCycleCount);
  const lengths = recentCompleted.map((c) => c.length);

  const avgCycleLength = lengths.length ? Math.round(average(lengths)) : 28;
  const avgPeriodLength = Math.round(
    average(cycles.slice(-settings.predictionCycleCount).map((c) => c.periodLength))
  );

  const lutealSamples = recentCompleted
    .map((c) => {
      const ovIdx = detectOvulationDayIndex(c);
      return ovIdx != null ? c.length - ovIdx : null;
    })
    .filter((v) => v != null);
  const lutealPhaseLength = lutealSamples.length
    ? Math.round(average(lutealSamples))
    : settings.lutealPhaseLength;

  const latest = cycles[cycles.length - 1];
  const lastPeriodStart = latest.startDate;
  const nextPredictedStart = latest.nextStart || addDays(lastPeriodStart, avgCycleLength);

  const predictedOvulationDay = addDays(nextPredictedStart, -lutealPhaseLength);
  const fertileWindowStart = addDays(predictedOvulationDay, -5);
  const fertileWindowEnd = predictedOvulationDay;
  const pmsStart = addDays(nextPredictedStart, -settings.pmsLeadDays);

  const today = toDateStr(new Date());
  const cycleDayToday = diffDays(lastPeriodStart, today) + 1;

  const isIrregular = lengths.length >= 3 && stddev(lengths) > 7;

  return {
    cycles,
    lastPeriodStart,
    avgCycleLength,
    avgPeriodLength,
    lutealPhaseLength,
    nextPredictedStart,
    predictedOvulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    pmsStart,
    cycleDayToday,
    isIrregular,
    recentLengths: lengths,
  };
}

export function dayType(dateStr, predictions) {
  const logs = getLogs();
  const log = logs[dateStr];
  const types = [];
  if (log && log.flow > 0) types.push('period-actual');
  if (predictions) {
    if (dateStr === predictions.predictedOvulationDay) types.push('ovulation');
    else if (dateStr >= predictions.fertileWindowStart && dateStr <= predictions.fertileWindowEnd)
      types.push('fertile');
    if (
      dateStr >= predictions.nextPredictedStart &&
      dateStr < addDays(predictions.nextPredictedStart, predictions.avgPeriodLength) &&
      !(log && log.flow > 0)
    ) {
      types.push('period-predicted');
    }
    if (
      dateStr >= predictions.pmsStart &&
      dateStr < predictions.nextPredictedStart
    ) {
      types.push('pms');
    }
  }
  return types;
}
