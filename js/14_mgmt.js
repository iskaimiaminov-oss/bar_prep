// Файл «js/14_mgmt.js»: вкладка «Управление» (админ и те, кому он выдал доступ): подвкладки «Сообщения», «Персонал», «График» (настройки — js/08_grafik.js), «Журнал»
// Сообщения: все рассылки бота по расписанию (встроенные + свои) — текст-шаблон, время, частота, кому, вкл/выкл, проверка себе. Бот: 19_msgs.gs
let mgSub = 'attn', bmD = null, bmEd = null, mgY = 0;   // с 26.11 первой открывается «⚠️ Внимание»
const MG_SUBS = [['attn', '⚠️ Внимание'], ['msgs', '✉️ Сообщения'], ['ppl', '👥 Персонал'], ['gr', '🗓 График'], ['close', '🌙 Закрытие'], ['flow', '📊 Расход'], ['log', '📜 Журнал']];
const MG_WD = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const mgHm = m => typeof m === 'number' ? String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') : '';
const BM_FREQ = [['d1', 'Каждый день'], ['d2', 'Через день'], ['n', 'Каждые N дней'], ['dows', 'По дням недели']];
const BM_WHO = [['all', 'Всем'], ['shift', 'Кто на смене'], ['ids', 'Выбранным'], ['admin', 'Админу']];

Object.assign(views, {
  async mgmt() {
    const subs = `<div class="mgsubs">${MG_SUBS.map(([k, l]) => `<button class="mgsub ${k === mgSub ? 'on' : ''}" data-mgsub="${k}">${l}</button>`).join('')}</div>`;
    if (mgSub === 'msgs') { bmD = bmD || await call('bmList'); return subs + (bmEd ? bmEdView() : bmListView()); }
    if (mgSub === 'ppl') { acD = acD || await call('acList'); return subs + (acEd ? acEdView() : acListView()); }
    if (mgSub === 'gr') { grCfgD = grCfgD || await call('grCfg'); return subs + grCfgView(); }
    if (mgSub === 'log') { mlD = mlD || await call('mlList'); return subs + mlView(); }
    if (mgSub === 'flow') { flD = flD || await call('flowView', { weeks: flW }); return subs + flView(); }
    if (mgSub === 'close') return subs + clView();
    if (mgSub === 'attn') { atD = atD || await call('attn'); return subs + atView(); }
    return subs;
  }
});

function bmRow(x) {
  const sub = [x.freq, x.to + ' — ' + x.who, x.textOwn ? '✏️ свой текст' : ''].filter(Boolean).join(' · ');
  return `<div class="mgrow ${x.on ? '' : 'off'}" data-bm="${esc(x.id)}"><div class="mgtime">${x.atLbl ? esc(x.atLbl) : x.id === 'nice' ? '🎲' : mgHm(x.at)}</div>
    <div class="mgtxt"><b>${esc(x.t)}</b><span>${esc(sub)}</span></div>
    <label class="mgsw" data-bmsw="${esc(x.id)}"><input type="checkbox" ${x.on ? 'checked' : ''} aria-label="Включено"><i></i></label></div>`;
}
function bmListView() {
  const d = bmD, by = (a, b) => a.at - b.at;
  let out = card(`<h2>✉️ Сообщения бота</h2><p class="sub">Всё, что бот присылает сам по расписанию. Нажми на сообщение — поменять текст, время и частоту. Переключатель справа — включить или выключить</p>
    <button class="btn" id="bmNew">＋ Новое сообщение</button>`);
  if (d.custom.length) out += card(`<h3 style="margin-top:0">Свои</h3>${d.custom.map(bmRow).join('')}`);
  // встроенные — по темам (группы задаёт бот); старый ответ без групп — одним списком
  const gs = d.groups && d.groups.length ? d.groups : [{ k: '', t: 'Встроенные' }];
  gs.forEach(g => {
    const xs = d.items.filter(x => !g.k || (x.g || 'other') === g.k || (!gs.some(y => y.k === x.g) && g.k === 'other')).sort(by);
    if (xs.length) out += card(`<h3 style="margin-top:0">${esc(g.t)} <span class="sub" style="font-weight:400">· ${xs.length}</span></h3>${xs.map(bmRow).join('')}`);
  });
  return out;
}
function bmFreqK(x) {
  if (!x.custom && !x.freqOwn) return 'def';
  if ((x.dows || []).length) return 'dows';
  return x.every <= 1 ? 'd1' : x.every === 2 ? 'd2' : 'n';
}
function bmOpen(x) {
  bmEd = Object.assign(JSON.parse(JSON.stringify(x)), { atS: mgHm(x.at), freqK: bmFreqK(x), every: x.every > 2 ? x.every : 3, dows: (x.dows || []).slice(), title: x.custom ? x.t : '',
    toK: x.toK || 'group', whoK: x.whoK || 'all', ids: (x.ids || []).slice() });
}
function bmNewDraft() {
  return { custom: true, id: '', t: 'Новое сообщение', title: '', on: true, atS: '10:00', tm: true, fx: true, freqK: 'd1', every: 3, dows: [], text: '', toK: 'group', whoK: 'all', ids: [],
    tx: 'full', vars: ['имя', 'дата', 'день недели', 'на смене'] };
}
function bmEdView() {
  const x = bmEd, chip = (attr, v, on, l) => `<button class="chip ${on ? 'on' : ''}" ${attr}="${esc(v)}">${esc(l)}</button>`;
  let h = `<h2>${x.custom ? (x.id ? '✏️ ' : '＋ ') : ''}${esc(x.custom ? (x.title || x.t) : x.t)}</h2>`;
  if (x.custom) h += `<div class="form"><label>Название (видно только тебе)</label><input id="bmTitle" maxlength="60" value="${esc(x.title)}" placeholder="Например: «Пятиминутка»"></div>`;
  h += `<label class="switch"><input type="checkbox" id="bmOn" ${x.on ? 'checked' : ''}> Включено</label>`;
  if (x.note) h += `<div class="mgnote">ℹ️ ${esc(x.note)}</div>`;
  h += `<h3>Текст</h3>`;
  if (x.tx === 'none') h += `<p class="sub">Текст этого сообщения бот собирает сам — здесь только время и вкл/выкл.</p>`;
  else {
    h += `<p class="sub">${x.tx === 'wrap' ? 'Данные (отчёт, список) бот вставит на место {' + esc(x.need) + '} — можно дописать свой текст до или после. ' : ''}В фигурных скобках — то, что бот подставит сам. *Звёздочки* — жирный шрифт. Строка, где подставлять нечего, не отправится.</p>
      <div class="form"><textarea id="bmText" rows="8" placeholder="Текст сообщения">${esc(x.text)}</textarea></div>
      ${(x.vars || []).length ? `<div class="chips mgvars">${x.vars.map(v => `<button class="chip" data-bmvar="${esc(v)}">{${esc(v)}}</button>`).join('')}</div>` : ''}
      ${!x.custom && (x.textOwn || x.text !== x.textDef) ? `<button class="btn soft" id="bmDef" style="margin-top:10px">↩️ Вернуть текст по умолчанию</button>` : ''}`;
  }
  h += `<h3>Время</h3>`;
  h += x.tm ? `<div class="form" style="max-width:160px"><input type="time" id="bmAt" value="${esc(x.atS)}"></div>${!x.custom && x.atDef != null && mgHm(x.atDef) !== x.atS ? `<p class="sub">Обычно — ${mgHm(x.atDef)}</p>` : ''}`
    : `<p class="sub">${esc(x.freqDef || x.freq)}</p>`;
  h += `<h3>Как часто</h3>`;
  if (!x.fx) h += `<p class="sub">${esc(x.freqDef || x.freq)} — так задумано, частота не меняется</p>`;
  else {
    const opts = (x.custom ? [] : [['def', 'Как задумано: ' + x.freqDef]]).concat(BM_FREQ);
    h += `<div class="chips">${opts.map(([k, l]) => chip('data-bmfreq', k, x.freqK === k, l)).join('')}</div>`;
    if (x.freqK === 'n') h += `<div class="form" style="max-width:200px"><label>Раз в сколько дней</label><input id="bmEvery" type="number" inputmode="numeric" min="1" max="60" value="${esc(x.every)}"></div><p class="sub">Считаем от сегодня</p>`;
    if (x.freqK === 'dows') h += `<div class="chips" style="margin-top:10px">${[1, 2, 3, 4, 5, 6, 7].map(w => chip('data-bmdow', w, x.dows.indexOf(w) >= 0, MG_WD[w])).join('')}</div>`;
  }
  h += `<h3>Куда и кому</h3>`;
  if (!x.custom) h += `<p class="sub">${esc(x.to)} — ${esc(x.who)}. Получателей встроенного сообщения бот выбирает сам</p>`;
  else {
    h += `<div class="chips">${chip('data-bmto', 'group', x.toK === 'group', 'В группу')}${chip('data-bmto', 'dm', x.toK === 'dm', 'В личку')}</div>`;
    if (x.toK === 'group' && !bmD.group) h += `<p class="sub">⚠️ Группа не подключена — сообщение придёт админу</p>`;
    if (x.toK === 'dm') {
      h += `<div class="chips" style="margin-top:10px">${BM_WHO.map(([k, l]) => chip('data-bmwho', k, x.whoK === k, l)).join('')}</div>`;
      if (x.whoK === 'shift') h += `<p class="sub">Те, кто по графику на смене в это время</p>`;
      if (x.whoK === 'ids') h += `<div class="chips" style="margin-top:10px">${bmD.people.map(p => chip('data-bmid', p.id, x.ids.indexOf(p.id) >= 0, p.name)).join('')}</div>`;
    }
  }
  h += `<div class="two" style="margin-top:16px"><button class="btn" id="bmSave">Сохранить</button>${x.tx === 'none' ? '' : `<button class="btn soft" id="bmTest">🧪 Мне для проверки</button>`}</div>`;
  if (x.custom && x.id) h += `<button class="btn soft mgdel" id="bmDel">🗑 Удалить сообщение</button>`;
  return `<button class="btn soft" id="bmBack">← К списку</button>` + card(h);
}
// забрать из полей то, что человек успел ввести (перед перерисовкой)
function bmKeep() {
  const x = bmEd; if (!x) return;
  const v = id => { const el = document.getElementById(id); return el ? el.value : null; };
  if (v('bmTitle') != null) x.title = v('bmTitle');
  if (v('bmText') != null) x.text = v('bmText');
  if (v('bmAt') != null) x.atS = v('bmAt');
  if (v('bmEvery') != null) x.every = Number(v('bmEvery')) || x.every;
  const on = document.getElementById('bmOn'); if (on) x.on = on.checked;
}
function bmPayload() {
  const x = bmEd, p = { id: x.id || '', on: x.on };
  if (x.tm) p.at = x.atS;
  if (x.tx !== 'none') p.text = x.text;
  if (x.fx) {
    p.freq = x.freqK === 'def' ? 'def' : x.freqK === 'dows' ? 'dows' : 'every';
    p.every = x.freqK === 'd1' ? 1 : x.freqK === 'd2' ? 2 : Number(x.every);
    p.dows = x.dows;
  }
  if (x.custom) Object.assign(p, { title: x.title, to: x.toK, who: x.whoK, ids: x.ids });
  return p;
}
Object.assign(binds, {
  mgmt() {
    const $ = id => document.getElementById(id);
    document.querySelectorAll('[data-mgsub]').forEach(b => b.onclick = () => { if (mgSub === b.dataset.mgsub) return; mgSub = b.dataset.mgsub; flD = null; atD = null; clEd = null; bmEd = null; acEd = null; acD = null; grCfgD = null; grCfgP = null; grCfgNeed = null; mlD = null; mlF = ''; mlMore = 0; render(); });
    if (mgSub === 'ppl' && acD) return acBind();
    if (mgSub === 'gr' && grCfgD) return grCfgBind();
    if (mgSub === 'log') return mlBind();
    if (mgSub === 'flow') return flBind();
    if (mgSub === 'close') return clBind();
    if (mgSub === 'attn') return atBind();
    if (mgSub !== 'msgs' || !bmD) return;
    const go = y => { render.toTop = true; return render().then(() => window.scrollTo(0, y || 0)); };
    if (!bmEd) {
      const nb = $('bmNew'); if (nb) nb.onclick = () => { mgY = window.scrollY; bmEd = bmNewDraft(); go(0); };
      document.querySelectorAll('[data-bmsw]').forEach(l => {
        l.onclick = e => e.stopPropagation();
        const inp = l.querySelector('input');
        inp.onchange = async () => {
          const id = l.dataset.bmsw, on = inp.checked;
          try { bmD = await call('bmSave', { id, on }); haptic('success'); toast(on ? 'Включил ✅' : 'Выключил — бот не будет это присылать'); }
          catch (e) { inp.checked = !on; toast(e.message); }
          softRender();
        };
      });
      document.querySelectorAll('[data-bm]').forEach(r => r.onclick = () => {
        const id = r.dataset.bm, x = bmD.items.concat(bmD.custom).find(y => y.id === id); if (!x) return;
        mgY = window.scrollY; bmOpen(x); go(0);
      });
      return;
    }
    const x = bmEd, re = () => { bmKeep(); const y = window.scrollY; render().then(() => window.scrollTo(0, y)); };
    $('bmBack').onclick = () => { bmEd = null; go(mgY); };
    document.querySelectorAll('[data-bmfreq]').forEach(b => b.onclick = () => { x.freqK = b.dataset.bmfreq; re(); });
    document.querySelectorAll('[data-bmdow]').forEach(b => b.onclick = () => { bmKeep(); const w = Number(b.dataset.bmdow), i = x.dows.indexOf(w); if (i >= 0) x.dows.splice(i, 1); else x.dows.push(w); x.dows.sort(); re(); });
    document.querySelectorAll('[data-bmto]').forEach(b => b.onclick = () => { x.toK = b.dataset.bmto; re(); });
    document.querySelectorAll('[data-bmwho]').forEach(b => b.onclick = () => { x.whoK = b.dataset.bmwho; re(); });
    document.querySelectorAll('[data-bmid]').forEach(b => b.onclick = () => { bmKeep(); const id = b.dataset.bmid, i = x.ids.indexOf(id); if (i >= 0) x.ids.splice(i, 1); else x.ids.push(id); re(); });
    document.querySelectorAll('[data-bmvar]').forEach(b => b.onclick = () => {   // вставить {подстановку} туда, где курсор
      const ta = $('bmText'); if (!ta) return;
      const s = ta.selectionStart != null ? ta.selectionStart : ta.value.length, e = ta.selectionEnd != null ? ta.selectionEnd : s, t = '{' + b.dataset.bmvar + '}';
      ta.value = ta.value.slice(0, s) + t + ta.value.slice(e); ta.focus(); ta.selectionStart = ta.selectionEnd = s + t.length; x.text = ta.value;
    });
    const df = $('bmDef'); if (df) df.onclick = async () => {
      if (!(await confirmBox('Вернуть текст, который был у бота изначально?'))) return;
      bmKeep(); df.disabled = true;
      try { bmD = await call('bmReset', { id: x.id }); const n = bmD.items.find(y => y.id === x.id); x.text = n.text; x.textOwn = false; toast('Вернул текст по умолчанию'); re(); }
      catch (e) { toast(e.message); df.disabled = false; }
    };
    const sv = $('bmSave'); sv.onclick = async () => {
      bmKeep(); sv.disabled = true;
      try {
        bmD = await call('bmSave', bmPayload()); haptic('success'); toast('Сохранил ✅');
        bmEd = null; go(mgY);
      } catch (e) { toast(e.message); sv.disabled = false; }
    };
    const ts = $('bmTest'); if (ts) ts.onclick = async () => {
      bmKeep(); ts.disabled = true;
      try { await call('bmTest', { id: x.id, text: x.text, to: x.toK }); toast('Отправил тебе в бот 📨'); }
      catch (e) { toast(e.message); }
      ts.disabled = false;
    };
    const dl = $('bmDel'); if (dl) dl.onclick = async () => {
      if (!(await confirmBox('Удалить сообщение «' + (x.title || x.t) + '»? Бот перестанет его присылать'))) return;
      dl.disabled = true;
      try { bmD = await call('bmDel', { id: x.id }); toast('Удалил'); bmEd = null; go(mgY); }
      catch (e) { toast(e.message); dl.disabled = false; }
    };
  }
});
// ---- «Персонал»: какие вкладки видны — шаблон по статусу + личные галочки поверх. Бот: 19b_access.gs ----
let acD = null, acEd = null;
const acN = o => Object.keys(o).filter(k => o[k]).length + 1;   // +1 — «Сегодня» есть у всех
const acTabsW = n => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'вкладка' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'вкладки' : 'вкладок');
function acListView() {
  const d = acD;
  let out = card(`<h2>👥 Персонал</h2><p class="sub">Кому какие вкладки видны. Шаблон статуса — для всех с этим статусом, а человеку можно поставить свои галочки поверх шаблона. «Сегодня» есть у всех. Ничего не менял — всё как раньше</p>`);
  out += card(`<h3 style="margin-top:0">Шаблоны по статусу</h3>` + d.tpl.map(t => `<div class="mgrow" data-actpl="${esc(t.st)}"><div class="mgtxt"><b>${stBadge(t.st).replace('margin-left:6px', '')}</b>
    <span>${acTabsW(acN(t.on))}${t.own.length ? ' · ✏️ изменено: ' + t.own.length : ' · как обычно'}</span></div><span class="mgchev">›</span></div>`).join(''));
  out += card(`<h3 style="margin-top:0">Люди</h3>` + (d.people.length ? d.people.map(p => `<div class="mgrow" data-acp="${esc(p.name)}">${avaHtml(p.name)}<div class="mgtxt"><b>${esc(p.name)}${stBadge(p.status)}</b>
    <span>${acTabsW(acN(p.on))}${p.admin ? ' · 🛡 админ' : ''}${p.own.length ? ' · ✏️ свои: ' + p.own.length : ''}</span></div><span class="mgchev">›</span></div>`).join('') : '<p class="sub">Пока никого</p>'));
  return out;
}
function acCur() { const d = acD, e = acEd; return !e ? null : e.t ? d.tpl.find(t => t.st === e.t) : d.people.find(p => p.name === e.p); }
function acEdView() {
  const d = acD, x = acCur(); if (!x) { acEd = null; return acListView(); }
  const isT = !!acEd.t, base = isT ? x.def : x.base;
  let h = isT ? `<h2>Шаблон ${stBadge(x.st)}</h2><p class="sub">Эти вкладки увидят все со статусом «${esc(ST_LABEL[x.st] || x.st)}». У кого стоят свои галочки — у них свои</p>`
    : `<h2 style="display:flex;align-items:center;gap:10px">${avaHtml(x.name)}${esc(x.name)}</h2>
      <h3>Статус</h3><div class="chips">${ST_LIST.map(s => `<button class="chip ${x.status === s ? 'on' : ''}" data-acst="${esc(s)}">${esc(ST_LABEL[s])}</button>`).join('')}</div>
      <p class="sub">Тот же статус, что в «Команде». От него берётся шаблон вкладок${x.admin ? '. 🛡 Админ — поэтому по умолчанию видит и админские вкладки' : ''}${!x.id ? '. Не подключён к боту — галочки заработают, когда подключится' : ''}</p>`;
  h += `<h3>Вкладки</h3><div class="mgrow acrow"><div class="mgtxt"><b>Сегодня</b><span>есть у всех</span></div></div>`;
  h += d.tabs.map(([k, l]) => {
    const on = x.on[k], own = x.own.indexOf(k) >= 0, lock = k === 'mgmt' && !d.boss;
    const sub = own ? (isT ? '✏️ изменено' : '✏️ лично') + ' · ' + (isT ? 'обычно' : 'по шаблону') + ' ' + (base[k] ? 'есть' : 'нет') : isT ? 'как обычно' : 'по шаблону';
    return `<div class="mgrow acrow ${on ? '' : 'off'}"><div class="mgtxt"><b>${esc(l)}</b><span>${sub}${lock ? ' · выдаёт только главный админ' : ''}</span></div>
      <label class="mgsw ${lock ? 'lock' : ''}" data-ack="${esc(k)}"><input type="checkbox" ${on ? 'checked' : ''} ${lock ? 'disabled' : ''} aria-label="${esc(l)}"><i></i></label></div>`;
  }).join('');
  if (x.own.length) h += `<button class="btn soft" id="acReset" style="margin-top:14px">↩️ ${isT ? 'Как было изначально' : 'Убрать личные галочки — как по шаблону'}</button>`;
  return `<button class="btn soft" id="acBack">← К списку</button>` + card(h);
}
function acBind() {
  const $ = id => document.getElementById(id), go = y => { render.toTop = true; return render().then(() => window.scrollTo(0, y || 0)); };
  const re = () => { const y = window.scrollY; render().then(() => window.scrollTo(0, y)); };
  if (!acEd) {
    document.querySelectorAll('[data-actpl]').forEach(r => r.onclick = () => { mgY = window.scrollY; acEd = { t: r.dataset.actpl }; go(0); });
    document.querySelectorAll('[data-acp]').forEach(r => r.onclick = () => { mgY = window.scrollY; acEd = { p: r.dataset.acp }; go(0); });
    return;
  }
  $('acBack').onclick = () => { acEd = null; go(mgY); };
  const who = acEd.t ? { tpl: acEd.t } : { name: acEd.p };
  document.querySelectorAll('[data-ack]').forEach(l => {
    const inp = l.querySelector('input');
    inp.onchange = async () => {
      const k = l.dataset.ack, on = inp.checked;
      try { acD = await call('acSave', Object.assign({ k, on }, who)); haptic('success'); }
      catch (e) { inp.checked = !on; toast(e.message); return; }
      re();
    };
  });
  document.querySelectorAll('[data-acst]').forEach(b => b.onclick = async () => {
    const x = acCur(), s = x.status === b.dataset.acst ? '' : b.dataset.acst;
    try {
      acD = await call('acStatus', { name: x.name, status: s });
      if (me.statuses) { if (s) me.statuses[x.name] = s; else delete me.statuses[x.name]; }
      if (typeof cfg !== 'undefined' && cfg && cfg.statuses) { if (s) cfg.statuses[x.name] = s; else delete cfg.statuses[x.name]; }
      try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
      re();
    } catch (e) { toast(e.message); }
  });
  const rs = $('acReset'); if (rs) rs.onclick = async () => {
    if (!(await confirmBox(acEd.t ? 'Вернуть шаблон к обычному?' : 'Убрать личные галочки? Останется как по шаблону статуса'))) return;
    rs.disabled = true;
    try { acD = await call('acReset', who); toast('Готово'); re(); } catch (e) { toast(e.message); rs.disabled = false; }
  };
}
// ---- «Журнал»: кто, когда и что поменял в «Управлении» (MGMT_LOG, последние 300). Бот: mlog / mlList в 19_msgs.gs ----
let mlD = null, mlF = '', mlMore = 0;
const ML_SEC = { 'Сообщения': '✉️', 'Персонал': '👥', 'График': '🗓', 'Заготовки': '🫙', 'Закрытие': '🌙' };
function mlDay(ts) {
  const d = new Date(ts), t = new Date(), y = new Date(Date.now() - 864e5), same = (a, b) => a.toDateString() === b.toDateString();
  return same(d, t) ? 'Сегодня' : same(d, y) ? 'Вчера' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}
function mlView() {
  const all = (mlD && mlD.items) || [], secs = Object.keys(ML_SEC).filter(s => all.some(x => x.sec === s));
  const list = all.filter(x => !mlF || x.sec === mlF), shown = list.slice(0, 60 + mlMore);
  let h = `<h2>📜 Журнал изменений</h2><p class="sub">Кто, когда и что поменял в «Управлении»: сообщения бота, доступы к вкладкам, статусы, настройки графика. Хранятся последние 300 записей</p>`;
  if (secs.length > 1) h += `<div class="chips">${[['', 'Все']].concat(secs.map(s => [s, ML_SEC[s] + ' ' + s])).map(([k, l]) => `<button class="chip ${mlF === k ? 'on' : ''}" data-mlf="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
  if (!shown.length) return card(h + `<p class="sub" style="margin-top:12px">Пока пусто — здесь появится всё, что поменяют в «Управлении»</p>`);
  let day = '';
  shown.forEach(x => {
    const dd = mlDay(x.ts), tm = new Date(x.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (dd !== day) { day = dd; h += `<h3>${esc(dd)}</h3>`; }
    h += `<div class="mgrow mlrow"><div class="mgtime">${tm}</div><div class="mgtxt"><b>${esc(x.what)}</b><span>${ML_SEC[x.sec] || ''} ${esc(x.sec)} · ${esc(x.by)}</span></div></div>`;
  });
  if (list.length > shown.length) h += `<button class="btn soft" id="mlMore" style="margin-top:12px">Показать ещё (${list.length - shown.length})</button>`;
  return card(h);
}
function mlBind() {
  document.querySelectorAll('[data-mlf]').forEach(b => b.onclick = () => { mlF = b.dataset.mlf; mlMore = 0; softRender(); });
  const m = document.getElementById('mlMore'); if (m) m.onclick = () => { mlMore += 60; softRender(); };
}

// ---- «Расход» (с 26.11): движение заготовок по отдельности — бар, точки, списания, морозилка; совет по нормам. Бот: prepFlow / flowView в 04_prep.gs ----
let flD = null, flW = 4;
function flView() {
  const d = flD, dd = s => s.slice(8, 10) + '.' + s.slice(5, 7), n = x => fmt(x);
  let h = `<h2>📊 Расход заготовок</h2><p class="sub">${dd(d.from)}–${dd(d.to)}. «Бар» — что ушло на баре; выдачи точкам, списания и морозилка — отдельно. Где по старым данным не понять, куда ушёл объём, — «не удалось определить», в совет такие дни не идут</p>
    <div class="chips" style="margin-bottom:6px"><button class="chip ${flW === 1 ? 'on' : ''}" data-flw="1">Неделя</button><button class="chip ${flW === 4 ? 'on' : ''}" data-flw="4">4 недели</button></div>`;
  const rows = d.list.filter(x => x.bar || x.iss || x.waste || x.frz || x.thaw || x.unk || x.days);
  h += rows.length ? rows.map(x => `<div class="revrow"><div class="grow"><b>${esc(x.name)}</b>${x.arch ? ' <span class="tag-chk">архив</span>' : ''}
      <div class="olog">🍹 бар <b>${n(x.bar)}</b> ${esc(x.unit)}${x.iss ? ' · 📦 точкам ' + n(x.iss) : ''}${x.waste ? ' · 🗑 списано ' + n(x.waste) : ''}${x.frz ? ' · ❄️ в морозилку ' + n(x.frz) : ''}${x.thaw ? ' · разморозили ' + n(x.thaw) : ''}${x.unk ? ` · <span style="color:var(--danger)">❓ не удалось определить ${n(x.unk)} (${x.unkDays} дн.)</span>` : ''}</div>
      <div class="olog">учтено дней: ${x.days} из ${d.days}</div></div></div>`).join('') : '<p class="sub">Пока нет пар закрытий подряд — посчитать не из чего</p>';
  let a = `<h2>🧪 Нормы — совет</h2><p class="sub">По расходу на баре за 4 недели, только по дням, где расчёта хватает (нужно минимум ${d.minDays}). Менять нормы — только вручную: кнопка «✅ Изменить нормы» в сообщении бота у админа</p>`;
  a += d.adv.length ? d.adv.map(x => `<div class="revrow"><div class="grow"><b>${esc(x.name)}</b><div class="olog">сейчас ${n(x.cur)} → по расходу ${n(x.to)} ${esc(x.unit)} · учтено ${x.n} дн.</div></div>${x.adv ? `<span class="tag-late">${x.to > x.cur ? '⬆️' : '⬇️'} поменять</span>` : '<span class="tag-chk">ок</span>'}</div>`).join('')
    : `<p class="sub">Мало данных: ни по одной заготовке нет ${d.minDays} учтённых дней</p>`;
  a += `<button class="btn soft" id="flSend" style="margin-top:10px">📨 Прислать совет мне в Телеграм</button>`;
  return card(h) + card(a);
}
function flBind() {
  document.querySelectorAll('[data-flw]').forEach(b => b.onclick = () => { flW = +b.dataset.flw; flD = null; render(); });
  const s = document.getElementById('flSend'); if (s) s.onclick = async () => { s.disabled = true; try { await call('useSendMe'); toast('Отправил в Телеграм 📨'); } catch (e) { toast(e.message); } s.disabled = false; };
}

// ---- «⚠️ Внимание» (с 26.11): всё, что требует решения управляющего, в одном месте. Бот: attnList в 20_audit.gs (права проверяет бот) ----
let atD = null;
const AT_IC = { iss: '📦', batch: '🧊', auto: '🗑', stock: '⚖️', yield: '📉', label: '🏷' };
const AT_LBL = { iss: 'Выдача расходится', batch: 'Партия требует проверки', auto: 'Бот списал — ждёт ответа', stock: 'Расходятся остатки', yield: 'Факт ниже плана', label: 'Наклейка не подтверждена' };
const AT_GO = { today: ['today', 'Открыть «Сегодня»'], fridge: ['fridge', 'Открыть «Холодильник»'], flow: ['flow', 'Открыть «Расход»'] };
function atView() {
  const it = (atD && atD.items) || [];
  let h = `<h2>⚠️ Требует внимания</h2><p class="sub">Отклонения за последние дни: выдача точкам, просрочка, остатки, выход ниже плана, наклейки. Нажми «Перейти» — откроется нужное место</p>`;
  if (!it.length) return card(h + `<div class="status"><span class="big">✅</span>Всё в порядке — ничего не требует внимания</div>`);
  h += it.map((x, k) => `<div class="revrow attn"><div class="grow"><b>${AT_IC[x.k] || '•'} ${esc(AT_LBL[x.k] || '')}</b><div>${esc(x.t)}</div>
    <div class="olog">${x.who ? esc(x.who) + ' · ' : ''}${esc(fmtTs(x.at))}${x.hist ? ' · ' + esc(x.hist) : ''}</div></div>
    ${AT_GO[x.link] ? `<button class="tkbtn" data-atgo="${k}">Перейти</button>` : ''}</div>`).join('');
  if (atD.total > it.length) h += `<p class="sub">…и ещё ${atD.total - it.length}</p>`;
  return card(h);
}
function atBind() {
  document.querySelectorAll('[data-atgo]').forEach(b => b.onclick = () => {
    const x = atD.items[+b.dataset.atgo], g = AT_GO[x.link]; if (!g) return;
    if (g[0] === 'flow') { mgSub = 'flow'; flD = null; } else { tab = g[0]; if (g[0] === 'fridge') fridgeData = null; if (g[0] === 'today') { homeData = null; homeP = null; } }
    render.toTop = true; render().then(() => window.scrollTo(0, 0));
  });
}
// ---- «🌙 Закрытие»: чек-лист закрытия (перенесён из «Заготовок», пункты те же). Бот: checklistSave в 20_audit.gs ----
let clEd = null;
function clView() {
  if (!clEd) clEd = (me.checklist || []).slice();
  return card(`<h2>🌙 Чек-лист закрытия</h2><p class="sub">Пункты, которые отмечают на закрытии смены. Изменения пишутся в «Журнал»</p><div id="cl">` +
    clEd.map((t, k) => `<div class="cl-row edit" style="padding:8px;margin-bottom:8px"><input data-cl value="${esc(t)}" placeholder="Например: почистить кофемашину"><button class="x" data-cldel="${k}">×</button></div>`).join('') +
    `</div><button class="btn soft" id="cladd">+ Добавить пункт</button><button class="btn" id="clsave">Сохранить чек-лист</button>`);
}
function clBind() {
  const keep = () => { clEd = [...document.querySelectorAll('[data-cl]')].map(i => i.value); };
  const a = document.getElementById('cladd'); if (!a) return;
  a.onclick = () => { keep(); clEd.push(''); render().then(() => { const l = document.querySelectorAll('[data-cl]'); if (l.length) { l[l.length - 1].focus(); l[l.length - 1].scrollIntoView({ block: 'center' }); } }); };
  document.querySelectorAll('[data-cldel]').forEach(b => b.onclick = () => { keep(); clEd.splice(+b.dataset.cldel, 1); render(); });
  document.getElementById('clsave').onclick = async e => {
    keep(); e.target.disabled = true;
    try { const r = await call('mgChecklist', { items: clEd }); me.checklist = r.checklist; clEd = null; if (cfg) cfg.checklist = r.checklist; mlD = null; toast('Чек-лист сохранён ✅'); haptic('success'); render(); }
    catch (err) { toast(err.message); e.target.disabled = false; }
  };
}
