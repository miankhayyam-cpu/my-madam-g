import { getSettings, getLog } from '../storage.js';
import { toDateStr } from '../cycle.js';

const NOTIFIED_KEY = 'ptrack_reminder_notified_date';
const DISMISSED_KEY = 'ptrack_reminder_dismissed_date';

function pastReminderTime(reminderTime) {
  const now = new Date();
  const [h, m] = reminderTime.split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function loggedToday() {
  return !!getLog(toDateStr(new Date()));
}

export function shouldRemind() {
  const settings = getSettings();
  if (!settings.reminderEnabled) return false;
  if (loggedToday()) return false;
  if (!pastReminderTime(settings.reminderTime)) return false;
  const today = toDateStr(new Date());
  return localStorage.getItem(DISMISSED_KEY) !== today;
}

/** Fires a system notification at most once per day, only while the app or
 * an installed instance happens to be open — there is no server to wake it
 * up when fully closed. */
export function maybeNotify() {
  if (!shouldRemind()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const today = toDateStr(new Date());
  if (localStorage.getItem(NOTIFIED_KEY) === today) return;
  localStorage.setItem(NOTIFIED_KEY, today);
  new Notification('My Madam G', { body: "Don't forget to log today.", icon: './icons/icon.svg' });
}

export function renderReminderBanner(container, onLogNow) {
  if (!shouldRemind()) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="onboard-card reminder-card">
      <p>You haven't logged anything today yet.</p>
      <div class="settings-actions">
        <button class="btn primary" id="reminder-log-btn">Log now</button>
        <button class="btn secondary" id="reminder-dismiss-btn">Dismiss for today</button>
      </div>
    </div>
  `;
  container.querySelector('#reminder-log-btn').addEventListener('click', () => onLogNow(toDateStr(new Date())));
  container.querySelector('#reminder-dismiss-btn').addEventListener('click', () => {
    localStorage.setItem(DISMISSED_KEY, toDateStr(new Date()));
    container.innerHTML = '';
  });
}
