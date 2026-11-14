// Файл «js/99_start.js»: клавиатура, обновление свайпом вниз и запуск приложения (init) — грузится последним
// ---- клавиатура: «Готово», тап мимо поля, Enter → следующее поле ----
function initKeyboard() {
  const isField = el => !!el && ((el.tagName === 'INPUT' && !/^(checkbox|radio|file|button|submit|date|time)$/.test(el.type)) || el.tagName === 'TEXTAREA');
  const hide = () => { const a = document.activeElement; if (isField(a)) a.blur(); };
  // тап по пустому месту закрывает клавиатуру
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!isField(document.activeElement)) return;
    const t = e.target, c = e.changedTouches[0];
    if (Math.abs(c.clientX - sx) > 10 || Math.abs(c.clientY - sy) > 10) return;   // это был скролл
    if (isField(t) || (t.closest && t.closest('label,select,button,.field'))) return;
    hide();
  }, { passive: true });
  // Enter: в подсчёте — к следующему полю, иначе закрыть клавиатуру
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    const list = [...document.querySelectorAll('input[data-id],input[data-oid],input[data-ing]')].filter(i => !i.disabled);
    const i = list.indexOf(e.target);
    if (i >= 0 && list[i + 1]) { list[i + 1].focus(); list[i + 1].select && list[i + 1].select(); } else hide();
  });
}

// ---- обновление свайпом вниз ----
async function refreshAll() {
  taskData = evData = homeData = hist = cfg = tkCards = null; cfgP = tkP = null;
  fridgeData = bkData = cardData = null;
  Object.keys(shiftCache).forEach(k => delete shiftCache[k]); Object.keys(shiftLoading).forEach(k => delete shiftLoading[k]);
  await boot(); render(); prefetch();
}
// вход: «me» и данные «Сегодня» одним запросом (раньше — два подряд, каждый ~2–3 секунды)
async function boot() {
  const m = await call('boot');
  if (m._home) { homeData = m._home; homeP = Promise.resolve(homeData); homeAt = Date.now(); }
  delete m._home;
  me = m;
}
function initPull() {
  const ind = document.createElement('div'); ind.id = 'pull'; document.body.appendChild(ind);
  let y0 = null, dy = 0, busy = false;
  window.addEventListener('touchstart', e => { if (window.scrollY <= 0 && !document.getElementById('sheet') && !busy) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (y0 == null) return;
    if (tabDragOn) { y0 = null; ind.style.opacity = 0; return; }   // тащат вкладку — не обновляем
    dy = e.touches[0].clientY - y0;
    if (dy <= 0) { ind.style.opacity = 0; return; }
    const k = Math.min(dy, 120);
    ind.style.opacity = Math.min(1, k / 70); ind.style.transform = `translate(-50%, ${k * 0.6}px) rotate(${k * 3}deg)`;
    ind.classList.toggle('ready', dy > 80);
  }, { passive: true });
  window.addEventListener('touchend', async () => {
    if (y0 == null) return; y0 = null;
    if (dy > 80) {
      busy = true; ind.classList.add('spin'); ind.style.transform = 'translate(-50%, 40px)';
      try { await refreshAll(); toast('Обновлено ✨'); } catch (e) { toast(e.message); }
      busy = false; ind.classList.remove('spin');
    }
    ind.style.opacity = 0; ind.style.transform = 'translate(-50%, 0)'; ind.classList.remove('ready');
  });
}

(async function init() {
  const fail = (ic, t, s) => app.innerHTML = `<main style="padding-top:40px">${empty(ic, t, s)}</main>`;
  if (!tg || !tg.initData) return fail('📱', 'Открой через бота', 'Приложение работает только внутри Телеграма.');
  tg.ready(); tg.expand();
  applyTheme();
  try { tg.onEvent('themeChanged', applyTheme); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  if (!API) return fail('🔌', 'Нет адреса сервера', 'Открой приложение кнопкой в боте.');
  try {
    await boot();
    const restored = me.canClose && loadDraft();
    const h = new Date().getHours();
    if (me.canClose && (h >= 20 || h < 3)) tab = 'count';
    if (me.orderer && !me.isAdmin) tab = 'order';
    if (restored) tab = 'count';
    render();
    prefetch();
    if (restored) setTimeout(() => toast('Черновик закрытия восстановлен ✍️'), 400);
    initKeyboard();
  } catch (e) { fail('🔒', esc(e.message), ''); }
})();
