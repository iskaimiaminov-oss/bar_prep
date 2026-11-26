// Файл «js/10_order.js»: вкладка «Заказ» и «Забрал заказ» для точек
// ===== ЗАКАЗЫ ТОЧЕК: заказано · собрано · выдано · осталось; выдача частями (с 26.11) =====
const dmT = ts => new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ordDay = d => new Date(d + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
function ordItemsTxt(v, items) { return Object.keys(items || {}).map(pid => { const r = v.rows.find(x => x.pid === pid) || {}; return esc(r.name || pid) + ' ' + fmt(items[pid]) + ' ' + esc(r.unit || ''); }).join(', '); }
// тело заказа: числа по каждой заготовке, история выдач, расхождения. canFix — показать кнопку «Сверить»
function ordBody(v, canFix) {
  let h = `<p class="sub" style="margin:2px 0 0">Заказ на <b>${esc(ordDay(v.date))}</b>${v.at ? ' · оформлен ' + esc(dmT(v.at)) : ''}${v.closed ? ' · <b style="color:var(--ok)">✅ выдан полностью</b>' : ''}</p>`;
  h += v.rows.map(r => `<div style="margin-top:10px"><b>${esc(r.name)}</b>${r.ord == null ? ' <span class="tag-late">не было в заказе</span>' : ''}</div>
    <div class="onum"><div><small>Заказано</small><b>${r.ord == null ? '—' : fmt(r.ord)}</b></div><div><small>Собрано</small><b>${r.asm == null ? '—' : fmt(r.asm)}</b></div>
      <div><small>Выдано</small><b>${fmt(r.iss)}</b></div><div class="left ${r.ord != null && r.left <= 0 ? 'done' : ''}"><small>Осталось</small><b>${r.ord == null ? '—' : fmt(r.left)} ${esc(r.unit)}</b></div></div>`).join('');
  if (v.asmBy) h += `<div class="olog">✋ Собрал(а) ${esc(v.asmBy)}, ${esc(dmT(v.asmAt))}</div>`;
  if (v.iss.length) h += `<div class="olog" style="margin-top:8px"><b>История выдачи</b></div>` + v.iss.map(e => `<div class="olog">${esc(dmT(e.at))} · ${e.legacy ? 'забрал(а)' : e.src === 'point' ? 'забрал(а)' : 'выдал(а)'} ${esc(e.by || v.who)} → ${esc(v.point)}: ${ordItemsTxt(v, e.items)}${e.fix ? ` · <b>сверено</b> ${esc(e.fix.by)}, ${esc(dmT(e.fix.at))}: по факту ${ordItemsTxt(v, e.fix.items)}` : ''}</div>`).join('');
  v.iss.filter(e => e.chk).forEach(e => {
    const lines = Object.keys(e.over).map(pid => { const r = v.rows.find(x => x.pid === pid) || {}; return `${esc(r.name || pid)}: выдали больше заказа на ${fmt(e.over[pid])} ${esc(r.unit || '')}`; })
      .concat(Object.keys(e.miss).map(pid => { const r = v.rows.find(x => x.pid === pid) || {}; return `${esc(r.name || pid)}: в учёте было меньше — не хватило ${fmt(e.miss[pid])} ${esc(r.unit || '')} (списали только ${fmt(e.acct[pid] || 0)})`; }));
    h += `<div class="odisc">⚠️ <b>Расхождение</b> · ${esc(dmT(e.at))}, ${esc(e.by)}<br>${lines.join('<br>')}<br>${canFix ? `<button class="tkbtn" style="margin-top:8px" data-ofix="${esc(v.date + '|' + v.name + '|' + e.id)}">🔎 Сверить и подтвердить</button>` : '<i>Сверит управляющий или старший бариста</i>'}</div>`;
  });
  return h;
}
// окошко «сколько» по заготовкам: rows [{pid, name, unit, val, sub}] → {pid: число} или null
function ordQty(title, sub, rows, okText, allowZero) {
  return new Promise(res => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>${esc(title)}</h2><p class="sub" style="margin-top:4px">${sub}</p>` +
      rows.map(r => `<div class="prow"><div class="pname"><b>${esc(r.name)}</b>${r.sub ? `<span>${r.sub}</span>` : ''}</div>
        <label class="field"><input inputmode="decimal" data-oq="${esc(r.pid)}" value="${r.val != null && r.val !== '' ? esc(String(r.val).replace('.', ',')) : ''}" placeholder="0"><small>${esc(r.unit)}</small></label></div>`).join('') +
      `<button class="btn" id="oqOk">${esc(okText)}</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
    document.body.appendChild(wrap);
    const done = v => { closeSheet(); res(v); };
    wrap.querySelector('#closeSheet').onclick = () => done(null);
    wrap.onclick = e => { if (e.target === wrap) done(null); };
    wrap.querySelector('#oqOk').onclick = async () => {
      const items = {}, ins = [...wrap.querySelectorAll('[data-oq]')]; let bad = 0;
      ins.forEach(i => { const v = toNum(i.value); if (v === '') return; if (isNaN(v) || v < 0) bad++; else if (v > 0 || allowZero) items[i.dataset.oq] = v; });
      if (bad) return toast('Проверь числа');
      if (!Object.keys(items).length) return toast('Впиши количество');
      const chk = Object.keys(items).map(pid => { const r = rows.find(x => x.pid === pid) || {}; return { pid, v: items[pid], unit: r.unit, name: r.name, inp: wrap.querySelector(`[data-oq="${CSS.escape(pid)}"]`) }; });
      if (!(await fixBig(chk))) return;
      chk.forEach(c => items[c.pid] = c.v);
      done(items);
    };
  });
}
const prepRowsFor = (v, val) => me.preps.filter(p => !p.arch || v.rows.some(r => r.pid === p.id)).map(p => { const r = v.rows.find(x => x.pid === p.id); return { pid: p.id, name: p.name, unit: p.unit || '', val: val(r, p), sub: r && r.ord != null ? `заказано ${fmt(r.ord)} · выдано ${fmt(r.iss)} · осталось ${fmt(r.left)} ${esc(p.unit || '')}` : '' }; });
// ---- точка: «Забрал заказ» (можно частями) ----
function pickupCard() {
  const k = me.pickup; if (!k) return '';
  const has = k.rows && k.rows.length;
  if (!has) return card(`<h2>📦 Забрать заказ</h2><p class="sub">На сегодня заказа нет. Взял(а) заготовки без заказа — всё равно отметь, сколько.</p><button class="btn" id="pickBtn">📦 Забрал(а)</button>`);
  return card(`<h2>📦 ${k.closed ? 'Заказ забран' : 'Забрать заказ'}</h2>${ordBody(k, false)}` +
    (k.closed ? '' : `<p class="sub" style="margin-top:10px">Можно частями: забрал(а) половину — отметь половину, остальное — потом.</p><button class="btn" id="pickBtn">📦 Забрал(а)</button>`));
}
async function openPickup() {
  const k = me.pickup; if (!k) return;
  const items = await ordQty('📦 Забрал(а) заказ', 'Впиши, сколько забрал(а) сейчас — по умолчанию стоит то, что осталось забрать. Это вычтется из холодильника бара', prepRowsFor(k, r => r && r.ord != null && r.left > 0 ? r.left : ''), 'Подтвердить');
  if (!items) return;
  try { const r = await call('orderPickup', { items }); me.pickup = r.pickup; haptic('success'); toast(r.closed ? 'Заказ забран полностью 📦' : r.chk ? 'Отмечено. Есть расхождение — бар сверит' : 'Отмечено, спасибо! 📦'); render(); }
  catch (e) { toast(e.message); }
}
// ---- бар: заказы точек на «Сегодня» ----
function ordersCard(o) {
  if (!o || !o.list || !o.list.length) return '';
  return card(`<h2>📦 Заказы точек</h2><p class="sub">Заказано · собрано · выдано. Выдавать можно частями</p>` + o.list.map(v => `<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px">
    <b style="font-size:17px">${esc(v.point)}</b> <span class="sub">${esc(v.who)}</span>${ordBody(v, o.canFix)}
    ${v.closed ? '' : `<div class="two" style="margin-top:10px"><button class="btn soft" style="margin:0" data-oasm="${esc(v.date + '|' + v.name)}">✋ Собрано</button><button class="btn" style="margin:0" data-oiss="${esc(v.date + '|' + v.name)}">📤 Выдать</button></div>`}</div>`).join(''));
}
function bindOrders(redraw) {
  const o = homeData && homeData.orders; if (!o) return;
  const find = k => { const [date, name] = k.split('|'); return o.list.find(v => v.date === date && v.name === name); };
  const after = r => { homeData.orders = r; redraw(); };
  document.querySelectorAll('[data-oasm]').forEach(b => b.onclick = async () => {
    const v = find(b.dataset.oasm); if (!v) return;
    const items = await ordQty('✋ Собрано для ' + v.point, 'Сколько приготовили для точки (из холодильника пока не списываем — спишем при выдаче)', prepRowsFor(v, r => r && r.asm != null ? r.asm : r && r.ord != null ? r.left : ''), 'Сохранить', true);
    if (!items) return;
    try { after(await call('orderAsm', { date: v.date, name: v.name, items })); haptic('success'); toast('Записано ✋'); } catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-oiss]').forEach(b => b.onclick = async () => {
    const v = find(b.dataset.oiss); if (!v) return;
    const items = await ordQty('📤 Выдать: ' + v.point, 'Сколько отдаёшь точке сейчас. Можно частями', prepRowsFor(v, r => r && r.ord != null && r.left > 0 ? r.left : ''), 'Выдать');
    if (!items) return;
    try { const r = await call('orderIssue', { date: v.date, name: v.name, items }); after(r); haptic('success'); toast(r.res && r.res.chk ? 'Выдано. Есть расхождение — смотри карточку ⚠️' : r.res && r.res.closed ? 'Заказ выдан полностью ✅' : 'Выдано 📤'); }
    catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-ofix]').forEach(b => b.onclick = async () => {
    const [date, name, id] = b.dataset.ofix.split('|'), v = o.list.find(x => x.date === date && x.name === name), e = v && v.iss.find(x => x.id === id); if (!e) return;
    const rows = Object.keys(e.items).map(pid => { const r = v.rows.find(x => x.pid === pid) || {}; return { pid, name: r.name || pid, unit: r.unit || '', val: e.items[pid], sub: `записали ${fmt(e.items[pid])}, в учёте списали ${fmt(e.acct[pid] || 0)}${r.ord != null ? ', в заказе ' + fmt(r.ord) : ''}` }; });
    const items = await ordQty('🔎 Сверка выдачи', 'Пересчитай, сколько на самом деле отдали точке. Учёт поправится на разницу, в истории останется, кто и когда сверил', rows, 'Подтвердить', true);
    if (!items) return;
    try { after(await call('orderFix', { date, name, id, items })); haptic('success'); toast('Сверено ✅'); } catch (er) { toast(er.message); }
  });
}


Object.assign(views, {
  async order() {
    const o = me.order || { date: '', items: {} };
    if (!me.preps.length) return empty('🫙', 'Заготовок пока нет', 'Администратор ещё не добавил список.');
    const when = o.date ? new Date(o.date + 'T12:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const has = Object.keys(o.items).length;
    const guTop = guCard() + pickupCard();
    const rows = me.preps.filter(p => !p.arch).map(p => {   // архивные заготовки заказать нельзя
      const v = orderDraft[p.id] != null ? orderDraft[p.id] : (o.items[p.id] != null ? String(o.items[p.id]) : '');
      return `<div class="prow"><div class="pname"><b>${esc(p.name)}</b></div>
        <label class="field"><input inputmode="decimal" enterkeyhint="next" data-oid="${esc(p.id)}" value="${esc(v)}" placeholder="0"><small>${esc(p.unit)}</small></label></div>`;
    }).join('');
    return guTop + card(`<h2>Заказ заготовок</h2><p class="sub">Впиши, сколько нужно. Заказ уйдёт в группу бара <b>${esc(when)} в 08:00</b>.${has ? ' Заказ уже сохранён — можно изменить до отправки.' : ''}</p>${rows}`) +
      `<div class="dock"><button class="btn" id="sendOrder">${has ? 'Обновить заказ' : 'Отправить заказ'}</button></div>`;
  },

});

Object.assign(binds, {
  order() {
    bindGu();
    const pb = document.getElementById('pickBtn'); if (pb) pb.onclick = openPickup;
    document.querySelectorAll('[data-oid]').forEach(i => i.oninput = () => { orderDraft[i.dataset.oid] = i.value; });
    const btn = document.getElementById('sendOrder'); if (!btn) return;
    btn.onclick = async () => {
      const items = {}; let bad = 0;
      document.querySelectorAll('[data-oid]').forEach(i => { const v = toNum(i.value); if (v === '') return; if (isNaN(v) || v < 0) bad++; else if (v > 0) items[i.dataset.oid] = v; });
      if (bad) { toast('Проверь числа — есть ошибка'); haptic('error'); return; }
      const chk = Object.keys(items).map(pid => { const p = me.preps.find(x => x.id === pid) || {}; return { pid, v: items[pid], unit: p.unit, name: p.name, inp: document.querySelector(`[data-oid="${CSS.escape(pid)}"]`) }; });
      if (!(await fixBig(chk))) { haptic('error'); return; }
      chk.forEach(c => items[c.pid] = c.v);
      if (!Object.keys(items).length && !(await confirmBox('Заказ пустой. Отменить заказ на завтра?'))) return;
      btn.disabled = true; btn.textContent = 'Отправляю…';
      try { const r = await call('order', { items, _back: ['me'] }); orderDraft = {}; me = r._me || await call('me'); haptic('success'); toast(Object.keys(items).length ? 'Заказ сохранён ✅' : 'Заказ отменён'); render(); }
      catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Отправить заказ'; }
    };
  },
});
