// Файл «js/10_order.js»: вкладка «Заказ» и «Забрал заказ» для точек
// ===== ТОЧКА ЗАБРАЛА ЗАКАЗ =====
function pickupCard() {
  const k = me.pickup; if (!k) return '';
  const byId = {}; me.preps.forEach(p => byId[p.id] = p);
  if (k.picked) return card(`<h2>📦 Заказ на сегодня забран</h2><p class="sub">${new Date(k.picked.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}: ` +
    Object.keys(k.picked.items).map(pid => esc((byId[pid] || {}).name || pid) + ' ' + fmt(k.picked.items[pid]) + ' ' + esc((byId[pid] || {}).unit || '')).join(', ') + '</p>');
  const has = Object.keys(k.items).length;
  return card(`<h2>📦 Забрать заказ</h2><p class="sub">${has ? 'Сегодняшний заказ: ' + Object.keys(k.items).map(pid => esc((byId[pid] || {}).name || pid) + ' ' + fmt(k.items[pid]) + ' ' + esc((byId[pid] || {}).unit || '')).join(', ') + '. ' : ''}Взял(а) заготовки — нажми и впиши, сколько забрал(а) на самом деле.</p>
    <button class="btn" id="pickBtn">📦 Забрал заказ</button>`);
}
function openPickup() {
  const k = me.pickup; if (!k) return;
  closeSheet();
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  const rows = me.preps.map(p => `<div class="prow"><div class="pname"><b>${esc(p.name)}</b>${k.items[p.id] != null ? `<span>в заказе ${fmt(k.items[p.id])} ${esc(p.unit)}</span>` : ''}</div>
    <label class="field"><input inputmode="decimal" data-pk="${esc(p.id)}" value="${k.items[p.id] != null ? esc(String(k.items[p.id]).replace('.', ',')) : ''}" placeholder="0"><small>${esc(p.unit)}</small></label></div>`).join('');
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>📦 Забрал заказ</h2>
    <p class="sub" style="margin-top:4px">Проверь цифры: если чего-то не хватило или взял(а) больше — поправь. Это вычтется из холодильника бара</p>${rows}
    <button class="btn" id="pkSend">Подтвердить</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  wrap.querySelector('#pkSend').onclick = async ev => {
    const items = {}; let bad = 0;
    wrap.querySelectorAll('[data-pk]').forEach(i => { const v = toNum(i.value); if (v === '') return; if (isNaN(v) || v < 0) bad++; else if (v > 0) items[i.dataset.pk] = v; });
    if (bad) return toast('Проверь числа');
    if (!Object.keys(items).length) return toast('Впиши, сколько забрал(а)');
    const chk = Object.keys(items).map(pid => { const p = me.preps.find(x => x.id === pid) || {}; return { pid, v: items[pid], unit: p.unit, name: p.name, inp: wrap.querySelector(`[data-pk="${CSS.escape(pid)}"]`) }; });
    if (!(await fixBig(chk))) return;
    chk.forEach(c => items[c.pid] = c.v);
    ev.target.disabled = true;
    try { const r = await call('orderPickup', { items }); me.pickup = r.pickup; haptic('success'); toast('Отмечено, спасибо! 📦'); closeSheet(); render(); }
    catch (e) { toast(e.message); ev.target.disabled = false; }
  };
}


Object.assign(views, {
  async order() {
    const o = me.order || { date: '', items: {} };
    if (!me.preps.length) return empty('🫙', 'Заготовок пока нет', 'Администратор ещё не добавил список.');
    const when = o.date ? new Date(o.date + 'T12:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    const has = Object.keys(o.items).length;
    const guTop = guCard() + pickupCard();
    const rows = me.preps.map(p => {
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
