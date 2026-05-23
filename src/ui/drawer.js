/* Left-side drawer panel: settings, navigation buttons, stats. */

let drawerEl, openBtn;
let openHandlers = [], closeHandlers = [];

export function initDrawer(handlers) {
  drawerEl = document.getElementById('drawer');
  openBtn = document.getElementById('btn-menu');
  openBtn.addEventListener('click', open);
  for (const node of drawerEl.querySelectorAll('[data-close]')) {
    node.addEventListener('click', close);
  }

  document.getElementById('btn-howto').addEventListener('click', () => { close(); handlers.onHowto?.(); });
  document.getElementById('btn-levels').addEventListener('click', () => { close(); handlers.onLevels?.(); });
  document.getElementById('btn-daily').addEventListener('click', () => { close(); handlers.onDaily?.(); });
  document.getElementById('btn-achievements').addEventListener('click', () => { close(); handlers.onAchievements?.(); });
  document.getElementById('toggle-theme').addEventListener('change', e => handlers.onToggleTheme?.(e.target.checked));
  document.getElementById('toggle-sound').addEventListener('change', e => handlers.onToggleSound?.(e.target.checked));
  document.getElementById('toggle-motion').addEventListener('change', e => handlers.onToggleMotion?.(e.target.checked));
}

export function open() {
  drawerEl.classList.add('open');
  drawerEl.setAttribute('aria-hidden', 'false');
  for (const fn of openHandlers) fn();
}

export function close() {
  drawerEl.classList.remove('open');
  drawerEl.setAttribute('aria-hidden', 'true');
  for (const fn of closeHandlers) fn();
}

export function isOpen() {
  return drawerEl?.classList.contains('open');
}

export function onOpen(fn) { openHandlers.push(fn); }
export function onClose(fn) { closeHandlers.push(fn); }

export function setStats(stats) {
  document.getElementById('stat-completed').textContent = stats.totalCompleted;
  document.getElementById('stat-streak').textContent = stats.currentStreak;
  document.getElementById('stat-perfect').textContent = stats.perfectClears;
}

export function setToggles(settings) {
  document.getElementById('toggle-theme').checked = settings.theme === 'dark';
  document.getElementById('toggle-sound').checked = !!settings.sound;
  document.getElementById('toggle-motion').checked = !!settings.reduceMotion;
}
