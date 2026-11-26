// Файл «js/15_shtollen.js»: вкладка «🎄 Штоллен» — предзаказ штолленов на Новый год (бот: 21_shtollen.gs)
// Вкладка всегда первая и закреплена у всех, кроме точек Яндекс/Узум (см. tabsList в 02_layout.js).
let shtData = null, shtOpen = false;
let shtF = null;   // форма: новый заказ или правка (id)
const SHT_PAY_L = { none: 'без предоплаты', part: 'частично', full: 'оплачен полностью' };
const shtWord = q => { const n = Math.abs(q) % 100, m = n % 10; return n > 10 && n < 20 ? 'штолленов' : m > 1 && m < 5 ? 'штоллена' : m === 1 ? 'штоллен' : 'штолленов'; };
const shtMoney = x => String(Math.round(Number(x) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум';
function shtToday() { return new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); }
function shtNew() { return { id: '', name: '', phone: '', qty: '1', date: '', time: '12:00', how: 'pickup', addr: '', pay: 'none', paid: '', note: '' }; }
function shtDay(dt) {
  const t = shtToday();
  const w = new Date(dt + 'T12:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  return dt === t ? 'Сегодня, ' + w : dt === addD(t, 1) ? 'Завтра, ' + w : w[0].toUpperCase() + w.slice(1);
}
function shtForm() {
  const f = shtF, t = shtToday(), chip = (k, v, l) => `<button class="chip ${f[k] === v ? 'on' : ''}" data-shc="${k}" data-v="${v}">${l}</button>`;
  return `<div class="form">
    <label>Имя клиента<input id="shName" value="${esc(f.name)}" placeholder="Анастасия"></label>
    <div class="two"><label>Телефон<input id="shPhone" inputmode="tel" value="${esc(f.phone)}" placeholder="+998 90 123 45 67"></label>
      <label>Штолленов<input id="shQty" inputmode="numeric" value="${esc(f.qty)}" placeholder="1"></label></div>
    <div class="two"><label>На какое число<input id="shDate" type="date" min="${t}" value="${esc(f.date || t)}"></label>
      <label>Во сколько<input id="shTime" type="time" value="${esc(f.time)}"></label></div>
    <label>Как получит</label><div class="chips">${chip('how', 'pickup', '🏃 Самовывоз')}${chip('how', 'delivery', '🚗 Доставка')}</div>
    <label id="shAddrL" style="${f.how === 'delivery' ? '' : 'display:none'}">Адрес доставки<input id="shAddr" value="${esc(f.addr)}" placeholder="Улица, дом, квартира, ориентир"></label>
    <label>Предоплата</label><div class="chips">${chip('pay', 'none', 'Нет')}${chip('pay', 'part', 'Частично')}${chip('pay', 'full', 'Полностью')}</div>
    <label id="shPaidL" style="${f.pay === 'part' ? '' : 'display:none'}">Сколько внесли<input id="shPaid" inputmode="numeric" value="${esc(f.paid)}" placeholder="100 000"></label>
    <label>Комментарий<textarea id="shNote" rows="2" placeholder="Подписать открытку, позвонить за 30 минут…">${esc(f.note)}</textarea></label>
    <button class="btn" id="shSave">${f.id ? 'Сохранить изменения' : 'Добавить заказ'}</button>
    ${f.id ? '<button class="btn soft" id="shCancelEd">Не менять</button>' : ''}</div>`;
}
function shtRow(o) {
  const pay = o.pay === 'part' ? 'предоплата ' + shtMoney(o.paid) : SHT_PAY_L[o.pay];
  return `<div class="ev"><div class="bk-when"><div><b>${esc(o.time)}</b></div></div>
    <div class="pname"><b>${esc(o.name)} · ${o.qty} ${shtWord(o.qty)}</b>
      <span>📞 <a href="tel:${esc(String(o.phone).replace(/[^\d+]/g, ''))}" style="color:inherit">${esc(o.phone)}</a></span>
      <span style="display:block;margin-top:2px">${o.how === 'delivery' ? '🚗 Доставка: ' + esc(o.addr) : '🏃 Самовывоз'} · 💳 ${esc(pay)}</span>
      ${o.note ? `<span style="display:block;margin-top:4px;color:var(--forest-2)">💬 ${esc(o.note)}</span>` : ''}
      <span style="display:block;margin-top:4px;font-size:13px">принял(а) ${esc(o.bn)}${o.ub ? ' · изменил(а) ' + esc(o.ub) : ''}</span>
      ${o.can && o.st !== 'x' ? `<div style="display:flex;gap:8px;margin-top:8px"><button class="btn soft" style="padding:8px 14px;width:auto;min-height:0;font-size:14px" data-shed="${esc(o.id)}">✏️ Изменить</button>
        <button class="btn soft" style="padding:8px 14px;width:auto;min-height:0;font-size:14px;color:var(--danger)" data-shx="${esc(o.id)}">Отменить</button></div>` : ''}
    </div></div>`;
}
Object.assign(views, {
  async sht() {
    shtData = shtData || await call('shtList');
    if (!shtF) shtF = shtNew();
    const d = shtData, all = d.totals.reduce((a, t) => a + t.q, 0);
    const head = card(`<h2>🎄 Штоллены на Новый год</h2>
      <p class="sub">${d.items.length ? `Всего <b>${all} ${shtWord(all)}</b> · ${d.items.length} ${d.items.length === 1 ? 'заказ' : d.items.length < 5 ? 'заказа' : 'заказов'}` : 'Заказов пока нет'}. За час до времени заказа бот напишет в группу и отметит тех, кто на смене.</p>
      <button class="btn soft" id="shSheet">📊 Открыть таблицу</button>`);
    const form = `<details class="card" id="shBox" ${shtOpen || shtF.id ? 'open' : ''}><summary><div class="pname"><h2>${shtF.id ? '✏️ Изменить заказ' : '＋ Новый заказ'}</h2>
      <p class="sub">${shtF.id ? 'Поменяй, что нужно, и сохрани' : 'Клиент заказал штоллен — внеси сюда'}</p></div></summary>${shtForm()}</details>`;
    const days = d.totals.map(t => {
      const list = d.items.filter(o => o.date === t.date);
      return card(`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">${esc(shtDay(t.date))}</h2><span class="pill">${t.q} шт</span></div>
        <p class="sub">${t.n} ${t.n === 1 ? 'заказ' : t.n < 5 ? 'заказа' : 'заказов'}${t.dl ? ` · доставка ${t.dl} шт` : ''}${t.pk ? ` · самовывоз ${t.pk} шт` : ''}</p>${list.map(shtRow).join('')}`);
    }).join('');
    const cx = d.cancelled.length ? `<details class="card"><summary><div class="pname"><h2>Отменённые (${d.cancelled.length})</h2></div></summary>
      ${d.cancelled.map(o => `<div class="ev" style="opacity:.6"><div class="pname"><b>${esc(o.name)} · ${o.qty} шт · ${esc(shtDay(o.date))} ${esc(o.time)}</b><span>отменил(а) ${esc(o.ub || '')}${o.why ? ' · ' + esc(o.why) : ''}</span></div></div>`).join('')}</details>` : '';
    return head + form + days + cx;
  }
});
Object.assign(binds, {
  sht() {
    const g = id => document.getElementById(id);
    const keep = () => { if (!g('shName')) return; Object.assign(shtF, { name: g('shName').value, phone: g('shPhone').value, qty: g('shQty').value, date: g('shDate').value, time: g('shTime').value, addr: g('shAddr').value, paid: g('shPaid').value, note: g('shNote').value }); };
    const box = g('shBox'); if (box) box.addEventListener('toggle', () => { shtOpen = box.open; });
    const sb = g('shSheet'); if (sb) sb.onclick = () => { try { tg.openLink(shtData.sheet); } catch (e) { window.open(shtData.sheet, '_blank'); } };
    document.querySelectorAll('[data-shc]').forEach(b => b.onclick = () => {
      const k = b.dataset.shc; shtF[k] = b.dataset.v;
      document.querySelectorAll(`[data-shc="${k}"]`).forEach(x => x.classList.toggle('on', x === b));
      g('shAddrL').style.display = shtF.how === 'delivery' ? '' : 'none';
      g('shPaidL').style.display = shtF.pay === 'part' ? '' : 'none';
    });
    const ce = g('shCancelEd'); if (ce) ce.onclick = () => { shtF = shtNew(); shtOpen = false; render(); };
    const save = g('shSave');
    if (save) save.onclick = async () => {
      keep();
      const f = shtF, qty = toNum(f.qty);
      if (!f.name.trim()) return toast('Напиши имя клиента');
      if (f.phone.replace(/\D/g, '').length < 7) return toast('Впиши телефон клиента');
      if (!(qty >= 1)) return toast('Сколько штолленов?');
      if (!f.date || !f.time) return toast('Укажи дату и время');
      if (f.how === 'delivery' && !f.addr.trim()) return toast('Напиши адрес доставки');
      if (f.pay === 'part' && !(toNum(f.paid) > 0)) return toast('Сколько внесли предоплаты?');
      save.disabled = true; save.textContent = 'Сохраняю…';
      try {
        shtData = await call(f.id ? 'shtEdit' : 'shtAdd', Object.assign({}, f, { qty: qty }));
        haptic('success'); toast(f.id ? 'Заказ изменён ✏️' : 'Заказ добавлен 🎄'); shtF = shtNew(); shtOpen = false; render();
      } catch (e) { toast(e.message); save.disabled = false; save.textContent = f.id ? 'Сохранить изменения' : 'Добавить заказ'; }
    };
    document.querySelectorAll('[data-shed]').forEach(b => b.onclick = () => {
      const o = shtData.items.find(x => x.id === b.dataset.shed); if (!o) return;
      shtF = { id: o.id, name: o.name, phone: o.phone, qty: String(o.qty), date: o.date, time: o.time, how: o.how, addr: o.addr || '', pay: o.pay, paid: o.paid ? String(o.paid) : '', note: o.note || '' };
      render().then(() => { const bx = g('shBox'); if (bx) bx.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    });
    document.querySelectorAll('[data-shx]').forEach(b => b.onclick = async () => {
      const o = shtData.items.find(x => x.id === b.dataset.shx); if (!o) return;
      if (!(await confirmBox('Отменить заказ ' + o.name + ' (' + o.qty + ' шт)? Напоминания не будет.'))) return;
      try { shtData = await call('shtCancel', { id: o.id }); if (shtF.id === o.id) shtF = shtNew(); haptic('success'); toast('Заказ отменён'); render(); } catch (e) { toast(e.message); }
    });
  }
});
