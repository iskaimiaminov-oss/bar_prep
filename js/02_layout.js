// Файл «js/02_layout.js»: шапка, вкладки (и перетаскивание), render — отрисовка экрана, предзагрузка; объявление views/binds
const LOOP = `<svg class="loop" viewBox="0 0 200 200" fill="none" stroke="#F2F5CF" stroke-width="5" stroke-linecap="round"><path d="M20 150c30-10 50-40 60-70s5-55 25-60 30 20 15 45-40 30-35 10 30-25 55-10 10 45-20 50-25-20 5-30 45 0 40 30"/></svg>`;

function header() {
  const first = String(me.name || '').split(' ')[0];
  // справа сверху: «?» — инструкция, кружок с буквой — профиль (у точек Яндекс/Узум их нет)
  const acts = me.orderer && !me.isAdmin ? '' : `<div class="hero-acts">
      <button class="hbtn" id="helpBtn" aria-label="Инструкция">?</button>
      <button class="hbtn me ${tab === 'profile' ? 'on' : ''}" id="meBtn" aria-label="Профиль" style="${AVATARS[me.name] ? `background:url('${AVATARS[me.name]}') center/cover;color:transparent` : ''}">${esc(String(me.name || '?')[0])}</button></div>`;
  return `<div class="hero">${LOOP}${acts}
    <div class="brand"><img class="logo" src="${LOGO}" alt=""><div><h1>Рассвет</h1><p>Твоя любимая кофейня🫶</p></div></div>
    <div class="hello">Привет, ${esc(first)} 👋</div></div>`;
}
function tabsList() { return sortTabs(tabsBase()); }
function tabsBase() {
  if (me.orderer && !me.isAdmin) return me.grWe && me.grTab ? [['order', 'Заказ'], ['grafik', 'График']] : [['order', 'Заказ']];   // Азиз: сб/вс в Рассвете
  const tasksLbl = 'Задачи' + (me.openTasks ? `<span class="tabcount">${me.openTasks}</span>` : '');
  const t = [['today', 'Сегодня'], ['count', 'Закрытие'], ['cash', 'Наличные'], ['tasks', tasksLbl], ['events', 'События'], ['fridge', 'Холодильник'], ['tk', 'Техкарты'], ['regs', 'Регламент']];
  if (me.isAdmin || (me.grTab && !me.isOwner && (me.statuses || {})[me.name] !== 'управляющий')) t.splice(5, 0, ['grafik', 'График']);   // владельцам и управляющим не нужна
  if (me.isAdmin) t.push(['preps', 'Заготовки'], ['staff', 'Команда'], ['history', 'История']);
  else if (me.isViewer) t.push(['history', 'История']);   // админ-наблюдатель: всё как у сотрудника + история закрытий
  return t;
}
// ---- свой порядок вкладок: зажал ~0,4 с → тащи → отпустил (хранится в боте, TABS_<id>) ----
function sortTabs(t) {
  const ord = String((me && me.tabOrder) || '').split(',').filter((k, i, a) => k && a.indexOf(k) === i);
  if (!ord.length) return t;
  const by = {}; t.forEach(x => by[x[0]] = x);
  const out = ord.filter(k => by[k]).map(k => by[k]);
  t.forEach((x, i) => { if (out.indexOf(x) < 0) out.splice(Math.min(i, out.length), 0, x); });   // новые вкладки — на своё обычное место
  return out;
}
let tabSt = null, tabDragOn = false, tabDragEnd = 0;
function tabNat(el) { return el.offsetLeft - el.parentNode.scrollLeft; }
function tabPlace() {
  const s = tabSt, bar = s.bar, el = s.el, w = el.offsetWidth, vis = s.px - s.grab;
  const others = [...bar.querySelectorAll('.tab')].filter(t => t !== el);
  let idx = 0; others.forEach(t => { if (tabNat(t) + t.offsetWidth / 2 < vis + w / 2) idx++; });
  if ([...bar.querySelectorAll('.tab')].indexOf(el) !== idx) {
    const before = new Map(others.map(t => [t, tabNat(t)]));
    bar.insertBefore(el, others[idx] || null);
    others.forEach(t => {
      const dx = before.get(t) - tabNat(t); if (!dx) return;
      t.style.transition = 'none'; t.style.transform = `translateX(${dx}px)`; t.offsetWidth;
      t.style.transition = 'transform .18s ease'; t.style.transform = '';
    });
    try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
  }
  el.style.transform = `translateX(${vis - tabNat(el)}px) scale(1.06)`;
}
function tabTick() {   // у края полосы — сама прокручивается, чтобы дотащить до начала или конца
  const s = tabSt; if (!s || !s.on) return;
  const bar = s.bar, edge = 44, W = bar.clientWidth;
  const v = s.px < edge ? -Math.ceil((edge - s.px) / 4) : s.px > W - edge ? Math.ceil((s.px - W + edge) / 4) : 0;
  if (v) { const x0 = bar.scrollLeft; bar.scrollLeft += v; if (bar.scrollLeft !== x0) tabPlace(); }
  s.raf = setTimeout(tabTick, 16);
}
function tabStart() {
  const s = tabSt; if (!s) return;
  s.on = tabDragOn = true;
  s.grab = s.px - tabNat(s.el);
  s.bar.classList.add('drag'); s.el.classList.add('lift');
  try { tg.HapticFeedback.impactOccurred('medium'); } catch (e) {}
  tabPlace(); s.raf = setTimeout(tabTick, 16);
}
function tabFinish() {
  const s = tabSt; if (!s) return; tabSt = null; clearTimeout(s.timer);
  if (!s.on) return;
  clearTimeout(s.raf); tabDragEnd = Date.now(); tabDragOn = false;
  const bar = s.bar, el = s.el;
  bar.classList.remove('drag'); el.classList.remove('lift'); el.style.transform = '';
  const ord = [...bar.querySelectorAll('.tab')].map(t => t.dataset.tab);
  if (ord.join() === tabsList().map(x => x[0]).join()) return;
  me.tabOrder = ord.join(','); render.tabScroll = bar.scrollLeft;
  haptic('success');
  call('tabOrder', { o: ord }).catch(e => toast('Порядок не сохранился: ' + e.message));
}
function initTabDrag(bar) {
  bar.addEventListener('pointerdown', e => {
    const el = e.target.closest('.tab'); if (!el || tabSt || (e.pointerType === 'mouse' && e.button !== 0)) return;
    tabSt = { bar, el, id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, px: e.clientX - bar.getBoundingClientRect().left };
    tabSt.timer = setTimeout(tabStart, 400);
  });
  bar.addEventListener('contextmenu', e => e.preventDefault());
  if (initTabDrag.done) return; initTabDrag.done = true;
  window.addEventListener('pointermove', e => {
    const s = tabSt; if (!s || e.pointerId !== s.id) return;
    s.px = e.clientX - s.bar.getBoundingClientRect().left;
    if (!s.on) { if (Math.abs(e.clientX - s.x0) > 8 || Math.abs(e.clientY - s.y0) > 8) { clearTimeout(s.timer); tabSt = null; } return; }   // палец поехал раньше — это прокрутка
    tabPlace();
  });
  window.addEventListener('pointerup', e => { if (tabSt && e.pointerId === tabSt.id) tabFinish(); });
  window.addEventListener('pointercancel', e => { if (tabSt && e.pointerId === tabSt.id) tabFinish(); });
  window.addEventListener('touchmove', e => { if (tabDragOn) e.preventDefault(); }, { passive: false });
}
render.seq = 0;
async function render() {
  const tabs = tabsList().map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('');
  const my = ++render.seq;
  // та же вкладка — после перерисовки остаёмся на том же месте экрана (иначе прыгает наверх)
  const keep = tab === render.lastTab && !render.toTop, y = window.scrollY;
  render.lastTab = tab; render.toTop = false;
  if (keep) app.style.minHeight = app.offsetHeight + 'px';
  app.innerHTML = header() + `<div class="tabs-wrap"><div class="tabs">${tabs}</div></div><main id="main"></main>`;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab === tab || Date.now() - tabDragEnd < 400) return; tab = b.dataset.tab; lastResult = null; render(); window.scrollTo(0, 0); });
  const hb = document.getElementById('helpBtn'); if (hb) hb.onclick = openHelp;
  const mb = document.getElementById('meBtn'); if (mb) mb.onclick = () => { if (tab === 'profile') return; tab = 'profile'; render(); window.scrollTo(0, 0); };
  // активная вкладка — по центру полосы вкладок (плавно, от прошлой позиции)
  const bar = app.querySelector('.tabs'), on = bar && bar.querySelector('.tab.on');
  if (bar) initTabDrag(bar);
  if (bar && on) {
    bar.scrollLeft = render.tabScroll || 0;
    const target = Math.max(0, on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2);
    requestAnimationFrame(() => bar.scrollTo({ left: target, behavior: render.tabScroll == null ? 'auto' : 'smooth' }));
    render.tabScroll = target;
    bar.addEventListener('scroll', () => { render.tabScroll = bar.scrollLeft; }, { passive: true });
  }
  const main = document.getElementById('main');
  const slow = setTimeout(() => { if (my === render.seq) main.innerHTML = card('<div class="loader" style="min-height:160px"><img src="' + LOGO + '" alt="" style="width:56px;height:56px"><span>Загружаю…</span></div>'); }, 120);
  let body = '';
  try { body = await views[tab](); } catch (e) { body = card(`<p style="color:var(--danger);margin:0">${esc(e.message)}</p>`); }
  clearTimeout(slow);
  if (my !== render.seq) return;           // пока грузилось, переключили вкладку
  main.innerHTML = body;
  (binds[tab] || (() => {}))();
  app.style.minHeight = '';
  if (keep) window.scrollTo(0, y);
}

let tkP = null, cfgP = null, namesP = null;
async function getTk() { if (tkCards) return tkCards; tkP = tkP || call('tk').then(r => tkCards = r.cards).catch(e => { tkP = null; throw e; }); return tkP; }
async function getCfg() { if (cfg) return cfg; cfgP = cfgP || call('config').then(r => cfg = r).catch(e => { cfgP = null; throw e; }); return cfgP; }
async function getNames() { if (names) return names; namesP = namesP || call('names').then(r => names = r.names).catch(e => { namesP = null; throw e; }); return namesP; }
function prefetch() {
  getTk().catch(() => {});
  if (me.isAdmin) getCfg().catch(() => {});
}

const views = {
};

const binds = {
};
