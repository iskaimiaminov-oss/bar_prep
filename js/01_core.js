// Файл «js/01_core.js»: общее: Телеграм, адрес бота, вызовы call/post, toast, окошки, перевод единиц, глобальные переменные
const tg = window.Telegram && window.Telegram.WebApp;
const API = new URLSearchParams(location.search).get('api');
const app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = x => String(Math.round(Number(x) * 100) / 100).replace('.', ',');
const fmtTs = ts => { const d = new Date(ts); return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'}) + ', ' + d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); };
const norm2 = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toNum = v => { const s = String(v).replace(/\s/g, '').replace(',', '.'); return s === '' ? '' : Number(s); };
// Вписали граммы/мл вместо кг/л (1600 вместо 1,6): в кг/л больше 50 не бывает — спрашиваем «Ты имел в виду 1,6 кг?».
// list: [{ v, unit, name, inp }]. ОК — число в поле и в list поправится; Отмена — false, человек исправит сам
const UNIT_BIG = /^(л|l|литр\S*|кг|kg|килограмм\S*)$/i, BIG_MAX = 50;
// Число в кг/л больше 50 — значит, вписали граммы/мл: 1600 → 1,6. Меняем сами, без вопроса
const bigTo = (v, unit) => { const u = String(unit || '').trim().replace(/\.$/, ''); return UNIT_BIG.test(u) && v > BIG_MAX ? Math.round(v / 10) / 100 : null; };
const unitOfInp = inp => { const w = inp.closest('.field,.amount'); const el = w && w.querySelector('small,b'); return inp.dataset.unit || (el ? el.textContent : ''); };
function autoBig(inp, quiet) {
  const v = toNum(inp.value); if (v === '' || isNaN(v)) return null;
  const u = String(unitOfInp(inp)).trim(), g = bigTo(v, u); if (g == null) return null;
  inp.value = fmt(g); inp.dispatchEvent(new Event('input', { bubbles: true }));
  if (!quiet) toast(fmt(v) + ' → ' + fmt(g) + ' ' + u);
  return { from: v, to: g, unit: u };
}
// вышел из поля / нажал «далее» — число поправится само
document.addEventListener('change', e => { const t = e.target; if (t && t.matches && t.matches('input[inputmode="decimal"]')) autoBig(t); }, true);
// Страховка на кнопке: то же самое для списка { v, unit, name, inp } (всегда true — вопросов больше нет)
async function fixBig(list) {
  const done = [];
  for (const it of list) {
    const g = bigTo(it.v, it.unit); if (g == null) continue;
    done.push(fmt(it.v) + ' → ' + fmt(g) + ' ' + String(it.unit || '').trim());
    it.v = g;
    if (it.inp) { it.inp.value = fmt(g); it.inp.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  if (done.length) toast('Поправил: ' + done.join(', '));
  return true;
}

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
