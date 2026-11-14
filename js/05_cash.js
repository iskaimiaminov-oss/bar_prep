// Файл «js/05_cash.js»: вкладка «Наличные»: касса, конверт, расходы
// ===== НАЛИЧНЫЕ =====
// Суммы: «200 000», «200000 сум», «200к», «1,5 млн»
const parseMoney = v => {
  const s = String(v == null ? '' : v).toLowerCase().replace(/сум|sum|\s/g, '').replace(',', '.');
  const m = s.match(/^(\d+(?:\.\d+)?)(к|k|т|тыс|млн|m)?$/);
  if (!m) return NaN;
  return Math.round(Number(m[1]) * (!m[2] ? 1 : /млн|m/.test(m[2]) ? 1e6 : 1e3));
};
const money = x => { x = Math.round(Number(x) || 0); return (x < 0 ? '−' : '') + String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'; };
let cashD = null;
let cashChk = null;   // проверка кассы перед закрытием: { res, first, why, note }
const dmy = d => d.slice(8, 10) + '.' + d.slice(5, 7);
function cashOpRow(o) {
  const t = new Date(o.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `<div class="task" style="${o.canceled ? 'opacity:.5' : ''}"><div class="pname"><b style="${o.canceled ? 'text-decoration:line-through' : ''}">${o.kind === 'in' ? '+' : '−'}${esc(money(o.amount))} · ${esc(o.what)}</b>
    <span>${esc(o.srcLabel)} · ${esc(o.byName)} · ${t}${o.canceled ? ' · отменено' : o.edited ? ' · исправлено' : ''}${o.back ? ' · задним числом' : ''}</span></div>
    ${o.canEdit ? `<button class="tkbtn" data-cedit="${esc(o.id)}">✏️</button>` : ''}</div>`;
}
function cashHtml() {
  const d = cashD, out = [];
  out.push(card(`<h2>💵 Наличные</h2><p class="sub">Потратил из кассы или из конверта — сразу запиши сюда. Положил деньги в конверт — нажми «+ Внести»</p>
    <div style="display:flex;gap:8px"><button class="btn" id="cExp" style="flex:1;margin-top:0">− Расход</button><button class="btn ok" id="cIn" style="flex:1;margin-top:0">+ Внести</button></div>`));
  if (d.env) {
    const e = d.env;
    out.push(card(`<h2>✉️ Конверт</h2>` + (e.known
      ? `<div style="font-size:30px;font-weight:700;margin:6px 0 0;white-space:nowrap">${esc(money(e.exp))}</div><p class="sub" style="margin:0">сейчас в конверте — по последнему пересчёту и записям</p><p class="sub" style="margin:8px 0 0">Пересчёт ${esc(dmy(e.baseDate))} (${esc(e.baseBy)}): ${esc(money(e.base))} · + внесения ${esc(money(e.ins))} · − расходы ${esc(money(e.exps))}</p>`
      : `<p class="sub">Пересчёта ещё не было — первый будет на закрытии смены, с него бот начнёт считать остаток.</p>`) +
      ''));
  }
  const lbl = ['Сегодня', 'Вчера', 'Позавчера'];
  d.days.forEach((day, i) => {
    const ops = d.ops.filter(o => o.date === day);
    if (!ops.length && i) return;
    const live = ops.filter(o => !o.canceled), sum = f => live.filter(f).reduce((a, o) => a + o.amount, 0);
    const kx = sum(o => o.kind === 'exp' && o.src === 'kassa'), ex = sum(o => o.kind === 'exp' && o.src === 'env'), inn = sum(o => o.kind === 'in');
    out.push(card(`<h2>${lbl[i]} · ${dmy(day)}</h2>` + (ops.length
      ? `<p class="sub">${[kx ? 'из кассы −' + money(kx) : '', ex ? 'из конверта −' + money(ex) : '', inn ? 'в конверт +' + money(inn) : ''].filter(Boolean).join(' · ') || 'всё отменено'}</p>` + ops.map(cashOpRow).join('')
      : `<p class="sub">Записей пока нет</p>`)));
  });
  return out.join('');
}
// Окошко расхода / внесения. op — запись для исправления
// onDone — вызвать после записи вместо перерисовки (форма открыта с вкладки «Закрытие»); pre — что выбрать заранее
function openCashForm(kind, op, onDone, pre) {
  closeSheet();
  const d = cashD, st = op ? { src: op.src, kd: op.kd || d.today, cat: op.cat, person: op.person, amount: String(op.amount), note: op.note, back: false }
    : Object.assign({ src: 'kassa', kd: d.today, cat: '', person: '', amount: '', note: '', back: false, from: '' }, pre || {});
  if (op) st.from = op.from || '';
  const lbl = ['Сегодня', 'Вчера', 'Позавчера'];
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  const draw = () => {
    const isExp = kind === 'exp', a = parseMoney(st.amount);
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>${op ? '✏️ Исправить запись' : isExp ? '− Расход наличными' : '+ Внести в конверт'}</h2>
      ${isExp ? `<p class="sub" style="margin-top:4px">Откуда взяли деньги</p><div class="chips"><button class="chip ${st.src === 'kassa' ? 'on' : ''}" data-src="kassa">Касса</button><button class="chip ${st.src === 'env' ? 'on' : ''}" data-src="env">✉️ Конверт</button></div>
        ${st.src === 'kassa' ? `<p class="sub" style="margin-top:10px">Касса за какой день</p><div class="chips">${d.days.map((x, i) => `<button class="chip ${st.kd === x ? 'on' : ''}" data-kd="${x}">${lbl[i]} ${dmy(x)}</button>`).join('')}</div>` : ''}
        <p class="sub" style="margin-top:10px">На что потратили</p><div class="chips">${d.cats.map(c => `<button class="chip ${st.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        ${st.cat === 'ЗП стажёру' ? `<p class="sub" style="margin-top:10px">Кому</p><div class="chips">${d.people.map(n => `<button class="chip ${st.person === n ? 'on' : ''}" data-person="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}`
        : `<p class="sub" style="margin-top:4px">Откуда деньги</p><div class="chips"><button class="chip ${st.from === 'kassa' ? 'on' : ''}" data-from="kassa">Из кассы</button><button class="chip ${st.from === 'other' ? 'on' : ''}" data-from="other">Принесли со стороны</button></div>
          ${st.from === 'kassa' ? `<p class="sub" style="margin-top:10px">Из кассы за какой день</p><div class="chips">${d.days.map((x, i) => `<button class="chip ${st.kd === x ? 'on' : ''}" data-kd="${x}">${lbl[i]} ${dmy(x)}</button>`).join('')}</div>` : ''}`}
      <div class="form"><label>Сумма</label><input id="cAmt" inputmode="text" placeholder="Например: 200 000 или 200к" value="${esc(st.amount)}">
        <p class="sub" id="cAmtP" style="margin:6px 2px 0">${a > 0 ? '= ' + money(a) : ''}</p>
        <label>${isExp && st.cat === 'Другое' ? 'Название расхода *' : isExp ? 'Описание (необязательно)' : 'Комментарий (необязательно)'}</label>
        <input id="cNote" maxlength="200" placeholder="${isExp && st.cat === 'Другое' ? 'Например: ремонт кофемолки' : isExp ? 'Например: 10 батонов' : 'Например: из кассы за 19.10'}" value="${esc(st.note)}"></div>
      ${me.isAdmin && !op && (isExp ? st.src === 'env' : st.from !== 'kassa') ? `<div class="check ${st.back ? 'on' : ''}" id="cBack" style="margin-top:10px"><div class="box">✓</div><div class="pname"><b>Задним числом</b><span>Деньги уже учтены в последнем пересчёте конверта — на «должно быть» не повлияет</span></div></div>` : ''}
      <button class="btn" id="cSave">${op ? 'Сохранить' : isExp ? 'Записать расход' : 'Внести'}</button>
      ${op ? '<button class="btn soft" id="cDel">Отменить запись</button>' : ''}<button class="btn soft" id="closeSheet">Закрыть</button></div>`;
    const keep = () => { st.amount = wrap.querySelector('#cAmt').value; st.note = wrap.querySelector('#cNote').value; };
    wrap.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { keep(); st.src = b.dataset.src; draw(); });
    wrap.querySelectorAll('[data-from]').forEach(b => b.onclick = () => { keep(); st.from = b.dataset.from; draw(); });
    wrap.querySelectorAll('[data-kd]').forEach(b => b.onclick = () => { keep(); st.kd = b.dataset.kd; draw(); });
    wrap.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { keep(); st.cat = b.dataset.cat; draw(); });
    wrap.querySelectorAll('[data-person]').forEach(b => b.onclick = () => { keep(); st.person = b.dataset.person; draw(); });
    const bk = wrap.querySelector('#cBack'); if (bk) bk.onclick = () => { keep(); st.back = !st.back; draw(); };
    const amt = wrap.querySelector('#cAmt');
    amt.oninput = () => { const v = parseMoney(amt.value); wrap.querySelector('#cAmtP').textContent = v > 0 ? '= ' + money(v) : amt.value.trim() ? 'Не понял сумму — пиши цифрами, например 200 000' : ''; };
    wrap.querySelector('#closeSheet').onclick = closeSheet;
    const send = async (ev, payload) => {
      ev.target.disabled = true;
      try { cashD = await call(op ? 'cashEdit' : 'cashAdd', payload); cashD.fresh = true; haptic('success'); toast(payload.cancel ? 'Запись отменена' : op ? 'Исправлено ✅' : kind === 'exp' ? 'Расход записан ✅' : 'Внесено ✅'); closeSheet(); if (onDone) onDone(); else render(); }
      catch (e) { toast(e.message); ev.target.disabled = false; }
    };
    wrap.querySelector('#cSave').onclick = ev => {
      keep();
      const a = parseMoney(st.amount);
      if (!(a > 0)) return toast('Впиши сумму');
      if (kind === 'exp' && !st.cat) return toast('Выбери, на что потратили');
      if (kind === 'in' && !st.from) return toast('Выбери, откуда деньги');
      if (st.cat === 'ЗП стажёру' && !st.person) return toast('Выбери, кому ЗП');
      if (st.cat === 'Другое' && !st.note.trim()) return toast('Напиши название расхода');
      send(ev, Object.assign({ kind, amount: a, note: st.note.trim(), src: st.src, kd: st.kd, cat: st.cat, from: st.from, person: st.cat === 'ЗП стажёру' ? st.person : '', back: st.back }, op ? { id: op.id } : {}));
    };
    const del = wrap.querySelector('#cDel');
    if (del) del.onclick = async ev => { if (await confirmBox('Отменить эту запись? Она останется в истории зачёркнутой.')) send(ev, { id: op.id, cancel: true }); };
  };
  draw();
  document.body.appendChild(wrap);
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
}


Object.assign(views, {
  async cash() { if (!cashD || !cashD.fresh) cashD = await call('cash'); cashD.fresh = false; return cashHtml(); },
});

Object.assign(binds, {
  cash() {
    const e = document.getElementById('cExp'), i = document.getElementById('cIn');
    if (e) e.onclick = () => openCashForm('exp');
    if (i) i.onclick = () => openCashForm('in');
    document.querySelectorAll('[data-cedit]').forEach(b => b.onclick = () => { const o = cashD.ops.find(x => x.id === b.dataset.cedit); if (o) openCashForm(o.kind, o); });
  },
});
