const KEYS = {
  logs: 'ptrack_logs',
  symptoms: 'ptrack_symptoms',
  settings: 'ptrack_settings',
  schedule: 'ptrack_exercise_schedule',
};

const DEFAULT_SCHEDULE = [
  { id: 'pushups', name: 'Push-ups' },
  { id: 'situps', name: 'Sit-ups' },
];

const DEFAULT_SYMPTOMS = [
  { id: 'cramps', name: 'Cramps', category: 'Physical' },
  { id: 'headache', name: 'Headache', category: 'Physical' },
  { id: 'bloating', name: 'Bloating', category: 'Physical' },
  { id: 'backache', name: 'Backache', category: 'Physical' },
  { id: 'tender_breasts', name: 'Tender breasts', category: 'Physical' },
  { id: 'acne', name: 'Acne', category: 'Physical' },
  { id: 'fatigue', name: 'Fatigue', category: 'Physical' },
  { id: 'nausea', name: 'Nausea', category: 'Physical' },
  { id: 'cravings', name: 'Food cravings', category: 'Physical' },
  { id: 'trouble_sleeping', name: 'Trouble sleeping', category: 'Physical' },
  { id: 'mood_swings', name: 'Mood swings', category: 'Emotional' },
  { id: 'anxiety', name: 'Anxiety', category: 'Emotional' },
  { id: 'low_energy', name: 'Low energy', category: 'Emotional' },
  { id: 'high_energy', name: 'High energy', category: 'Emotional' },
  { id: 'sex_drive_up', name: 'Sex drive up', category: 'Emotional' },
  { id: 'sex_drive_down', name: 'Sex drive down', category: 'Emotional' },
];

const DEFAULT_SETTINGS = {
  cycleGoal: 'track', // track | ttc | avoid | pregnancy
  lutealPhaseLength: 14,
  pmsLeadDays: 5,
  predictionCycleCount: 6,
  theme: 'auto',
  pregnancyStartDate: null,
  reminderEnabled: false,
  reminderTime: '20:00',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return { ...structuredClone(fallback), ...JSON.parse(raw) };
  } catch {
    return structuredClone(fallback);
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLogs() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.logs) || '{}');
  } catch {
    return {};
  }
}

export function getLog(dateStr) {
  return getLogs()[dateStr] || null;
}

function hasExerciseData(exercise) {
  return !!exercise && Object.values(exercise).some((v) => v != null && v !== 0);
}

export function saveLog(dateStr, entry) {
  const logs = getLogs();
  const isEmpty =
    (!entry.flow || entry.flow === 0) &&
    !entry.bbt &&
    !entry.energy &&
    (!entry.symptoms || entry.symptoms.length === 0) &&
    !entry.notes &&
    !hasExerciseData(entry.exercise);
  if (isEmpty) {
    delete logs[dateStr];
  } else {
    logs[dateStr] = entry;
  }
  writeJSON(KEYS.logs, logs);
}

export function deleteLog(dateStr) {
  const logs = getLogs();
  delete logs[dateStr];
  writeJSON(KEYS.logs, logs);
}

export function getSymptoms() {
  const raw = localStorage.getItem(KEYS.symptoms);
  if (!raw) {
    writeJSON(KEYS.symptoms, DEFAULT_SYMPTOMS);
    return structuredClone(DEFAULT_SYMPTOMS);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_SYMPTOMS);
  }
}

export function saveSymptoms(list) {
  writeJSON(KEYS.symptoms, list);
}

export function getExerciseSchedule() {
  const raw = localStorage.getItem(KEYS.schedule);
  if (!raw) {
    writeJSON(KEYS.schedule, DEFAULT_SCHEDULE);
    return structuredClone(DEFAULT_SCHEDULE);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_SCHEDULE);
  }
}

export function saveExerciseSchedule(list) {
  writeJSON(KEYS.schedule, list);
}

export function getSettings() {
  return readJSON(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(patch) {
  const current = getSettings();
  writeJSON(KEYS.settings, { ...current, ...patch });
}

export function exportAll() {
  return {
    exportedAt: new Date().toISOString(),
    version: 2,
    logs: getLogs(),
    symptoms: getSymptoms(),
    settings: getSettings(),
    schedule: getExerciseSchedule(),
  };
}

export function importAll(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup file');
  if (data.logs) writeJSON(KEYS.logs, data.logs);
  if (data.symptoms) writeJSON(KEYS.symptoms, data.symptoms);
  if (data.settings) writeJSON(KEYS.settings, data.settings);
  if (data.schedule) writeJSON(KEYS.schedule, data.schedule);
}

export function wipeAll() {
  localStorage.removeItem(KEYS.logs);
  localStorage.removeItem(KEYS.symptoms);
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.schedule);
}
