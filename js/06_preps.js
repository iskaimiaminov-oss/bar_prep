// Файл «js/06_preps.js»: заготовки и техкарты: список, редактор, окошки «сколько/дата/наклейка», варка задним числом
// Открыть техкарту. prep — заготовка из приложения (может не быть), amount — сколько сварить
function openTk(c, prep, amount) {
  closeSheet();
  // выход берём из строки «Выход» в техкарте (размер S или первый заполненный)
  const yi = c.yields ? c.yields.findIndex(y => y && y.n > 0) : -1;
  const yU = yi >= 0 ? (c.yields[yi].u || (prep && prep.unit) || '') : '';
  const yieldS = yi >= 0 ? c.yields[yi].n / (yi === 0 ? 1 : ((c.ings.find(i => i.amounts[0] && i.amounts[yi]) || { amounts: [1, 1] }).amounts[yi] / (c.ings.find(i => i.amounts[0] && i.amounts[yi]) || { amounts: [1, 1] }).amounts[0])) : 0;
  const unitP = yU;
  // «сварить +1,6 л» из вкладки «Сегодня» переводим в единицы выхода
  if (amount != null && amount !== '' && yieldS && prep) { const cv = conv(Number(amount), prep.unit, yU); amount = cv != null ? Math.round(cv * 100) / 100 : (UNIT(prep.unit)[0] === UNIT(yU)[0] ? amount : null); }
  // база для пересчёта — количество в размере S (или первом заполненном)
  const base = c.ings.map(i => { const k = i.amounts.findIndex(x => x != null && x > 0); return k < 0 ? null : { k: k, v: i.amounts[k] / (k === 0 ? 1 : (c.ings.find(j => j.amounts[0] && j.amounts[k]) ? (c.ings.find(j => j.amounts[0] && j.amounts[k]).amounts[k] / c.ings.find(j => j.amounts[0] && j.amounts[k]).amounts[0]) : 1)) }; });
  let mode = yieldS ? 'amount' : 'base', size = 0, amt = amount != null && amount !== '' ? amount : (yieldS || ''), have = {};
  const wrap = document.createElement('div');
  wrap.className = 'sheet-bg'; wrap.id = 'sheet';

  const calc = () => {   // → { vals: [...], factor, limit }
    if (mode === 'base') return { vals: c.ings.map((i, k) => base[k] ? base[k].v : null), factor: 1 };
    let factor = null, limit = null;
    if (mode === 'amount') factor = yieldS && Number(amt) > 0 ? Number(amt) / yieldS : null;
    if (mode === 'have') {
      Object.keys(have).forEach(k => { const b = base[k]; if (!b || !(have[k] > 0)) return; const f = have[k] / b.v; if (factor == null || f < factor) { factor = f; limit = +k; } });
    }
    return { vals: c.ings.map((i, k) => factor == null || !base[k] ? null : base[k].v * factor), factor: factor, limit: limit };
  };
  const info = r => {
    if (mode === 'have') {
      if (r.factor == null) return 'Впиши, сколько есть хотя бы одного ингредиента';
      const lim = Object.keys(have).length > 1 && r.limit != null ? 'Ограничивает: <b>' + esc(c.ings[r.limit].name) + '</b><br>' : '';
      return lim + (yieldS ? 'Получится ≈ <b>' + q(r.factor * yieldS) + ' ' + esc(unitP) + '</b> (' + q(r.factor) + ' × техкарта)' : '≈ ' + q(r.factor) + ' × техкарта');
    }
    if (mode === 'amount') return r.factor ? '≈ ' + q(r.factor) + ' × техкарта' : 'Впиши, сколько нужно';
    return 'Количество по техкарте';
  };
  const update = (skip) => {
    const r = calc();
    wrap.querySelectorAll('[data-ing]').forEach(inp => {
      const k = +inp.dataset.ing;
      const own = mode === 'have' && have[k] != null;
      inp.closest('.ing').classList.toggle('own', own);
      inp.closest('.ing').classList.toggle('limit', mode === 'have' && r.limit === k && Object.keys(have).length > 1);
      if (inp === skip || own) return;
      inp.value = r.vals[k] == null ? '' : q(r.vals[k]).replace(',', '.');
    });
    const el = wrap.querySelector('#tkinfo'); if (el) el.innerHTML = info(r);
    const ai = wrap.querySelector('#amt'); if (ai && mode === 'have' && ai !== skip) ai.value = r.factor != null ? q(r.factor * yieldS).replace(',', '.') : '';
    const reset = wrap.querySelector('#tkreset'); if (reset) reset.style.display = mode === 'have' ? '' : 'none';
  };

  const top = yieldS
    ? `<div class="amount"><span>Сколько сварить</span><input id="amt" inputmode="decimal" value="${esc(amt)}"><b>${esc(unitP)}</b></div>`
    : `<div class="amount" style="background:var(--olive-soft);color:var(--forest)"><span>Пересчёт по объёму появится, когда в техкарте будет указан выход</span></div>`;
  const rows = c.ings.map((i, k) => `<div class="ing"><span>${esc(i.name)}</span>
      <label class="field"><input data-ing="${k}" inputmode="decimal" ${base[k] ? '' : 'disabled'}><small>${esc(i.unit)}</small></label></div>`).join('');
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div>
    <h2>${esc(c.title)}</h2>
    <p class="sub" style="margin-top:4px">📦 Выход: ${yieldS ? '<b>' + q(yieldS) + ' ' + esc(unitP) + '</b>' : 'не указан'}${c.shelf ? ' · 🕒 хранится ' + esc(c.shelf) : ''}</p>
    ${top}
    <p class="sub" id="tkinfo" style="margin:0 0 8px"></p>
    <div class="card" style="padding:6px 14px">
      <p class="sub" style="margin:8px 0 4px">💡 Есть ингредиент? Впиши, сколько его, — остальное пересчитается</p>${rows}
      <button class="btn soft" id="tkreset" style="display:none;margin:10px 0 8px;padding:11px">Сбросить</button>
    </div>
    ${c.method ? `<h3>Приготовление</h3><div class="card method">${esc(c.method)}</div>` : ''}
    <button class="btn soft" id="closeSheet">Закрыть</button></div>`;

  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  const amtIn = wrap.querySelector('#amt');
  if (amtIn) amtIn.oninput = () => { mode = 'amount'; have = {}; amt = toNum(amtIn.value); update(amtIn); };
  wrap.querySelectorAll('[data-ing]').forEach(inp => {
    inp.oninput = () => {
      const k = +inp.dataset.ing, v = toNum(inp.value);
      if (mode !== 'have') { mode = 'have'; have = {}; }
      if (v === '' || isNaN(v)) delete have[k]; else have[k] = v;
      if (!Object.keys(have).length) { mode = yieldS ? 'amount' : 'base'; }
      update(inp);
    };
    inp.onfocus = () => { if (!(mode === 'have' && have[+inp.dataset.ing] != null)) inp.select(); };
  });
  wrap.querySelector('#tkreset').onclick = () => { have = {}; mode = yieldS ? 'amount' : 'base'; update(); };
  document.body.appendChild(wrap);
  update();
}

async function openTkForPrep(pid, amount) {
  const p = me.preps.find(x => x.id === pid);
  if (!p || !p.tk) return toast('Для этой заготовки техкарта не привязана');
  try { const c = (await getTk()).find(x => x.id === p.tk); if (!c) return toast('Техкарта не найдена в таблице'); openTk(c, p, amount); }
  catch (e) { toast(e.message); }
}

// ---- черновик закрытия (переживает закрытие приложения) ----

// Окошко «сколько?» снизу экрана. Возвращает число или null, если закрыли
function askDate(title, sub, max, okText) {
  return new Promise(res => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>${esc(title)}</h2>${sub ? `<p class="sub" style="margin-top:4px">${sub}</p>` : ''}
      <div class="form"><label>Дата на наклейке<input id="askd" type="date" max="${esc(max)}"></label></div>
      <button class="btn" id="askOk">${esc(okText || 'Готово')}</button><button class="btn soft" id="askNo">Отмена</button></div>`;
    document.body.appendChild(wrap);
    const done = v => { closeSheet(); res(v); };
    const inp = wrap.querySelector('#askd');
    wrap.querySelector('#askNo').onclick = () => done(null);
    wrap.onclick = e => { if (e.target === wrap) done(null); };
    wrap.querySelector('#askOk').onclick = () => { if (!inp.value) { toast('Выбери дату с наклейки'); return; } if (inp.value > max) { toast('Дата не может быть из будущего'); return; } done(inp.value); };
  });
}
// Только что сварили / разморозили / убрали в морозилку: что написать на наклейке и кнопка «Промаркировал(а)»
function askLabel(list) {
  if (!list || !list.length) return Promise.resolve();
  const dd = ts => new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return new Promise(res => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>🏷 Промаркируй заготовку</h2><p class="sub" style="margin-top:4px">Напиши на наклейке и приклей на тару:</p>
      ${list.map(x => `<div class="batch"><div class="pname"><b>${esc(x.name)}${x.state === 'f' ? ' ❄️' : ''}</b><span>${x.state === 'f' ? 'В морозилку' : 'Сварено'}: ${esc(dd(x.made))}${x.exp ? ' · годна до ' + esc(dd(x.exp)) : ''}</span></div></div>`).join('')}
      <button class="btn" id="lbOk">✅ Промаркировал(а)</button><button class="btn soft" id="lbNo">Позже</button></div>`;
    document.body.appendChild(wrap);
    const done = () => { closeSheet(); res(); };
    wrap.querySelector('#lbNo').onclick = () => { toast('Через 30 минут бот напомнит 🏷'); done(); };
    wrap.onclick = e => { if (e.target === wrap) done(); };
    wrap.querySelector('#lbOk').onclick = async () => {
      try { await call('batchMark', { ids: list.map(x => x.id) }); fridgeData = null; haptic('success'); toast('Промаркировано 🏷'); } catch (e) { toast(e.message); }
      done(); if (tab === 'fridge') render();
    };
  });
}
// На закрытии посчитали больше, чем в партиях: спрашиваем дату с наклейки и заводим партию. «Отмена» — пропустить заготовку
async function askExtras(list) {
  const today = new Date(Date.now() + 5 * 36e5).toISOString().slice(0, 10);
  for (const x of list || []) {
    if (x.back && await confirmBox(`${x.name}: посчитали больше, чем в партиях. Бот списал партию от ${new Date(x.back.made).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, а она, похоже, на месте. Вернуть её?`)) {
      try { await call('batchReturn', { id: x.back.id }); fridgeData = null; toast('Партия возвращена ↩️'); } catch (e) { toast(e.message); }
      continue;
    }
    const date = await askDate('🏷 ' + x.name + ': лишние ' + fmt(x.q) + ' ' + x.unit, 'Посчитали больше, чем отмечено в партиях. Какая дата на наклейке?', today, 'Завести партию');
    if (!date) continue;
    try { await call('batchExtra', { pid: x.pid, date }); fridgeData = null; toast('Партия заведена ✅'); }
    catch (e) { toast(e.message); }
  }
}
function askQty(title, sub, def, unit, okText) {
  return new Promise(res => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>${esc(title)}</h2>${sub ? `<p class="sub" style="margin-top:4px">${sub}</p>` : ''}
      <div class="amount"><span>Количество</span><input id="askq" inputmode="decimal" value="${esc(def != null && def !== '' ? fmt(def) : '')}" placeholder="0"><b>${esc(unit || '')}</b></div>
      <button class="btn" id="askOk">${esc(okText || 'Готово')}</button><button class="btn soft" id="askNo">Отмена</button></div>`;
    document.body.appendChild(wrap);
    const done = v => { closeSheet(); res(v); };
    const inp = wrap.querySelector('#askq');
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    wrap.querySelector('#askNo').onclick = () => done(null);
    wrap.onclick = e => { if (e.target === wrap) done(null); };
    wrap.querySelector('#askOk').onclick = async () => { const v = toNum(inp.value); if (v === '' || !(v > 0)) { toast('Впиши количество'); inp.focus(); return; } const it = { v, unit, inp }; if (!(await fixBig([it]))) return; done(it.v); };
  });
}
// Забыли отметить варку: заготовка, день (до 3 дней назад), выход. Партия получит дату варки, срок — от неё
function askLate() {
  const n = me.lateDays || 3, today = (me.today && me.today.date) || new Date(Date.now() + 5 * 36e5).toISOString().slice(0, 10);
  const days = []; for (let i = 1; i <= n; i++) days.push(new Date(new Date(today + 'T12:00:00Z').getTime() - i * 864e5).toISOString().slice(0, 10));
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const lbl = (d, i) => (i === 0 ? 'Вчера' : i === 1 ? 'Позавчера' : WD[new Date(d + 'T12:00:00Z').getUTCDay()]) + ', ' + d.slice(8, 10) + '.' + d.slice(5, 7);
  let day = days[0];
  closeSheet();
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>📅 Варка задним числом</h2>
    <p class="sub" style="margin-top:4px">Забыл(а) отметить, что сварил(а)? Выбери заготовку, день и сколько вышло. Срок годности посчитается от этого дня. Можно до ${n} дней назад</p>
    <label class="sub" style="display:block;margin-top:10px">Что сварил(а)<select id="lp" style="margin-top:6px"><option value="">— выбери заготовку —</option>${me.preps.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
    <p class="sub" style="margin:12px 0 0">Когда сварил(а)</p><div class="seg" id="ld">${days.map((d, i) => `<button data-d="${d}" class="${i === 0 ? 'on st0' : ''}">${esc(lbl(d, i))}</button>`).join('')}</div>
    <div class="amount"><span>Итоговый выход</span><input id="lq" inputmode="decimal" placeholder="0"><b id="lu"></b></div>
    <div class="amount" id="lfw" style="display:none"><span>❄️ Из них в морозилку</span><input id="lf" inputmode="decimal" placeholder="0"><b id="lu2"></b></div>
    <button class="btn" id="lOk">✅ Внести</button><button class="btn soft" id="lNo">Отмена</button></div>`;
  document.body.appendChild(wrap);
  const $ = q => wrap.querySelector(q), prep = () => me.preps.find(p => p.id === $('#lp').value);
  $('#lp').onchange = () => { const p = prep(); $('#lu').textContent = $('#lu2').textContent = p ? p.unit || '' : ''; $('#lfw').style.display = p && p.frz ? '' : 'none'; if (p) setTimeout(() => $('#lq').focus(), 60); };
  wrap.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { day = b.dataset.d; wrap.querySelectorAll('[data-d]').forEach(x => x.className = x === b ? 'on st0' : ''); });
  $('#lNo').onclick = () => closeSheet();
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  $('#lOk').onclick = async () => {
    const p = prep(); if (!p) { toast('Выбери заготовку'); return; }
    const it = { v: toNum($('#lq').value), unit: p.unit, inp: $('#lq') };
    if (it.v === '' || !(it.v > 0)) { toast('Впиши итоговый выход'); $('#lq').focus(); return; }
    const fv = p.frz ? toNum($('#lf').value) : '', ft = { v: fv === '' ? 0 : fv, unit: p.unit, inp: fv === '' ? null : $('#lf') };
    await fixBig([it, ft]);
    if (isNaN(ft.v) || ft.v < 0 || ft.v > it.v) { toast('В морозилку — не больше, чем сварено'); return; }
    const b = $('#lOk'); b.disabled = true; b.textContent = 'Вношу…';
    try { const r = await call('madeLate', { pid: p.id, day, q: it.v, f: ft.v }); closeSheet(); fridgeData = null; haptic('success'); toast('Внесено за ' + day.slice(8, 10) + '.' + day.slice(5, 7) + ' ✅'); me = await call('me'); render(); askLabel(r && r.label); }
    catch (e) { toast(e.message); b.disabled = false; b.textContent = '✅ Внести'; }
  };
}


// Срок хранения из техкарты в днях («7 суток» → 7) — подсказка в редакторе заготовок
function tkShelf(cards, tk) { const c = (cards || []).find(x => x.id === tk), m = c && String(c.shelf || '').match(/(\d+)\s*(сут|дн|день|дней)/i); return m ? m[1] : ''; }

// подсказка в поле «Почти пусто»: общее правило — 0,15 л/кг, 150 мл/г, штуки — 0
function lowDef(unit) { const u = String(unit || '').trim().replace(/\.$/, ''); return /^(л|l|литр\S*|кг|kg|килограмм\S*)$/i.test(u) ? '0,15' : /^(мл|ml|г|гр|g|грамм\S*)$/i.test(u) ? '150' : '0'; }
function needRow(i) {
  return `<div class="need"><div class="dot">${esc(String(i.name).trim()[0] || '•').toUpperCase()}</div>
    <div class="pname"><b>${esc(i.name)}</b><span>осталось ${i.left > 0 ? fmt(i.left) + ' ' + esc(i.unit) + ' — почти пусто' : fmt(i.have) + ' ' + esc(i.unit)} · норма ${fmt(i.norm)}${i.res ? ' с запасом' : ''}${i.frozen > 0 ? ' · ❄️ в морозилке ' + fmt(i.frozen) : ''}</span></div>
    <div class="pill">+${fmt(i.need)} ${esc(i.unit)}</div></div>`;
}



Object.assign(views, {
  async tk() {
    const all = await getTk();
    const cards = all.filter(c => !c.hidden), hidden = all.filter(c => c.hidden);
    if (!all.length) return empty('📖', 'Техкарт не найдено', 'Бот читает лист «Заготовки» в таблице техкарт.');
    const row = (c, isHidden) => `<div class="tkrow" ${isHidden ? '' : `data-card="${esc(c.id)}"`} style="${isHidden ? 'opacity:.6;cursor:default' : ''}">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--olive);color:var(--cream);display:grid;place-items:center;font-weight:600;flex:0 0 auto">${esc(c.title[0] || '•').toUpperCase()}</div>
      <div class="pname"><b>${esc(c.title)}</b><span>${c.yields && c.yields.find(y => y && y.n) ? 'выход ' + q(c.yields.find(y => y && y.n).n) + ' ' + esc(c.yields.find(y => y && y.n).u) : 'выход не указан'}${c.shelf ? ' · хранится ' + esc(c.shelf) : ''}</span></div>
      ${me.isAdmin ? `<button class="tkbtn" data-hide="${esc(c.id)}" data-val="${isHidden ? 0 : 1}">${isHidden ? 'Вернуть' : 'Убрать'}</button>` : `<span style="color:var(--muted);font-size:20px">›</span>`}</div>`;
    let out = card(`<h2>Техкарты заготовок</h2><p class="sub">Нажми, чтобы открыть рецепт и пересчитать количество${me.isAdmin ? '. «Убрать» — скрыть у команды, таблица не меняется' : ''}</p>` +
      (me.isAdmin ? `<button class="btn soft" id="tkRefresh" style="margin:0 0 6px;padding:11px">🔄 Обновить из таблицы</button>` : '') +
      (cards.length ? cards.map(c => row(c, false)).join('') : '<p class="sub">Все техкарты скрыты</p>'));
    if (me.isAdmin && hidden.length) out += card(`<h2>Убранные</h2><p class="sub">Команда их не видит</p>` + hidden.map(c => row(c, true)).join(''));
    return out;
  },

});

Object.assign(views, {
  async preps() {
    await getCfg();
    let cards = [];
    try { cards = await getTk(); } catch (e) {}
    const stem = w => norm2(w).slice(0, 4);
    const guess = name => { const ws = norm2(name).split(' ').filter(w => w.length > 3).map(stem); const c = cards.filter(c => !c.hidden).find(c => norm2(c.title).split(' ').some(w => ws.indexOf(stem(w)) >= 0)); return c ? c.id : ''; };
    cfg.preps.forEach(p => { if (p.tk == null || p.tk === undefined) p.tk = guess(p.name); });
    const rows = cfg.preps.map((p, i) => `
      <div class="edit" data-i="${i}">
        <div class="top"><input data-f="name" value="${esc(p.name)}" placeholder="Название, например «Сироп ваниль»"><button class="x" data-del="${i}" title="Удалить">×</button></div>
        <div class="grid3">
          <label>Единица<input data-f="unit" value="${esc(p.unit)}" placeholder="л"></label>
          <label>Минимум<input data-f="min" inputmode="decimal" value="${esc(p.min)}" placeholder="0"></label>
          <label>Норма<input data-f="norm" inputmode="decimal" value="${esc(p.norm)}" placeholder="0"></label>
        </div>
        <details class="nd" ${p.nd && Object.keys(p.nd).length ? 'open' : ''}><summary>Норма по дням${p.nd && Object.keys(p.nd).length ? ' · ' + Object.keys(p.nd).map(w => ND_WD[w] + ' ' + p.nd[w]).join(', ') : ''}</summary>
          <p class="sub" style="margin:4px 0 0">Пусто — обычная норма. День — это день, когда варят.</p>
          <div class="grid3 nd7">${[1, 2, 3, 4, 5, 6, 7].map(w => `<label>${ND_WD[w]}<input data-nd="${w}" inputmode="decimal" value="${esc(p.nd && p.nd[w] != null ? p.nd[w] : '')}" placeholder="${esc(p.norm || '')}"></label>`).join('')}</div>
        </details>
        <div class="grid3" style="grid-template-columns:1fr">
          <label>Техкарта<select data-f="tk"><option value="">— нет —</option>${cards.filter(c => !c.hidden || p.tk === c.id).map(c => `<option value="${esc(c.id)}" ${p.tk === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>
        </div>
        <div class="grid3" style="grid-template-columns:1fr 1fr">
          <label>${p.frz ? 'Хранится после разморозки, дней' : 'Срок хранения, дней'}<input data-f="shelf" inputmode="numeric" value="${esc(p.shelf || '')}" placeholder="${esc(tkShelf(cards, p.tk) || '—')}"></label>
          ${p.frz ? `<label>В морозилке, дней<input data-f="frzDays" inputmode="numeric" value="${esc(p.frzDays || '')}" placeholder="30"></label>` : '<span></span>'}
        </div>
        <div class="grid3" style="grid-template-columns:1fr">
          <label>Почти пусто, если меньше (${esc(p.unit || 'ед.')}) — тогда бот пишет «варить» как с нуля<input data-f="low" inputmode="decimal" value="${esc(p.low != null ? String(p.low).replace('.', ',') : '')}" placeholder="${esc(lowDef(p.unit))}"></label>
        </div>
        <label class="switch"><input type="checkbox" data-f="frz" ${p.frz ? 'checked' : ''}> ❄️ Замораживаем (часть кладут в морозилку)</label>
      </div>`).join('');
    const cl = cfg.checklist || [];
    return card(`<h2>Список заготовок</h2><p class="sub">Минимум — ниже этого нужно варить. Норма — до скольки варить. «Норма по дням» — своя норма на загруженные или тихие дни; цифры подсказывает бот в понедельник. Техкарта — рецепт из таблицы, выход для пересчёта берётся из строки «Выход» в техкарте. Срок хранения — для напоминаний в «Холодильнике»; пусто — берётся из техкарты (серая цифра).</p>
      ${rows || ''}<button class="btn soft" id="add">+ Добавить заготовку</button>`) +
      card(`<h2>Чек-лист закрытия</h2><p class="sub">Пункты, которые отмечают на закрытии смены</p><div id="cl">` +
        cl.map((t, k) => `<div class="cl-row edit" style="padding:8px;margin-bottom:8px"><input data-cl value="${esc(t)}" placeholder="Например: почистить кофемашину"><button class="x" data-cldel="${k}">×</button></div>`).join('') +
        `</div><button class="btn soft" id="cladd">+ Добавить пункт</button><button class="btn" id="clsave">Сохранить чек-лист</button>`) +
      `<div class="dock"><button class="btn" id="save">Сохранить заготовки</button></div>`;
  },

});

Object.assign(binds, {
  preps() {
    const collect = () => document.querySelectorAll('.edit[data-i]').forEach(row => {
      const p = cfg.preps[row.dataset.i];
      row.querySelectorAll('input,select').forEach(inp => {
        if (inp.dataset.nd) { p.nd = p.nd || {}; p.nd[inp.dataset.nd] = inp.value; return; }
        p[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value;
      });
    });
    // «Замораживаем» — сразу показать/спрятать поле «В морозилке, дней»
    document.querySelectorAll('.edit input[data-f="frz"]').forEach(cb => cb.onchange = () => { collect(); render(); });
    document.getElementById('add').onclick = () => {
      collect(); cfg.preps.push({ name: '', unit: '', min: '', norm: '', tk: '', yield: '' }); render();
      setTimeout(() => { const l = document.querySelectorAll('.edit input[data-f="name"]'); if (l.length) { l[l.length - 1].focus(); l[l.length - 1].scrollIntoView({ block: 'center' }); } }, 50);
    };
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { collect(); cfg.preps.splice(+b.dataset.del, 1); render(); });
    const clCollect = () => { cfg.checklist = [...document.querySelectorAll('[data-cl]')].map(i => i.value); };
    document.getElementById('cladd').onclick = () => { collect(); clCollect(); cfg.checklist.push(''); render(); setTimeout(() => { const l = document.querySelectorAll('[data-cl]'); if (l.length) { l[l.length - 1].focus(); l[l.length - 1].scrollIntoView({ block: 'center' }); } }, 50); };
    document.querySelectorAll('[data-cldel]').forEach(b => b.onclick = () => { collect(); clCollect(); cfg.checklist.splice(+b.dataset.cldel, 1); render(); });
    document.getElementById('clsave').onclick = async e => {
      clCollect(); e.target.disabled = true;
      try { const r = await call('saveChecklist', { items: cfg.checklist }); cfg.checklist = r.checklist; me = await call('me'); toast('Чек-лист сохранён ✅'); haptic('success'); render(); }
      catch (err) { toast(err.message); e.target.disabled = false; }
    };
    document.getElementById('save').onclick = async e => {
      collect(); e.target.disabled = true;
      try { const r = await call('savePreps', { preps: cfg.preps }); cfg.preps = r.preps; me = await call('me'); toast('Сохранено ✅'); haptic('success'); render(); }
      catch (err) { toast(err.message); e.target.disabled = false; }
    };
  },
});

Object.assign(binds, {
  tk() {
    const rf = document.getElementById('tkRefresh');
    if (rf) rf.onclick = async () => {
      rf.disabled = true; rf.textContent = 'Читаю таблицу…';
      try { tkCards = (await call('tk', { refresh: true })).cards; tkP = null; toast('Техкарты обновлены ✅'); render(); }
      catch (e) { toast(e.message); rf.disabled = false; rf.textContent = '🔄 Обновить из таблицы'; }
    };
    document.querySelectorAll('[data-hide]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const hide = b.dataset.val === '1', c = tkCards.find(x => x.id === b.dataset.hide);
      if (hide && !(await confirmBox(`Убрать «${c ? c.title : ''}» из приложения? В таблице техкарта останется.`))) return;
      b.disabled = true;
      try { await call('tkHide', { id: b.dataset.hide, hidden: hide }); if (c) c.hidden = hide; haptic('success'); render(); }
      catch (err) { toast(err.message); b.disabled = false; }
    });
    document.querySelectorAll('[data-card]').forEach(el => el.onclick = () => {
      const c = tkCards.find(x => x.id === el.dataset.card); if (!c) return;
      const p = me.preps.find(x => x.tk === c.id);
      openTk(c, p, null);
    });
  }
});
