import { exportAll, importAll, getExerciseSchedule, saveExerciseSchedule } from './storage.js';
import { encryptJSON, decryptJSON } from './crypto.js';
import { pushFile, pullFile, SYNC_FILENAME, SCHEDULE_FILENAME } from './drive.js';

/** Her app owns this file: full logs/symptoms/settings/schedule, so a partner
 * dashboard can render the same calendar and insights she sees. */
export async function pushFullDataToDrive(passphrase) {
  const encrypted = await encryptJSON(exportAll(), passphrase);
  await pushFile(SYNC_FILENAME, encrypted);
}

export async function pullFullDataFromDrive(passphrase) {
  const encrypted = await pullFile(SYNC_FILENAME);
  if (!encrypted) return false;
  const data = await decryptJSON(encrypted, passphrase);
  importAll(data);
  return true;
}

/** The partner's dashboard owns this file: whatever exercises they've assigned. */
export async function pushScheduleToDrive(passphrase) {
  const payload = { schedule: getExerciseSchedule(), updatedAt: new Date().toISOString() };
  const encrypted = await encryptJSON(payload, passphrase);
  await pushFile(SCHEDULE_FILENAME, encrypted);
}

export async function pullScheduleFromDrive(passphrase) {
  const encrypted = await pullFile(SCHEDULE_FILENAME);
  if (!encrypted) return false;
  const data = await decryptJSON(encrypted, passphrase);
  if (data?.schedule) saveExerciseSchedule(data.schedule);
  return true;
}

/** Her side's routine sync: publish her data, pick up any schedule updates
 * from her partner. Both steps are independent — one failing shouldn't block
 * the other. */
export async function runHerSync(passphrase) {
  const results = await Promise.allSettled([
    pushFullDataToDrive(passphrase),
    pullScheduleFromDrive(passphrase),
  ]);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
}

/** His side's routine sync: pick up her latest data, republish the schedule
 * in case he edited it on another device. */
export async function runPartnerSync(passphrase) {
  const results = await Promise.allSettled([
    pullFullDataFromDrive(passphrase),
    pullScheduleFromDrive(passphrase),
  ]);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
}
