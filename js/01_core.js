// Файл «js/01_core.js»: общее: Телеграм, адрес бота, вызовы call/post, toast, окошки, перевод единиц, глобальные переменные
const tg = window.Telegram && window.Telegram.WebApp;
const API = new URLSearchParams(location.search).get('api');
const app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = x => String(Math.round(Number(x) * 100) / 100).replace('.', ',');
const fmtTs = ts => { const d = new Date(ts); return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) + ', ' + d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); };
const norm2 = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toNum = v => { const s = String(v).replace(/\s/g, '').replace(',', '.'); return s === '' ? '' : Number(s); };
// Вписали граммы/мл вместо кг/л (1600 вместо 1,6): в кг/л больше 50 не бывает. С 26.11 число САМИ НЕ МЕНЯЕМ —
// спрашиваем «Имелось в виду 1,6 л?»: «Да» — поправим, «Нет» — оставляем как вписали и показываем ошибку (больше 50 бот не примет)
const UNIT_BIG = /^(л|l|литр\S*|кг|kg|килограмм\S*)$/i, BIG_MAX = 50;
const bigTo = (v, unit) => { const u = String(unit || '').trim().replace(/\.$/, ''); return UNIT_BIG.test(u) && v > BIG_MAX ? Math.round(v / 10) / 100 : null; };
const unitOfInp = inp => { const w = inp.closest('.field,.amount'); const el = w && w.querySelector('small,b'); return inp.dataset.unit || (el ? el.textContent : ''); };
// окошко-вопрос поверх всего (не закрывает открытое нижнее окно). Возвращает true — «Да, исправить»
function bigAsk(v, g, unit) {
  return new Promise(res => {
    const old = document.getElementById('bigask'); if (old) old.remove();
    const w = document.createElement('div'); w.id = 'bigask'; w.className = 'bigask-bg';
    w.innerHTML = `<div class="bigask"><b>Имелось в виду ${esc(fmt(g))} ${esc(unit)}?</b><p class="sub" style="margin:6px 0 0">Вписано ${esc(fmt(v))} ${esc(unit)} — в ${esc(unit)} столько не бывает (больше ${BIG_MAX}). Похоже, это ${/^(кг|kg|килограмм)/i.test(unit) ? 'граммы' : 'миллилитры'}</p>
      <div class="two" style="margin-top:12px"><button class="btn" data-big="1">Да, ${esc(fmt(g))} ${esc(unit)}</button><button class="btn soft" data-big="0">Нет, оставить</button></div></div>`;
    document.body.appendChild(w);
    w.querySelectorAll('[data-big]').forEach(b => b.onclick = e => { e.stopPropagation(); w.remove(); res(b.dataset.big === '1'); });
  });
}
const bigPend = new WeakMap();   // поле → вопрос, который уже задали (не спрашивать дважды: при уходе из поля и на кнопке)
function bigBad(inp, v, unit) { if (!inp) return; inp.dataset.bigNo = String(v); const f = inp.closest('.field,.amount') || inp; f.classList.add('bad'); }
async function askBigInp(inp, unit) {
  if (bigPend.has(inp)) return bigPend.get(inp);
  const v = toNum(inp.value); if (v === '' || isNaN(v)) return true;
  const u = String(unit != null ? unit : unitOfInp(inp)).trim(), g = bigTo(v, u); if (g == null) return true;
  if (inp.dataset.bigNo === String(v)) return false;   // уже отказались — не спрашиваем снова, ошибка остаётся
  const p = bigAsk(v, g, u).then(yes => {
    bigPend.delete(inp);
    if (yes) { inp.value = fmt(g); delete inp.dataset.bigNo; const f = inp.closest('.field,.amount'); if (f) f.classList.remove('bad'); inp.dispatchEvent(new Event('input', { bubbles: true })); return true; }
    bigBad(inp, v, u); toast(fmt(v) + ' ' + u + ' — больше ' + BIG_MAX + ' ' + u + ' бот не примет. Исправь число');
    return false;
  });
  bigPend.set(inp, p);
  return p;
}
// вышел из поля / нажал «далее» — спрашиваем (число не меняем без «Да»)
document.addEventListener('change', e => { const t = e.target; if (t && t.matches && t.matches('input[inputmode="decimal"]')) askBigInp(t); }, true);
document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.bigNo != null && t.dataset.bigNo !== String(toNum(t.value))) delete t.dataset.bigNo; }, true);
// Проверка на кнопке для списка { v, unit, name, inp }: true — всё в порядке (что исправили по «Да» — уже в list), false — отказались, отправлять нельзя
async function fixBig(list) {
  let ok = true;
  for (const it of list) {
    const g = bigTo(it.v, it.unit); if (g == null) continue;
    let yes;
    if (it.inp) { yes = await askBigInp(it.inp, it.unit); if (yes) it.v = toNum(it.inp.value); }
    else { yes = await bigAsk(it.v, g, String(it.unit || '').trim()); if (yes) it.v = g; }
    if (!yes) ok = false;
  }
  if (!ok) { haptic('error'); toast('Число больше ' + BIG_MAX + ' — исправь или согласись на исправление'); }
  return ok;
}
// техкарта заготовки: по постоянному id (с 26.11) или по старой привязке — названию (key)
const tkOf = (cards, ref) => !ref ? null : (cards || []).find(c => c.id === ref) || (cards || []).find(c => c.key === ref) || null;

const ICONS = ['🍯','🍋','🫙','🧴','🍓','🌿','🥛','🍊','🫐','🍵'];
const icon = name => ICONS[[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % ICONS.length];

let homeData = null, homeP = null, probPhotos = [];
let orderDraft = {}, taskData = null, evData = null, taskForm = { mode: 'all', statuses: [], ids: [] }, evForm = { mode: 'all', statuses: [], ids: [] };
let yv = {};   // итоговый выход, который вписали (pid → текст)
let extraOpen = null;   // блок «Сварил что-то ещё» открыт/закрыт (null — по умолчанию)
let fzv = {};           // сколько из сваренного ушло в морозилку (pid → текст)
let fridgeData = null, bkData = null, cardData = null, cardName = null, bkOpen = false;
let sentCopy = null;   // что отправили на закрытии — вернуть по «Изменить подсчёт»
let sel = new Set(), checks = new Set(), tkCards = null, photos = [];   // photos: {id, src, loading}
let grD = null, grSel = null, grForm = {}, grZ = null, grPrev = null, grVac = null;   // grVac — форма отпуска/больничного   // grPrev — предпросмотр для админа   // вкладка «График»; grZ — день, на который пишем заявление
let me = null, tab = 'today', cfg = null, names = null, who = null, hist = null, lastResult = null, draft = {};
let countReopen = false;   // нажали «Изменить подсчёт» у уже закрытой смены — показываем форму

async function call(action, payload) {
  const q = new URLSearchParams({ action, initData: tg.initData });
  if (payload) q.set('payload', JSON.stringify(payload));
  const r = await fetch(API + '?' + q.toString());
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}
// Действие «сразу на экране»: apply() меняет данные на экране, не дожидаясь бота. Бот в том же ответе присылает свежие данные экрана
// (back: ['me', 'fridge', 'home']) — второй запрос не нужен. Ошибка — экран возвращается как было, и показываем, что не так
let pend = 0;
function softRender() {   // перерисовать, только если человек сейчас ничего не вводит и не открыто окошко
  const a = document.activeElement;
  if (document.getElementById('sheet') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
  render();
}
async function quick(action, payload, back, apply) {
  const snap = { me: JSON.parse(JSON.stringify(me)), fridge: fridgeData ? JSON.parse(JSON.stringify(fridgeData)) : null };
  if (apply) { apply(); render(); }
  pend++;
  let r;
  try { r = await call(action, Object.assign({}, payload || {}, { _back: back || [] })); }
  catch (e) { pend--; me = snap.me; fridgeData = snap.fridge; render(); haptic('error'); toast(e.message); throw e; }
  pend--;
  if (!pend) {   // пока идут другие действия — их ответ придёт позже и обновит экран
    if (r._me) me = r._me;
    if ((back || []).indexOf('fridge') >= 0) fridgeData = r._fridge || null;
    if (r._home) homeData = r._home;
    if (apply || r._me || r._fridge) softRender();
  }
  return r;
}
function applyTheme() {
  const dark = tg && tg.colorScheme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  try { tg.setHeaderColor('#96A466'); tg.setBackgroundColor(dark ? '#0E1611' : '#FAFBEF'); } catch (e) {}
}
async function post(action, payload) {
  const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action, initData: tg.initData, payload }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}
function compress(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Не удалось открыть фото')); };
    img.src = url;
  });
}
function lightbox(src) {
  const el = document.createElement('div'); el.className = 'lightbox';
  el.innerHTML = `<img src="${src}" alt="">`; el.onclick = () => el.remove();
  document.body.appendChild(el);
}
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
function haptic(type) { try { tg.HapticFeedback.notificationOccurred(type); } catch (e) {} }
function confirmBox(text) { return new Promise(res => { try { tg.showConfirm(text, ok => res(ok)); } catch (e) { res(confirm(text)); } }); }
const card = html => `<div class="card">${html}</div>`;
const empty = (ic, title, text) => card(`<div class="empty"><div class="icon">${ic}</div><h2>${title}</h2>${text ? `<p class="sub">${text}</p>` : ''}</div>`);


const q = x => { x = Number(x); if (!isFinite(x)) return '—'; return fmt(x >= 20 ? Math.round(x) : x >= 1 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100); };
// перевод единиц: л↔мл, кг↔г
const UNIT = u => { u = String(u || '').toLowerCase().replace('.', '').trim();
  if (/^(мл|ml)$/.test(u)) return ['v', 1]; if (/^(л|l|лит)/.test(u)) return ['v', 1000];
  if (/^(г|гр|g)$/.test(u)) return ['m', 1]; if (/^(кг|kg)$/.test(u)) return ['m', 1000];
  return [u, 1]; };
const conv = (x, from, to) => { const a = UNIT(from), b = UNIT(to); return a[0] === b[0] ? x * a[1] / b[1] : null; };
function closeSheet() { const el = document.getElementById('sheet'); if (el) el.remove(); }
// Нижние окна: потянул вниз за ручку/верх (или когда окно прокручено до самого верха) — окно едет за пальцем.
// Отпустил дальше четверти высоты или быстро смахнул — закрывается так же, как тап по тёмному фону; иначе возвращается
(function () {
  let st = null;
  document.addEventListener('touchstart', e => {
    st = null;
    const sh = e.target.closest && e.target.closest('#sheet .sheet');
    if (!sh || e.touches.length > 1) return;
    const t = e.touches[0], onTop = !!e.target.closest('.grab') || t.clientY - sh.getBoundingClientRect().top < 56;
    if (!onTop && (sh.scrollTop > 0 || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    st = { sh: sh, y0: t.clientY, dy: 0, drag: false, onTop: onTop, last: [] };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!st) return;
    const y = e.touches[0].clientY, dy = y - st.y0;
    if (!st.drag) {
      if (dy < -4 || (!st.onTop && st.sh.scrollTop > 0)) { st = null; return; }   // вверх — обычная прокрутка окна
      if (dy < 8) return;
      st.drag = true; st.y0 = y;
    }
    st.dy = Math.max(0, y - st.y0);
    st.last.push([Date.now(), st.dy]); if (st.last.length > 5) st.last.shift();
    st.sh.style.transition = 'none'; st.sh.style.transform = 'translateY(' + st.dy + 'px)';
    if (e.cancelable) e.preventDefault();   // не прокручивать страницу и не сворачивать мини-апп
  }, { passive: false });
  const end = () => {
    const s = st; st = null;
    if (!s || !s.drag) return;
    const h = s.sh.offsetHeight, a0 = s.last[0], a1 = s.last[s.last.length - 1];
    const v = a0 && a1 && a1[0] > a0[0] ? (a1[1] - a0[1]) / (a1[0] - a0[0]) : 0;   // px/мс
    if (s.dy > h * 0.25 || (v > 0.5 && s.dy > 30)) {
      s.sh.style.transition = 'transform .18s ease-in'; s.sh.style.transform = 'translateY(' + (h + 40) + 'px)';
      setTimeout(() => { const w = document.getElementById('sheet'); if (!w || !w.contains(s.sh)) return; w.click(); if (document.body.contains(w)) closeSheet(); }, 170);
    } else { s.sh.style.transition = 'transform .2s ease-out'; s.sh.style.transform = ''; }
  };
  document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
})();
