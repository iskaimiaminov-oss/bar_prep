// Файл «js/03_today.js»: вкладка «Сегодня»: смены по дням, мои смены, замены, заказ посуды, проблемы
// ===== График по дням (листается свайпом) =====
const DAYS_BACK = 7, DAYS_FWD = 7;   // график «На смене»: неделя назад и неделя вперёд
const shiftCache = {}, shiftLoading = {};
let curDay = null;
const addD = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffD = (a, b) => Math.round((new Date(a + 'T12:00:00Z') - new Date(b + 'T12:00:00Z')) / 864e5);
const wdS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
function loadShift(date) {
  if (shiftCache[date] !== undefined) return Promise.resolve(shiftCache[date]);
  if (!shiftLoading[date]) shiftLoading[date] = call('shiftDay', { date }).then(r => (shiftCache[date] = r.list)).catch(e => { delete shiftLoading[date]; throw e; });
  return shiftLoading[date];
}
// ---- «Мои смены», замены, проблемы, дни рождения ----
let homeAt = 0;   // когда последний раз брали данные «Сегодня» — чаще раза в минуту фоном не переспрашиваем
function getHome(force) {
  if (homeData && !force) return Promise.resolve(homeData);
  if (!homeP || force) homeP = call('home').then(r => { homeAt = Date.now(); return (homeData = r); }).catch(e => { homeP = null; throw e; });
  return homeP;
}
const hmS = m => Math.floor(m / 60) % 24 + ':' + String(m % 60).padStart(2, '0');
function homeExtraHtml(d) {
  let out = '';
  const today = me.today.date;
  out += skCard() + guCard();
  // мои смены на 7 дней (у владельца бота скрыто — мешает)
  if (d.week && d.week.length && !me.isAdmin) {
    const mySwap = date => (d.swaps || []).find(w => w.mine && w.date === date);
    out += card(`<h2>Мои смены</h2><p class="sub">Ближайшие 7 дней</p>` + d.week.map(w => {
      const dt = new Date(w.date + 'T12:00:00Z'), lbl = w.date === today ? 'сегодня' : dt.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
      const right = w.none ? '<span class="sub" style="margin:0">график в процессе</span>' : w.off ? '<span class="mini">выходной</span>'
        : `<span class="time">${hmS(w.from)} – ${hmS(w.to)}</span>`;
      const sw = mySwap(w.date);
      const act = !w.none && !w.off && w.date > today ? (sw ? `<span class="mini" style="background:var(--warm-soft);color:var(--warm)">${sw.status === 'taken' ? (sw.mode === 'swap' ? 'обмен: ' : 'замена: ') + esc(sw.takerName) : sw.mode === 'swap' ? 'ищем обмен' : 'ищем замену'}</span>`
        : `<button class="tkbtn" data-swap="${w.date}" style="margin-left:6px">Замена</button>`) : '';
      return `<div class="shift ${w.off || w.none ? 'past' : ''}"><div class="pname"><b style="text-transform:capitalize">${lbl}</b>${w.role ? `<span>${esc(w.role)}</span>` : ''}</div>${right}${act}</div>`;
    }).join(''));
  }
  // кто ищет замену
  const others = (d.swaps || []).filter(w => !w.mine || me.isAdmin);
  if (others.length) out += card(`<h2>🔄 Ищут замену</h2>` + others.map(w => `<div class="shift"><div class="pname"><b>${esc(w.byName)}</b> <span class="mini">${w.mode === 'swap' ? '🔄 обмен' : '🙋 отдаёт'}</span>
      <span>${new Date(w.date + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${hmS(w.from)}–${hmS(w.to)}${w.status === 'taken' ? ' · ' + (w.mode === 'swap' ? 'меняется ' : 'берёт ') + esc(w.takerName) : ''}</span></div>
      ${w.status === 'open' && !w.mine ? `<button class="tkbtn" data-take="${esc(w.id)}" data-mode="${w.mode === 'swap' ? 'swap' : 'give'}">${w.mode === 'swap' ? '🔄 Поменяюсь' : '🙋 Возьму'}</button>` : ''}
      ${w.mine || me.isAdmin ? `<button class="x" data-swcancel="${esc(w.id)}">×</button>` : ''}</div>`).join(''));
  // дни рождения на неделю вперёд
  const bd = d.bdays || {}, soon = [];
  for (let i = 0; i < 8; i++) { const dd = addD(today, i), md = dd.slice(5); Object.keys(bd).forEach(n => { if (bd[n] === md) soon.push([n, i, dd]); }); }
  if (soon.length) out += card(`<h2>🎂 Дни рождения</h2>` + soon.map(([n, i, dd]) => `<div class="shift"><div class="ava">🎂</div><div class="pname"><b>${esc(n)}</b>
      <span>${i === 0 ? '<b style="color:var(--warm)">сегодня! поздравь 🎉</b>' : i === 1 ? 'завтра' : new Date(dd + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })}</span></div></div>`).join(''));
  // проблемы
  const pr = d.probs || [];
  out += card(`<h2>⚠️ Проблемы</h2><p class="sub">${pr.length ? 'Открытые — ждут решения' : 'Что-то сломалось или закончилось? Сообщи — админ сразу узнает'}</p>` +
    pr.map(p => `<div class="task"><div class="pname"><b>${esc(p.text)}</b><span>${esc(p.byName)} · ${fmtTs(p.at)}${p.photos ? ' · 📷 ' + p.photos : ''}</span></div>
      ${me.canCreate ? `<button class="tkbtn" data-pdone="${esc(p.id)}">✅ Решено</button>` : ''}</div>`).join('') +
    (me.orderer && !me.isAdmin ? '' : `<button class="btn soft" id="probBtn">⚠️ Сообщить о проблеме</button><button class="btn soft" id="dishBtn" style="margin-top:8px">🍽 Заказать посуду</button>`));
  return out;
}
// Окошко выбора: отдать смену или поменяться сменами. Возвращает 'give' | 'swap' | null
function chooseSwapMode(dayLabel) {
  return new Promise(res => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>Замена на ${esc(dayLabel)}</h2>
      <p class="sub" style="margin-top:4px">В группу уйдёт заявка, админ подтвердит, график поправится сам</p>
      <button class="btn" data-m="give">🙋 Отдать смену</button><p class="sub" style="margin:6px 2px 0">Кто возьмёт — выйдет вместо тебя, у тебя выходной</p>
      <button class="btn ok" data-m="swap">🔄 Поменяться сменами</button><p class="sub" style="margin:6px 2px 0">Тот, кто работает в этот день, выйдет на твоё время, а ты — на его</p>
      <button class="btn soft" data-m="">Отмена</button></div>`;
    document.body.appendChild(wrap);
    const done = v => { closeSheet(); res(v || null); };
    wrap.querySelectorAll('[data-m]').forEach(b => b.onclick = () => done(b.dataset.m));
    wrap.onclick = e => { if (e.target === wrap) done(null); };
  });
}
function bindHomeExtra() {
  const box = document.getElementById('homeExtra'); if (!box) return;
  const fill = d => {
    if (!document.getElementById('homeExtra')) return;
    box.innerHTML = homeExtraHtml(d);
    box.querySelectorAll('[data-swap]').forEach(b => b.onclick = async () => {
      const date = b.dataset.swap;
      const mode = await chooseSwapMode(new Date(date + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }));
      if (!mode) return;
      b.disabled = true;
      try { await call('swapAsk', { date, mode }); toast('Запрос отправлен в группу 🔄'); fill(await getHome(true)); } catch (e) { toast(e.message); b.disabled = false; }
    });
    box.querySelectorAll('[data-take]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox(b.dataset.mode === 'swap'
        ? 'Поменяться сменой? Если у тебя в этот день смена — поменяетесь временем, если выходной — заберёшь смену. Админ подтвердит.'
        : 'Взять эту смену? Админ подтвердит замену.'))) return;
      b.disabled = true;
      try {
        let r = await call('swapTake', { id: b.dataset.take });
        // у тебя в этот день уже своя смена — переспросить
        if (r.needConfirm) {
          if (!(await confirmBox(r.ask))) { b.disabled = false; return; }
          r = await call('swapTake', { id: b.dataset.take, confirm: true });
        }
        haptic('success'); toast('Отлично! Ждём подтверждения 🙌'); fill(await getHome(true));
      } catch (e) { toast(e.message); b.disabled = false; }
    });
    box.querySelectorAll('[data-swcancel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Отменить поиск замены?'))) return;
      try { await call('swapCancel', { id: b.dataset.swcancel }); fill(await getHome(true)); } catch (e) { toast(e.message); }
    });
    box.querySelectorAll('[data-pdone]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Отметить проблему решённой? Автор получит уведомление.'))) return;
      try { await call('probDone', { id: b.dataset.pdone }); haptic('success'); fill(await getHome(true)); } catch (e) { toast(e.message); }
    });
    const pb = document.getElementById('probBtn'); if (pb) pb.onclick = () => openProblem(() => getHome(true).then(fill));
    const db = document.getElementById('dishBtn'); if (db) db.onclick = openDish;
    bindGu(); bindSk();
  };
  if (homeData) fill(homeData); else box.innerHTML = card('<div class="wip">Загружаю…</div>');
  getHome(!!homeData && Date.now() - homeAt > 60e3).then(fill).catch(() => {});
}
// Заказ посуды: уходит задачей управляющим, бот напоминает раз в 3 дня, пока не закажут
function openDish() {
  closeSheet();
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>🍽 Заказать посуду</h2>
    <p class="sub" style="margin-top:4px">Чего не хватает или что разбилось. Управляющие получат задачу и закажут</p>
    <div class="form"><label>Какая посуда</label><input id="dWhat" maxlength="200" placeholder="Например: бокалы для лимонада 400 мл">
      <label>Сколько</label><input id="dQty" maxlength="40" placeholder="Например: 6 шт">
      <label>Комментарий (необязательно)</label><textarea id="dNote" rows="2" maxlength="300" placeholder="Например: разбили 2, осталось 4"></textarea></div>
    <button class="btn" id="dSend">Отправить заказ</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  wrap.querySelector('#dSend').onclick = async ev => {
    const what = wrap.querySelector('#dWhat').value.trim(), qty = wrap.querySelector('#dQty').value.trim(), note = wrap.querySelector('#dNote').value.trim();
    if (!what) return toast('Напиши, какая посуда нужна');
    if (!qty) return toast('Укажи, сколько нужно');
    ev.target.disabled = true; ev.target.textContent = 'Отправляю…';
    try { await call('dishOrder', { what, qty, note }); haptic('success'); toast('Заказ отправлен, спасибо! 🍽'); closeSheet(); }
    catch (e) { toast(e.message); ev.target.disabled = false; ev.target.textContent = 'Отправить заказ'; }
  };
}
function openProblem(done) {
  closeSheet(); probPhotos = [];
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  const grid = () => probPhotos.map((p, k) => `<div class="ph ${p.loading ? 'loading' : ''}"><img src="${p.src}" alt=""><button class="x" data-pp="${k}">×</button></div>`).join('') +
    (probPhotos.length < 3 ? `<label class="ph add" for="ppinput"><span><b>+</b>Фото</span></label>` : '');
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>⚠️ Сообщить о проблеме</h2>
    <p class="sub" style="margin-top:4px">Что сломалось, закончилось или мешает работе. Админ получит сразу</p>
    <div class="form"><textarea id="pText" rows="3" placeholder="Например: кофемолка №2 мелет неравномерно"></textarea></div>
    <div class="photos" id="ppgrid">${grid()}</div><input type="file" id="ppinput" accept="image/*" multiple style="display:none">
    <button class="btn" id="pSend">Отправить</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
  document.body.appendChild(wrap);
  const redraw = () => { wrap.querySelector('#ppgrid').innerHTML = grid(); wrap.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { probPhotos.splice(+b.dataset.pp, 1); redraw(); }); };
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  wrap.querySelector('#ppinput').onchange = async e => {
    const files = [...e.target.files].slice(0, 3 - probPhotos.length); e.target.value = '';
    for (const f of files) {
      let p; try { p = { src: await compress(f), loading: true }; } catch (er) { toast(er.message); continue; }
      probPhotos.push(p); redraw();
      post('probPhoto', { data: p.src }).then(r => { p.id = r.id; p.loading = false; }).catch(er => { toast('Фото не загрузилось'); probPhotos.splice(probPhotos.indexOf(p), 1); }).finally(redraw);
    }
  };
  wrap.querySelector('#pSend').onclick = async ev => {
    const text = wrap.querySelector('#pText').value.trim();
    if (!text) return toast('Опиши проблему');
    if (probPhotos.some(p => p.loading)) return toast('Подожди, фото загружаются…');
    ev.target.disabled = true; ev.target.textContent = 'Отправляю…';
    try { await call('probAdd', { text, photos: probPhotos.filter(p => p.id).map(p => p.id) }); haptic('success'); toast('Отправлено, спасибо! 🙏'); closeSheet(); done && done(); }
    catch (e) { toast(e.message); ev.target.disabled = false; ev.target.textContent = 'Отправить'; }
  };
}

function shiftCard() {
  const today = me.today.date;
  if (!curDay) curDay = today;
  if (shiftCache[today] === undefined) shiftCache[today] = me.shift === undefined ? null : me.shift;
  let chips = '';
  for (let i = -DAYS_BACK; i <= DAYS_FWD; i++) {
    const d = addD(today, i), dt = new Date(d + 'T12:00:00Z');
    chips += `<button class="dchip ${d === today ? 'today' : ''} ${d === curDay ? 'on' : ''} ${dt.getUTCDay() === 1 && i !== -DAYS_BACK ? 'wk' : ''}" data-day="${d}"><small>${wdS[dt.getUTCDay()]}</small><b>${dt.getUTCDate()}</b></button>`;
  }
  return `<div class="card" id="shiftCard"><div class="dayhead">
      <button class="navb" id="dPrev">‹</button><div class="grow"><h2>На смене</h2><p class="sub" id="dTitle" style="margin:2px 0 0"></p></div><button class="navb" id="dNext">›</button></div>
    <div class="strip" id="strip">${chips}</div><div id="dayBody"></div>${me.isAdmin ? '<button class="btn soft" id="schRefresh" style="padding:10px;margin-top:10px;font-size:14px">🔄 Обновить график из таблицы</button>' : ''}</div>`;
}
function dayRows(date, list) {
  const today = me.today.date, isToday = date === today;
  if (list === undefined) return `<div class="wip">Загружаю…</div>`;
  if (list === null || (!list.length && date >= today)) return `<div class="wip"><div class="big">✍️</div><b>График в процессе</b>Расписание на этот день ещё не готово</div>`;
  if (!list.length) return `<div class="wip"><div class="big">🌙</div><b>Никого в графике</b></div>`;
  const now = me.now || 0, t = m => Math.floor(m / 60) % 24 + ':' + String(m % 60).padStart(2, '0');
  // сначала команда Рассвета, ниже отдельными блоками те, кто работает в другом месте (Узум, Яндекс, Amway, кейтеринг…)
  const pointRe = /яндекс|узум/i;
  const placeOf = x => x.place !== undefined ? x.place : ((String(x.name).match(pointRe) || [''])[0].replace(/^./, c => c.toUpperCase()));
  const bar = list.filter(x => !placeOf(x)), places = [];
  list.forEach(x => { const p = placeOf(x); if (p && places.indexOf(p) < 0) places.push(p); });
  const boss = p => /^(Управляющий|Владелец)$/.test(p);
  places.sort((p, q) => boss(q) - boss(p));   // руководство — сразу под командой Рассвета
  const row = x => {
    const cls = isToday && x.to ? (now >= x.from && now < x.to ? 'now' : now >= x.to ? 'past' : '') : '';
    const sub = !x.to ? 'на выезде' : isToday ? (cls === 'now' ? 'сейчас на смене' : cls === 'past' ? 'смена закончилась' : 'придёт в ' + t(x.from)) : (x.from < 12 * 60 ? 'утро' : 'вечер');
    const away = !!placeOf(x), shown = String(x.name).replace(pointRe, '').replace(/\s+/g, ' ').trim() || x.name;
    return `<div class="shift ${cls}">${avaHtml(shown)}
      <div class="pname"><b>${esc(shown)}${x.name === me.name ? ' <span class="mini">ты</span>' : ''}${homeData && (homeData.bdays || {})[x.name] === date.slice(5) ? ' 🎂' : ''}${stBadge(statusOf(x.name))}${x.role ? `<span class="mini">${esc(x.role)}</span>` : ''}${!away && x.to >= 22 * 60 ? '<span class="mini close">закрывает</span>' : ''}</b>
      <span>${sub}</span></div><span class="time">${x.word ? esc(x.word) : t(x.from) + ' – ' + t(x.to)}</span></div>`;
  };
  const n = bar.length;
  return (n ? `<p class="sub" style="margin:4px 0 0">Рассвет · ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'человек' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'человека' : 'человек'} на смене</p>` + bar.map(row).join('') : '<p class="sub" style="margin:4px 0 0">Из команды Рассвета в графике никого</p>') +
    places.map(p => `<p class="sub" style="margin:14px 0 0">${boss(p) ? '👔' : '📍'} <b>${esc(p)}</b>${/^(Яндекс|Узум)$/.test(p) ? ' · офис на нашей точке' : ''}</p>` + list.filter(x => placeOf(x) === p).map(row).join('')).join('');
}
function drawDay(dir) {
  const body = document.getElementById('dayBody'); if (!body) return;
  const today = me.today.date, dt = new Date(curDay + 'T12:00:00Z'), diff = diffD(curDay, today);
  document.getElementById('dTitle').textContent = dt.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) +
    (diff === 0 ? ' · сегодня' : diff === 1 ? ' · завтра' : diff === -1 ? ' · вчера' : '');
  document.getElementById('dPrev').disabled = diff <= -DAYS_BACK;
  document.getElementById('dNext').disabled = diff >= DAYS_FWD;
  document.querySelectorAll('.dchip').forEach(c => c.classList.toggle('on', c.dataset.day === curDay));
  const strip = document.getElementById('strip'), on = strip.querySelector('.dchip.on');
  if (on) strip.scrollTo({ left: on.offsetLeft - strip.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2, behavior: dir ? 'smooth' : 'auto' });
  const paint = () => { if (document.getElementById('dayBody')) body.innerHTML = dayRows(curDay, shiftCache[curDay]); };
  const want = curDay;
  if (dir) { body.classList.add(dir > 0 ? 'out-l' : 'out-r'); setTimeout(() => { paint(); body.classList.remove('out-l', 'out-r'); }, 160); } else paint();
  if (shiftCache[curDay] === undefined) loadShift(curDay).then(() => { if (curDay === want) paint(); }).catch(() => { if (curDay === want) body.innerHTML = '<div class="wip">Не удалось загрузить</div>'; });
  [-1, 1, -2, 2].forEach(k => { const d = addD(curDay, k); if (Math.abs(diffD(d, today)) <= DAYS_BACK) loadShift(d).catch(() => {}); });
}
function goDay(n) {
  const nd = addD(curDay, n), diff = diffD(nd, me.today.date);
  if (diff < -DAYS_BACK || diff > DAYS_FWD) return;
  curDay = nd; drawDay(n);
  try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
}
function bindShift() {
  if (!document.getElementById('shiftCard')) return;
  const sr = document.getElementById('schRefresh');
  if (sr) sr.onclick = async () => {
    sr.disabled = true; sr.textContent = 'Читаю таблицу…';
    try {
      await call('refreshSchedule');
      Object.keys(shiftCache).forEach(k => delete shiftCache[k]); Object.keys(shiftLoading).forEach(k => delete shiftLoading[k]);
      homeData = null; homeP = null; cfg = null; cfgP = null; names = null;
      me = await call('me'); toast('График обновлён ✅'); render();
    } catch (e) { toast(e.message); sr.disabled = false; sr.textContent = '🔄 Обновить график из таблицы'; }
  };
  document.getElementById('dPrev').onclick = () => goDay(-1);
  document.getElementById('dNext').onclick = () => goDay(1);
  document.querySelectorAll('.dchip').forEach(c => c.onclick = () => { const n = diffD(c.dataset.day, curDay); if (n) goDay(n); });
  const body = document.getElementById('dayBody');
  let x0 = null, y0 = null;
  body.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) goDay(dx < 0 ? 1 : -1);
  }, { passive: true });
  drawDay(0);
}


Object.assign(views, {
  async today() {
    const t = me.today, made = t.made || {}, ylds = t.yields || {};
    const hasTk = pid => { const p = me.preps.find(x => x.id === pid); return p && p.tk; };
    let out = shiftCard() + '<div id="homeExtra"></div>';
    const ro = false;   // админы-наблюдатели отмечают заготовки, как все
    const thawed = t.thawed || {};
    const yEdit = t.yEdit || {};
    // сваренное: можно исправить выход, если ошиблись при отметке (кроме разморозки)
    const madeRow = i => `<div class="check made"><div class="box">✓</div><div class="pname"><b>${esc(i.name)}</b><span>${thawed[i.pid] ? '❄️ разморозил(а)' : 'сварил(а)'} ${esc(made[i.pid])}${ylds[i.pid] != null ? ' · ' + (thawed[i.pid] ? '' : 'выход ') + fmt(ylds[i.pid]) + ' ' + esc(i.unit) : ''}${yEdit[i.pid] ? ' · исправил(а) ' + esc(yEdit[i.pid]) : ''}</span></div>${!ro && !thawed[i.pid] && ylds[i.pid] != null ? `<button class="tkbtn" data-yedit="${esc(i.pid)}">✏️ Выход</button>` : ''}${!ro ? `<button class="tkbtn" data-undo="${esc(i.pid)}" style="margin-left:6px" aria-label="Удалить отметку">🗑</button>` : ''}</div>`;
    // заготовки, которые замораживают: при отметке — сколько из сваренного ушло в морозилку
    const isFrz = pid => { const p = me.preps.find(x => x.id === pid); return p && p.frz; };
    const fzField = (pid, unit) => isFrz(pid) ? `<label class="yld"><em>❄️ Из них в морозилку</em><span class="field"><input data-fz="${esc(pid)}" inputmode="decimal" placeholder="0" value="${esc(fzv[pid] != null ? fzv[pid] : '')}"><small>${esc(unit)}</small></span></label>` : '';
    if (t.items.length) {
      // у выбранной заготовки — поле «Итоговый выход» (сразу стоит план, поправить, если вышло иначе)
      const rows = ro ? t.items.map(i => made[i.pid] ? madeRow(i) : needRow(i)).join('') : t.items.map(i => made[i.pid]
        ? madeRow(i)
        : `<div class="check ${sel.has(i.pid) ? 'on' : ''}" ${ro ? 'style="cursor:default"' : `data-pid="${esc(i.pid)}"`}><div class="box">✓</div><div class="pname"><b>${esc(i.name)}</b><span>осталось ${i.left > 0 ? fmt(i.left) + ' ' + esc(i.unit) + ' — почти пусто' : fmt(i.have) + ' ' + esc(i.unit)} · норма ${fmt(i.norm)}</span>${i.frozen > 0 ? `<span style="display:block;color:#3B5872;margin-top:2px">❄️ в морозилке ${fmt(i.frozen)} ${esc(i.unit)}</span><button class="tkbtn" data-thaw="${esc(i.pid)}" data-amt="${Math.min(i.need, i.frozen)}" style="margin-top:8px">❄️ Не варил, а разморозил</button>` : ''}
            <label class="yld"><em>Итоговый выход</em><span class="field"><input data-y="${esc(i.pid)}" inputmode="decimal" enterkeyhint="done" value="${esc(yv[i.pid] != null ? yv[i.pid] : fmt(i.need))}"><small>${esc(i.unit)}</small></span></label>${fzField(i.pid, i.unit)}</div><div class="pill">+${fmt(i.need)} ${esc(i.unit)}</div>${hasTk(i.pid) ? `<button class="tkbtn" data-tk="${esc(i.pid)}" data-amt="${i.need}">ТК</button>` : ''}</div>`).join('');
      const allDone = t.items.every(i => made[i.pid]);
      out += card(`<h2>Сварить сегодня</h2><p class="sub">${allDone ? 'Всё готово — спасибо! 🎉' : ro ? 'Что нужно сварить по последнему подсчёту' : 'Отметь, что сварил(а)'}</p>${rows}`);
    } else if (t.done && t.done.none) {
      out += empty('🌿', 'Сегодня варить не нужно', 'Всех заготовок хватает.');
    } else {
      out += empty(me.last ? '🌿' : '🌙', me.last ? 'Всего хватает' : 'Ещё нет подсчёта', me.last ? 'По подсчёту заготовки не нужны.' : 'Остатки внесут вечером на закрытии.');
    }
    if (ro) return out;
    // «Сварил что-то ещё» — заготовки не из списка (по подсчёту не требовались, но их сварили)
    const inList = {}; t.items.forEach(i => inList[i.pid] = 1);
    const extras = me.preps.filter(p => !inList[p.id]).map(p => ({ pid: p.id, name: p.name, unit: p.unit || '' }));
    const lastV = (me.last && me.last.values) || {};
    if (extras.length) {
      const open = extraOpen != null ? extraOpen : (!t.items.length || extras.some(x => sel.has(x.pid) || made[x.pid]));
      const madeCnt = extras.filter(x => made[x.pid]).length;
      const rowsX = extras.map(x => made[x.pid] ? madeRow(x)
        : `<div class="check ${sel.has(x.pid) ? 'on' : ''}" data-pid="${esc(x.pid)}"><div class="box">✓</div><div class="pname"><b>${esc(x.name)}</b><span>${lastV[x.pid] != null ? 'по подсчёту осталось ' + fmt(lastV[x.pid]) + ' ' + esc(x.unit) : 'не было в списке'}</span>
            <label class="yld"><em>Итоговый выход</em><span class="field"><input data-y="${esc(x.pid)}" inputmode="decimal" enterkeyhint="done" placeholder="0" value="${esc(yv[x.pid] != null ? yv[x.pid] : '')}"><small>${esc(x.unit)}</small></span></label>${fzField(x.pid, x.unit)}</div></div>`).join('');
      out += `<details class="card" id="extraBox" ${open ? 'open' : ''}><summary><div class="pname"><h2>${t.items.length ? 'Сварил что-то ещё?' : 'Сварил заготовку?'}</h2>
        <p class="sub">${madeCnt ? 'Отмечено сверх списка: ' + madeCnt : 'Отметь, если сварил(а) то, чего не было в списке'}</p></div></summary>${rowsX}</details>`;
    }
    if (me.preps.length) out += `<button class="btn soft" id="lateBtn" style="margin-top:2px">📅 Забыл отметить варку? Внести за прошлый день</button>`;
    const pending = t.items.some(i => !made[i.pid]), canMore = extras.some(x => !made[x.pid]);
    if (!pending && !canMore) return out;
    // если список сварен, кнопка появляется только когда что-то выбрали в «Сварил что-то ещё»
    out += `<div class="dock ${pending || sel.size ? '' : 'hide'}" id="madeDock"><button class="btn ok" id="made" ${sel.size ? '' : 'disabled'}>${sel.size ? '✅ Отметить сваренное (' + sel.size + ')' : 'Выбери, что сварил(а)'}</button></div>`;
    return out;
  },

});

Object.assign(binds, {
  today() {
    bindShift();
    bindHomeExtra();
    document.querySelectorAll('[data-tk]').forEach(b => b.onclick = e => { e.stopPropagation(); openTkForPrep(b.dataset.tk, toNum(b.dataset.amt)); });
    // «❄️ Разморозил» — вместо варки достали из морозилки (сразу отмечается как сделанное)
    document.querySelectorAll('[data-thaw]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const it = me.today.items.find(x => x.pid === b.dataset.thaw); if (!it) return;
      const q = await askQty('❄️ Разморозил: ' + it.name, 'В морозилке ' + fmt(it.frozen) + ' ' + esc(it.unit) + '. Срок хранения пойдёт с сегодняшнего дня', toNum(b.dataset.amt), it.unit, 'Отметить разморозку');
      if (q == null) return;
      const had = sel.has(it.pid); sel.delete(it.pid); toast('Отмечено ❄️');
      try {   // сразу на экране; бот пришлёт свежие данные в том же ответе
        const r = await quick('thaw', { pid: it.pid, q, today: true }, ['me', 'fridge'], () => { const t = me.today; t.made = t.made || {}; t.yields = t.yields || {}; t.thawed = t.thawed || {}; t.made[it.pid] = me.name; t.yields[it.pid] = q; t.thawed[it.pid] = 1; });
        haptic('success'); askLabel(r && r.label);
      } catch (er) { if (had) { sel.add(it.pid); render(); } }
    });
    document.querySelectorAll('[data-fz]').forEach(inp => inp.oninput = () => { fzv[inp.dataset.fz] = inp.value; });
    // «✏️ Выход» — исправить итоговый выход у уже отмеченной заготовки
    document.querySelectorAll('[data-yedit]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const pid = b.dataset.yedit, p = me.preps.find(x => x.id === pid) || {}, cur = (me.today.yields || {})[pid];
      const q = await askQty('✏️ Выход: ' + (p.name || ''), 'Сейчас записано ' + fmt(cur) + ' ' + esc(p.unit || '') + '. Впиши, сколько получилось на самом деле', cur, p.unit, 'Сохранить');
      if (q == null || q === cur) return;
      toast('Выход исправлен ✅');
      try { await quick('editYield', { pid, q }, ['me', 'fridge'], () => { const t = me.today; t.yields = t.yields || {}; t.yEdit = t.yEdit || {}; t.yields[pid] = q; t.yEdit[pid] = me.name; }); haptic('success'); }
      catch (er) {}
    });
    // 🗑 — удалить отметку, если отметили не ту заготовку (холодильник, отчёт и группа откатятся)
    document.querySelectorAll('[data-undo]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const pid = b.dataset.undo, p = me.preps.find(x => x.id === pid) || {}, th = (me.today.thawed || {})[pid];
      if (!(await confirmBox('Удалить отметку «' + (p.name || '') + '»? ' + (th ? 'Разморозка вернётся в морозилку.' : 'Партия уберётся из холодильника и из отчёта.') + ' Потом можно отметить правильную заготовку.'))) return;
      toast('Отметка удалена');
      try { await quick('undoMade', { pid }, ['me', 'fridge'], () => { const t = me.today; ['made', 'yields', 'thawed', 'yEdit'].forEach(k => { if (t[k]) delete t[k][pid]; }); if (t.done && t.items.some(i => i.pid === pid)) t.done = null; }); haptic('success'); }
      catch (er) {}
    });
    const xb = document.getElementById('extraBox');
    if (xb) xb.addEventListener('toggle', () => { extraOpen = xb.open; });
    const lb = document.getElementById('lateBtn'); if (lb) lb.onclick = () => askLate();
    const btn = document.getElementById('made'); if (!btn) return;
    const dock = document.getElementById('madeDock'), pending = me.today.items.some(i => !(me.today.made || {})[i.pid]);
    const sync = () => {
      btn.disabled = !sel.size; btn.textContent = sel.size ? '✅ Отметить сваренное (' + sel.size + ')' : 'Выбери, что сварил(а)';
      if (dock) dock.classList.toggle('hide', !pending && !sel.size);
    };
    document.querySelectorAll('[data-pid]').forEach(el => el.onclick = e => {
      if (e.target.closest('.yld')) return;   // клик по полю выхода не снимает выбор
      const id = el.dataset.pid;
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      el.classList.toggle('on', sel.has(id)); sync();
      if (sel.has(id)) { const inp = el.querySelector('[data-y]'); if (inp) setTimeout(() => { inp.focus(); inp.select(); }, 50); }
      try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
    });
    document.querySelectorAll('[data-y]').forEach(inp => inp.oninput = () => { yv[inp.dataset.y] = inp.value; inp.parentNode.classList.remove('bad'); });
    btn.onclick = async () => {
      if (!sel.size) return;
      // итоговый выход обязателен по каждой отмеченной заготовке
      const yields = {}, bad = [];
      [...sel].forEach(pid => {
        const inp = document.querySelector(`[data-y="${CSS.escape(pid)}"]`), v = inp ? toNum(inp.value) : '';
        if (v === '' || !(v > 0)) { bad.push(inp); return; }
        yields[pid] = v;
      });
      if (bad.length) { bad.forEach(i => i && i.parentNode.classList.add('bad')); if (bad[0]) bad[0].focus(); haptic('error'); toast('Впиши итоговый выход'); return; }
      const pn = pid => me.preps.find(x => x.id === pid) || {};
      const yc = Object.keys(yields).map(pid => ({ pid, v: yields[pid], unit: pn(pid).unit, name: pn(pid).name, inp: document.querySelector(`[data-y="${CSS.escape(pid)}"]`) }));
      if (!(await fixBig(yc))) { haptic('error'); return; }
      yc.forEach(c => yields[c.pid] = c.v);
      // сколько из сваренного убрали в морозилку (только у заготовок, которые замораживают)
      const freezes = {};
      for (const pid of sel) {
        const inp = document.querySelector(`[data-fz="${CSS.escape(pid)}"]`); let v = inp ? toNum(inp.value) : '';
        if (v === '' || v === 0) continue;
        const fc = { v, unit: pn(pid).unit, name: pn(pid).name + ' (в морозилку)', inp };
        if (!(await fixBig([fc]))) { haptic('error'); return; }
        v = fc.v;
        if (isNaN(v) || v < 0 || v > yields[pid]) { inp.parentNode.classList.add('bad'); inp.focus(); haptic('error'); toast('В морозилку — не больше, чем сварено'); return; }
        freezes[pid] = v;
      }
      // сразу на экране: заготовки отмечены, бот сохраняет в фоне; не получилось — отметки вернутся, выбор и цифры останутся
      const pids = [...sel];
      sel.clear(); toast('Молодец! 💪');
      try {
        const r = await quick('made', { pids: pids, yields: yields, freezes: freezes }, ['me', 'fridge'], () => { const t = me.today; t.made = t.made || {}; t.yields = t.yields || {}; pids.forEach(pid => { t.made[pid] = me.name; t.yields[pid] = yields[pid]; }); });
        pids.forEach(pid => { delete yv[pid]; delete fzv[pid]; }); haptic('success'); askLabel(r && r.label);
      } catch (e) { pids.forEach(pid => sel.add(pid)); render(); }
    };
  },
});
