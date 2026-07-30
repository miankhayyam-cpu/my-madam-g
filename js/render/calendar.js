import { getLogs } from '../storage.js';
import { toDateStr, dayType, addDays } from '../cycle.js';

let viewYear, viewMonth; // 0-indexed month

function ensureViewInit() {
  if (viewYear == null) {
    const now = new Date();
    viewYear = now.getUTCFullYear();
    viewMonth = now.getUTCMonth();
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function renderCalendar(root, predictions, onDayTap) {
  ensureViewInit();
  const logs = getLogs();
  const today = toDateStr(new Date());

  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const dayCellsHtml = cells
    .map((d) => {
      if (d == null) return '<div class="cal-cell empty"></div>';
      const dateStr = toDateStr(new Date(Date.UTC(viewYear, viewMonth, d)));
      const types = dayType(dateStr, predictions);
      const hasLog = !!logs[dateStr];
      const classes = ['cal-cell', ...types];
      if (dateStr === today) classes.push('today');
      if (hasLog) classes.push('has-log');
      return `<button class="${classes.join(' ')}" data-date="${dateStr}">
        <span class="cal-daynum">${d}</span>
        ${types.includes('ovulation') ? '<span class="cal-dot ov"></span>' : ''}
      </button>`;
    })
    .join('');

  root.innerHTML = `
    <div class="cal-header">
      <button class="icon-btn" id="cal-prev" aria-label="Previous month">&#8592;</button>
      <div class="cal-title">${MONTH_NAMES[viewMonth]} ${viewYear}</div>
      <button class="icon-btn" id="cal-next" aria-label="Next month">&#8594;</button>
    </div>
    <div class="cal-weekdays">
      ${['S','M','T','W','T','F','S'].map((w) => `<div>${w}</div>`).join('')}
    </div>
    <div class="cal-grid">${dayCellsHtml}</div>
    <div class="cal-legend">
      <span><i class="dot period"></i>Period</span>
      <span><i class="dot predicted"></i>Predicted</span>
      <span><i class="dot fertile"></i>Fertile window</span>
      <span><i class="dot ov"></i>Ovulation</span>
      <span><i class="dot pms"></i>PMS</span>
    </div>
  `;

  root.querySelector('#cal-prev').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar(root, predictions, onDayTap);
  });
  root.querySelector('#cal-next').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar(root, predictions, onDayTap);
  });
  root.querySelectorAll('.cal-cell[data-date]').forEach((btn) => {
    btn.addEventListener('click', () => onDayTap(btn.dataset.date));
  });
}
