// Файл «js/14_mgmt.js»: вкладка «Управление» (админ и те, кому он выдал доступ): подвкладки «Сообщения»…
// Сообщения: все рассылки бота по расписанию (встроенные + свои) — текст-шаблон, время, частота, кому, вкл/выкл, проверка себе. Бот: 19_msgs.gs
let mgSub = 'msgs', bmD = null, bmEd = null, mgY = 0;
const MG_SUBS = [['msgs', '✉️ Сообщения']];
const MG_WD = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const mgHm = m => typeof m === 'number' ? String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') : '';
const BM_FREQ = [['d1', 'Каждый день'], ['d2', 'Через день'], ['n', 'Каждые N дней'], ['dows', 'По дням недели']];
const BM_WHO = [['all', 'Всем'], ['shift', 'Кто на смене'], ['ids', 'Выбранным'], ['admin', 'Админу']];

Object.assign(views, {
  async mgmt() {
    const subs = `<div class="mgsubs">${MG_SUBS.map(([k, l]) => `<button class="mgsub ${k === mgSub ? 'on' : ''}" data-mgsub="${k}">${l}</button>`).join('')}</div>`;
    if (mgSub === 'msgs') { bmD = bmD || await call('bmList'); return subs + (bmEd ? bmEdView() : bmListView()); }
    return subs;
  }
});

function bmRow(x) {
  const sub = [x.freq, x.to + ' — ' + x.who, x.textOwn ? '✏️ свой текст' : ''].filter(Boolean).join(' · ');
  return `<div class="mgrow ${x.on ? '' : 'off'}" data-bm="${esc(x.id)}"><div class="mgtime">${x.id === 'nice' ? '🎲' : mgHm(x.at)}</div>
    <div class="mgtxt"><b>${esc(x.t)}</b><span>${esc(sub)}</span></div>
    <label class="mgsw" data-bmsw="${esc(x.id)}"><input type="checkbox" ${x.on ? 'checked' : ''} aria-label="Включено"><i></i></label></div>`;
}
function bmListView() {
  const d = bmD, by = (a, b) => a.at - b.at;
  let out = card(`<h2>✉️ Сообщения бота</h2><p class="sub">Всё, что бот присылает сам по расписанию. Нажми на сообщение — поменять текст, время и частоту. Переключатель справа — включить или выключить</p>
    <button class="btn" id="bmNew">＋ Новое сообщение</button>`);
  if (d.custom.length) out += card(`<h3 style="margin-top:0">Свои</h3>${d.custom.map(bmRow).join('')}`);
  out += card(`<h3 style="margin-top:0">Встроенные</h3>${d.items.slice().sort(by).map(bmRow).join('')}`);
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
    document.querySelectorAll('[data-mgsub]').forEach(b => b.onclick = () => { if (mgSub === b.dataset.mgsub) return; mgSub = b.dataset.mgsub; bmEd = null; render(); });
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
