/* Generic modal show/hide. Each modal is identified by its element id.
   Clicking the scrim, an element with [data-close], or pressing Esc
   closes the topmost open modal. */

const openStack = [];

export function initModals() {
  for (const modal of document.querySelectorAll('.modal')) {
    for (const node of modal.querySelectorAll('[data-close]')) {
      node.addEventListener('click', () => close(modal.id));
    }
  }
}

export function open(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
  if (!openStack.includes(id)) openStack.push(id);
  // Focus the first sensible target.
  const focusable = m.querySelector('button.btn-primary, button[data-close], input');
  focusable?.focus();
}

export function close(id) {
  if (!id) id = openStack.pop();
  else openStack.splice(openStack.indexOf(id), 1);
  if (!id) return;
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}

export function closeTop() {
  if (openStack.length === 0) return false;
  close();
  return true;
}

export function anyOpen() {
  return openStack.length > 0;
}

/* Transient bottom toast. Shared between modules. */
let toastTimer = 0;
export function toast(message, ms = 1800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.remove('hidden');
  // Force a reflow so the transition runs on every show.
  // eslint-disable-next-line no-unused-expressions
  t.offsetHeight;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    t.classList.remove('show');
    toastTimer = window.setTimeout(() => t.classList.add('hidden'), 280);
  }, ms);
}

export function showLevelComplete(level, onNext) {
  const lc = document.getElementById('level-complete');
  document.getElementById('lc-level').textContent = level;
  lc.classList.remove('hidden');
  lc.setAttribute('aria-hidden', 'false');
  const btn = document.getElementById('btn-lc-next');
  btn.onclick = () => { hideLevelComplete(); onNext?.(); };
  btn.focus();
}

export function hideLevelComplete() {
  const lc = document.getElementById('level-complete');
  lc.classList.add('hidden');
  lc.setAttribute('aria-hidden', 'true');
}
