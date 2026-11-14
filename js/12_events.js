// Файл «js/12_events.js»: вкладка «События» и регламенты из Google Docs
Object.assign(views, {
  async events() {
    [evData, bkData] = await Promise.all([evData || call('events'), bkData || call('bookings')]);
    const d = evData;
    const mon = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    // --- брони столов ---
    const todayD = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10), tmrD = addD(todayD, 1);
    const bkDay = dt => dt === todayD ? 'сегодня' : dt === tmrD ? 'завтра' : new Date(dt + 'T12:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
    const bkRows = bkData.bookings.map(b => `<div class="ev"><div class="bk-when"><div><b>${esc(b.time)}</b><small>${esc(bkDay(b.date))}</small></div></div>
        <div class="pname"><b>${esc(b.guest)} · ${b.people} ${b.people % 10 === 1 && b.people % 100 !== 11 ? 'гость' : [2, 3, 4].indexOf(b.people % 10) >= 0 && (b.people % 100 < 12 || b.people % 100 > 14) ? 'гостя' : 'гостей'}</b>
        <span>${b.phone ? `📞 <a href="tel:${esc(b.phone.replace(/[^\d+]/g, ''))}" style="color:inherit">${esc(b.phone)}</a> · ` : ''}внёс(ла) ${esc(b.byName)}</span>
        ${b.note ? `<span style="display:block;margin-top:4px;color:var(--forest-2)">💬 ${esc(b.note)}</span>` : ''}</div>
        ${b.canDel ? `<button class="x" data-bkdel="${esc(b.id)}">×</button>` : ''}</div>`).join('');
    let bk = card(`<h2>📌 Брони</h2><p class="sub">${bkData.bookings.length ? 'За час до брони бот напомнит в группе и отметит тех, кто на смене' : 'Броней пока нет. За час до брони бот напомнит в группе и отметит тех, кто на смене'}</p>${bkRows}`);
    if (bkData.canAdd) bk += `<details class="card" id="bkBox" ${bkOpen ? 'open' : ''}><summary><div class="pname"><h2>＋ Новая бронь</h2><p class="sub">Гость забронировал стол — внеси сюда</p></div></summary><div class="form">
        <label>На кого<input id="bGuest" placeholder="Имя гостя"></label>
        <div class="two"><label>Гостей<input id="bPeople" inputmode="numeric" placeholder="2"></label><label>Телефон<input id="bPhone" inputmode="tel" placeholder="необязательно"></label></div>
        <div class="two"><label>Дата<input id="bDate" type="date" min="${todayD}" value="${todayD}"></label><label>Время<input id="bTime" type="time" value="19:00"></label></div>
        <label>Комментарий<textarea id="bNote" rows="2" placeholder="Стол у окна, день рождения, детский стул…"></textarea></label>
        <button class="btn" id="bkAdd">Добавить бронь</button></div></details>`;
    const list = d.events.map(e => { const dt = new Date(e.date + 'T12:00');
      return `<div class="ev"><div class="evd"><div><b>${dt.getDate()}</b><small>${mon[dt.getMonth()]}</small></div></div>
        <div class="pname"><b>${esc(e.title)}</b><span>${dt.toLocaleDateString('ru-RU', { weekday: 'long' })} в ${esc(e.time)} · 👥 ${esc(e.to)}</span>
        ${e.note ? `<span style="display:block;margin-top:4px;color:var(--forest-2)">${esc(e.note)}</span>` : ''}</div>
        ${e.canDel ? `<button class="x" data-edel="${esc(e.id)}">×</button>` : ''}</div>`; }).join('');
    let out = bk + card(`<h2>События</h2><p class="sub">${d.events.length ? 'Ближайшие собрания и встречи' : 'Пока ничего не запланировано'}</p>${list}`);
    if (d.canCreate) {
      const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
      out += card(`<h2>Новое событие</h2><div class="form">
        <label>Что<input id="eTitle" placeholder="Например: собрание команды"></label>
        <div class="two"><label>Дата<input id="eDate" type="date" min="${today}" value="${today}"></label><label>Время<input id="eTime" type="time" value="18:00"></label></div>
        <label>Комментарий (необязательно)<textarea id="eNote" rows="2" placeholder="Повестка, место…"></textarea></label>
        <label>Для кого</label>${audiencePicker(evForm, d, 'e', true)}
        <button class="btn" id="eAdd">Создать и уведомить</button></div>`);
    }
    return out;
  },

});

Object.assign(binds, {
  events() {
    restoreForm('e');
    bindAudience(evForm, 'e');
    // брони
    const bkBox = document.getElementById('bkBox');
    if (bkBox) bkBox.addEventListener('toggle', () => { bkOpen = bkBox.open; });
    document.querySelectorAll('[data-bkdel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Удалить бронь? Напоминания не будет.'))) return;
      try { await call('bookingDel', { id: b.dataset.bkdel }); bkData = null; render(); } catch (e) { toast(e.message); }
    });
    const bkAdd = document.getElementById('bkAdd');
    if (bkAdd) bkAdd.onclick = async () => {
      const v = id => document.getElementById(id).value.trim();
      const guest = v('bGuest'), people = toNum(v('bPeople')), date = v('bDate'), time = v('bTime');
      if (!guest) return toast('Напиши, на кого бронь');
      if (!(people >= 1)) return toast('Сколько гостей?');
      if (!date || !time) return toast('Укажи дату и время');
      bkAdd.disabled = true; bkAdd.textContent = 'Сохраняю…';
      try { await call('bookingAdd', { guest, people, date, time, phone: v('bPhone'), note: v('bNote') }); haptic('success'); toast('Бронь добавлена 📌'); bkData = null; bkOpen = false; render(); }
      catch (e) { toast(e.message); bkAdd.disabled = false; bkAdd.textContent = 'Добавить бронь'; }
    };
    document.querySelectorAll('[data-edel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Отменить событие? Всем приглашённым придёт уведомление.'))) return;
      try { await call('eventDel', { id: b.dataset.edel, notify: true }); evData = null; render(); } catch (e) { toast(e.message); }
    });
    const add = document.getElementById('eAdd'); if (!add) return;
    add.onclick = async () => {
      const title = document.getElementById('eTitle').value.trim(), date = document.getElementById('eDate').value, time = document.getElementById('eTime').value, note = document.getElementById('eNote').value.trim();
      if (!title) return toast('Напиши, что за событие');
      if (!date || !time) return toast('Укажи дату и время');
      if (evForm.mode === 'status' && !evForm.statuses.length) return toast('Выбери статус');
      if (evForm.mode === 'people' && !evForm.ids.length) return toast('Выбери людей');
      add.disabled = true; add.textContent = 'Создаю…';
      try { await call('eventAdd', { title, date, time, note, to: evForm }); haptic('success'); toast('Событие создано, все уведомлены 📅');
        Object.keys(formKeep).filter(k => k[0] === 'e').forEach(k => delete formKeep[k]); evData = null; render(); }
      catch (e) { toast(e.message); add.disabled = false; add.textContent = 'Создать и уведомить'; }
    };
  },
});


// ===== РЕГЛАМЕНТ: документы из Google Docs, поиск по тексту =====
let regsData = null, regsQ = '';
function regHtml(text, q) {
  const hl = s => { let h = esc(s); if (q) h = h.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`); return h; };
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    if (/^[*•\-]\s+/.test(l)) return `<li>${hl(l.replace(/^[*•\-]\s+/, ''))}</li>`;
    if (l.length < 90 && /^(☐\s*)?\d+(\.\d+)*\.?\s+\S/.test(l) && !/[.;:]$/.test(l)) return `<h3>${hl(l)}</h3>`;
    return `<p>${hl(l)}</p>`;
  }).join('');
}
function regsList() {
  const q = regsQ.trim().toLowerCase(), docs = (regsData || []).filter(x => !q || (x.title + '\n' + x.text).toLowerCase().indexOf(q) >= 0);
  if (!docs.length) return '<p class="sub">Ничего не нашёл</p>';
  return docs.map(x => `<details class="reg" ${q ? 'open' : ''}><summary>${esc(x.title)}</summary><div class="rt">${x.err ? `<p style="color:var(--danger)">${esc(x.err)}</p>` : regHtml(x.text, q)}</div></details>`).join('');
}
views.regs = async function () {
  if (!regsData) regsData = (await call('regs')).docs;
  return card(`<h2>📜 Регламент</h2><p class="sub">Правила бара. Тексты берутся из Google-документов — если их поправят, здесь обновится само.</p>
    <div class="form"><input id="regQ" type="search" placeholder="🔍 Поиск по регламентам" value="${esc(regsQ)}"></div>
    ${me.isAdmin ? `<button class="btn soft" id="regRefresh" style="margin:8px 0 0;padding:11px">🔄 Обновить из документов</button>` : ''}
    <div id="regList" style="margin-top:6px">${regsList()}</div>`);
};
binds.regs = function () {
  const qi = document.getElementById('regQ'), box = document.getElementById('regList');
  if (qi) qi.oninput = () => { regsQ = qi.value; box.innerHTML = regsList(); };
  const rf = document.getElementById('regRefresh');
  if (rf) rf.onclick = async () => {
    rf.disabled = true; rf.textContent = 'Читаю документы…';
    try { regsData = (await call('regs', { fresh: true })).docs; toast('Регламенты обновлены ✅'); render(); }
    catch (e) { toast(e.message); rf.disabled = false; rf.textContent = '🔄 Обновить из документов'; }
  };
};

