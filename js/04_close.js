// Файл «js/04_close.js»: закрытие смены: остатки по датам, черновик, фото, история закрытий, передача склада
// ===== Закрытие: остатки строками «сколько + дата с наклейки» (плюсик — ещё дата), у замораживаемых — ещё морозилка =====
const tashDay = () => new Date(Date.now() + 5 * 36e5).toISOString().slice(0, 10);
function closeRows(p) {   // черновик, иначе даты партий в холодильнике, иначе одна пустая строка
  const dr = draft['r:' + p.id];
  if (Array.isArray(dr) && dr.length) return dr;
  const out = [], seen = {};
  ((me.cb || {})[p.id] || []).forEach(x => { if (x.day && !seen[x.day]) { seen[x.day] = 1; out.push({ q: '', d: x.day }); } });
  return out.length ? out : [{ q: '', d: '' }];
}
// строки, где не заполнено ничего, не считаем; сумма — только когда у всех остальных есть число
function closeSum(rows) {
  const rs = rows.filter(r => String(r.q).trim() !== '' || r.d);
  if (!rs.length) return '';
  let t = 0;
  for (const r of rs) { const v = toNum(r.q); if (v === '' || isNaN(v) || v < 0) return ''; t += v; }
  return fmt(t);
}
function closeRowsHtml(p) {
  const rows = closeRows(p), many = rows.length > 1, td = tashDay();
  return `<div class="bcap">Сколько осталось · дата на наклейке</div>` + rows.map((r, k) => `<div class="brow" data-ri="${k}">
      <label class="field"><input inputmode="decimal" enterkeyhint="next" data-rq="${esc(p.id)}" value="${esc(r.q)}" placeholder="0"><small>${esc(p.unit)}</small></label>
      <input type="date" class="bdate" data-rd="${esc(p.id)}" value="${esc(r.d || '')}" max="${td}">
      ${many ? `<button class="bbtn del" data-rdel="${esc(p.id)}" aria-label="Убрать строку">×</button>` : ''}
      ${k === rows.length - 1 ? `<button class="bbtn" data-radd="${esc(p.id)}" aria-label="Ещё дата">+</button>` : ''}
    </div>`).join('') +
    (p.frz ? `<div class="brow"><span class="frzl">❄️ В морозилке</span><label class="field"><input inputmode="decimal" enterkeyhint="next" data-fq="${esc(p.id)}" value="${esc(draft['f:' + p.id] != null ? draft['f:' + p.id] : '')}" placeholder="0"><small>${esc(p.unit)}</small></label></div>` : '');
}

const photoCache = {};
async function openClosing(x) {
  closeSheet();
  const byId = {}; me.preps.forEach(p => byId[p.id] = p);
  const c = x.checks;
  const chk = c ? (c.items ? c.items.map(i => `<div class="chk-row ${i.ok ? '' : 'no'}"><span>${i.ok ? '✅' : '❌'}</span><span>${esc(i.t)}</span></div>`).join('')
      : (c.missing.length ? c.missing.map(t => `<div class="chk-row no"><span>❌</span><span>${esc(t)}</span></div>`).join('') : '<p class="sub">Всё отмечено ✅</p>')) : '';
  const vals = Object.keys(x.values || {}).map(id => { const p = byId[id]; if (!p) return '';
    return `<div class="hrow ${x.values[id] < p.min ? 'low' : ''}"><span>${esc(p.name)}</span><b>${fmt(x.values[id])} ${esc(p.unit)}</b></div>`; }).join('');
  const ids = x.photos || [];
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div>
    <h2>${new Date(x.date + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</h2>
    <p class="sub" style="margin-top:4px">Закрыл(а): <b>${esc(x.by)}</b> · ${fmtTs(x.ts)}</p>
    ${ids.length ? `<h3>Фото (${ids.length})</h3><div class="photos">${ids.map(id => `<div class="ph loading" data-pid="${esc(id)}"><img alt=""></div>`).join('')}</div>` : '<h3>Фото</h3><p class="sub">Фото не приложены</p>'}
    ${c ? `<h3>Чек-лист ${c.done}/${c.total}</h3><div class="card" style="padding:4px 14px">${chk}</div>` : ''}
    <h3>Остатки</h3><div class="card" style="padding:4px 14px">${vals || '<p class="sub">Нет данных</p>'}</div>
    <button class="btn soft" id="closeSheet">Закрыть</button></div>`;
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  document.body.appendChild(wrap);
  wrap.querySelectorAll('[data-pid]').forEach(async el => {
    const id = el.dataset.pid, img = el.querySelector('img');
    try {
      photoCache[id] = photoCache[id] || call('photo', { id }).then(r => r.data);
      img.src = await photoCache[id]; el.classList.remove('loading');
      img.onclick = () => lightbox(img.src);
    } catch (e) { delete photoCache[id]; el.classList.remove('loading'); el.innerHTML = '<span class="sub" style="font-size:12px">не загрузилось</span>'; }
  });
}



const DRAFT_KEY = 'rassvet_close_draft';
let draftTimer = null;
function saveDraft() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const data = { ts: Date.now(), checks: [...checks], draft, photos: photos.filter(p => p.id).map(p => ({ id: p.id, src: p.src })) };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); }
    catch (e) { try { data.photos = data.photos.map(p => ({ id: p.id, src: '' })); localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e2) {} }
  }, 300);
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!d || Date.now() - d.ts > 10 * 3600e3) return false;
    (d.checks || []).forEach(k => checks.add(k));
    Object.assign(draft, d.draft || {});
    photos = (d.photos || []).map(p => ({ id: p.id, src: p.src || LOGO }));
    return checks.size || Object.keys(draft).length || photos.length;
  } catch (e) { return false; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

function photosGrid() {
  return photos.map((p, k) => `<div class="ph ${p.loading ? 'loading' : ''}"><img src="${esc(p.src)}" alt="" data-ph="${k}"><button class="x" data-phdel="${k}">×</button></div>`).join('') +
    (photos.length < 10 ? `<label class="ph add" for="phinput"><span><b>+</b>Фото</span></label>` : '');
}
function bindPhotos() {
  const grid = document.getElementById('phgrid'); if (!grid) return;
  const redraw = () => { grid.innerHTML = photosGrid(); bindPhotos(); };
  grid.querySelectorAll('[data-phdel]').forEach(b => b.onclick = () => { photos.splice(+b.dataset.phdel, 1); redraw(); saveDraft(); });
  grid.querySelectorAll('[data-ph]').forEach(im => im.onclick = () => lightbox(im.src));
  const inp = document.getElementById('phinput');
  inp.onchange = async () => {
    const files = [...inp.files].slice(0, 10 - photos.length); inp.value = '';
    for (const f of files) {
      let p;
      try { p = { src: await compress(f), loading: true }; } catch (e) { toast(e.message); continue; }
      photos.push(p); redraw();
      post('photoUpload', { data: p.src })
        .then(r => { p.id = r.id; p.loading = false; saveDraft(); })
        .catch(e => { toast('Фото не загрузилось: ' + e.message); photos.splice(photos.indexOf(p), 1); })
        .finally(() => { if (document.getElementById('phgrid')) redraw(); });
    }
  };
}


Object.assign(views, {
  async count() {
    const cz = lastResult || (!countReopen && me.closed);
    if (cz) {
      const items = cz.items || [];
      return card(`<div class="empty" style="padding-bottom:6px"><div class="icon">🌙</div><h2>${(me.checklist || []).length ? 'Смена закрыта, спасибо!' : 'Спасибо, остатки отправлены!'}</h2>${me.closed && me.closed.by ? `<p class="sub">Закрыл(а) ${esc(me.closed.by)}, ${fmtTs(me.closed.at)}</p>` : ''}</div>` +
        (items.length ? `<h3>Завтра нужно сварить</h3>` + items.map(needRow).join('') : `<div class="status"><span class="big">🌿</span>Всего хватает — завтра варить не нужно</div>`) +
        `<button class="btn soft" id="again">Изменить подсчёт</button>`);
    }
    if (me.canClose === false) {
      const first = esc(String(me.name || '').split(' ')[0]);
      const works = (me.shift || []).some(x => x.name === me.name);
      const who = (me.closers && me.closers.length) ? 'Сегодня смену закрывает: ' + me.closers.map(esc).join(', ') : '';
      return empty(works ? '☕' : '🌿', works ? first + ', ты сегодня не закрываешь, отдыхай💋' : first + ', ты сегодня не работаешь, отдыхай💋', who);
    }
    if (!me.preps.length) return empty('🫙', 'Заготовок пока нет', me.isAdmin ? 'Добавь их во вкладке «Заготовки».' : 'Администратор ещё не добавил список.');
    // каждая заготовка: строки «остаток + дата» (плюсик — ещё дата), сверху сумма по холодильнику; у замораживаемых — ещё морозилка
    const rows = me.preps.map(p => {
      const v = closeSum(closeRows(p)), low = v !== '' && toNum(v) < p.min;
      return `<div class="pblock"><div class="prow ${low ? 'low' : ''}" data-min="${p.min}">
        <div class="pname"><b>${esc(p.name)}<span class="tag">варить</span></b><span>минимум ${fmt(p.min)} ${esc(p.unit)}${p.frz ? ' · сумма — без морозилки' : ''}</span></div>
        <label class="field"><input inputmode="decimal" data-id="${esc(p.id)}" value="${esc(v)}" placeholder="сумма" readonly tabindex="-1"><small>${esc(p.unit)}</small></label>
      </div><div class="bsub" data-rp="${esc(p.id)}">${closeRowsHtml(p)}</div></div>`;
    }).join('');
    const last = me.last ? `<p class="sub">Последний подсчёт: ${esc(me.last.by)}, ${fmtTs(me.last.ts)}</p>` : `<p class="sub">Внеси, сколько осталось каждой заготовки</p>`;
    const cl = me.checklist || [];
    const clHtml = cl.length ? card(`<h2>Чек-лист закрытия</h2><p class="sub" id="clt">Отмечено ${checks.size} из ${cl.length}</p>` +
      cl.map((t, k) => `<div class="check ${checks.has(k) ? 'on' : ''}" data-ci="${k}"><div class="box">✓</div><div class="pname"><b>${esc(t)}</b></div></div>`).join('')) : '';
    const phHtml = card(`<h2>Фото закрытия</h2><p class="sub">Бар, витрина, мойка — <b>минимум 3</b>, до 10 фото</p><div class="photos" id="phgrid">${photosGrid()}</div>
      <input type="file" id="phinput" accept="image/*" multiple style="display:none">`);
    const cv = k => esc(draft['$' + k] != null ? draft['$' + k] : '');
    const cashHtml = card(`<h2>💵 Касса и конверт</h2><p class="sub">Без этого смену не закрыть. Суммы в сумах, можно писать «4 500 000» или «4500к»</p>
      <div class="form"><label>Наличные по отчёту iiko</label><input data-cash="ik" inputmode="text" enterkeyhint="next" placeholder="Сумма из распечатки iiko" value="${cv('ik')}">
      <label>💵 Пересчитай кассу — сколько наличных по факту</label><input data-cash="cf" inputmode="text" enterkeyhint="next" placeholder="Например: 1 150 000" value="${cv('cf')}">
      <label>✉️ Пересчитай конверт — сколько в нём сейчас</label><input data-cash="env" inputmode="text" enterkeyhint="done" placeholder="Например: 2 350 000" value="${cv('env')}"></div>
      <p class="sub" id="cashHint" style="margin-top:10px"></p><div id="cashChk"></div>`);
    const offs = me.offAsk || [], ddm = ts => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const offHtml = offs.length ? card(`<h2>🗑 Бот списал — вылили?</h2><p class="sub">Эти заготовки бот списал по сроку. Вылили — жми «✅ Вылили». Заготовка на месте и ещё живая — «↩️ Вернуть». Пока не ответишь по каждой, остатки не внести</p>` +
      offs.map(x => `<div class="batch"><div class="pname"><b>${esc(x.name)} · ${fmt(x.q)} ${esc(x.unit)}</b><span>партия от ${esc(ddm(x.made))}</span>
        <div class="acts" style="margin-top:8px"><button class="tkbtn" data-offok="${esc(x.id)}">✅ Вылили</button><button class="tkbtn" data-offret="${esc(x.id)}">↩️ Вернуть</button></div></div></div>`).join('')) : '';
    return clHtml + phHtml + cashHtml + offHtml + card(`<h2>Остатки заготовок</h2>${last}${offs.length ? '<p class="sub" style="color:var(--danger)">Сначала ответь про списанные ботом заготовки выше ☝️</p>' : ''}
      <div style="${offs.length ? 'opacity:.4;pointer-events:none' : ''}"><div class="progress"><i id="prog" style="width:0"></i></div><p class="sub" id="progt" style="margin:0 0 4px"></p>${rows}</div>`) +
      `<div class="dock"><button class="btn" id="send">${cl.length ? '🌙 Закрыть смену' : 'Отправить остатки'}</button></div>`;
  },

});

Object.assign(views, {
  async history() {
    if (!hist) hist = (await call('history')).items;
    const rep = me.isAdmin ? card(`<h2>🏆 Итоги 2 недель</h2><p class="sub">Рейтинг, кто сколько заготовок сварил. Приходит в группу сам раз в 2 недели в понедельник в 12:00</p><button class="btn soft" id="reportNow">Отправить итоги сейчас</button><button class="btn soft" id="weekNow" style="margin-top:8px">📊 Сводка недели мне в личку</button><button class="btn soft" id="briefNow" style="margin-top:8px">☀️ Утренний брифинг мне в личку</button>`) : '';
    if (!hist.length) return rep + empty('📜', 'Закрытий пока нет', 'Здесь появится история каждого закрытия смены.');
    const day = d => new Date(d + 'T12:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
    return rep + card(`<h2>История закрытий</h2><p class="sub">Последние 7 дней. Нажми, чтобы посмотреть подробно</p>`) +
      hist.map((x, k) => {
        const c = x.checks, okAll = c && c.done === c.total;
        return `<div class="card hcard" data-h="${k}"><div style="display:flex;align-items:center;gap:12px">
          <div class="pname"><b style="font-size:17px">${esc(day(x.date))}</b><span>${esc(x.by)} · ${new Date(x.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <span style="color:var(--muted);font-size:22px">›</span></div>
          <div class="hmeta">
            ${c ? `<span class="badge" style="${okAll ? '' : 'background:var(--warm-soft);color:var(--warm)'}">чек-лист ${c.done}/${c.total}</span>` : ''}
            <span class="badge">📷 ${(x.photos || []).length}</span>
            <span class="badge">остатки: ${Object.keys(x.values || {}).length}</span>
          </div></div>`;
      }).join('');
  }
});

Object.assign(binds, {
  count() {
    const again = document.getElementById('again');
    // «Изменить подсчёт»: возвращаем всё, что отправили (остатки, даты, морозилка, касса, чек-лист, фото)
    if (again) again.onclick = () => {
      lastResult = null; countReopen = true;
      if (sentCopy) { draft = JSON.parse(JSON.stringify(sentCopy.draft)); checks = new Set(sentCopy.checks); photos = sentCopy.photos.map(p => Object.assign({}, p)); saveDraft(); }
      render();
    };
    const btn = document.getElementById('send'); if (!btn) return;
    const cl = me.checklist || [];
    bindPhotos();
    document.querySelectorAll('[data-ci]').forEach(el => el.onclick = () => {
      const k = +el.dataset.ci;
      if (checks.has(k)) checks.delete(k); else checks.add(k);
      el.classList.toggle('on', checks.has(k)); saveDraft();
      document.getElementById('clt').textContent = `Отмечено ${checks.size} из ${cl.length}`; syncBtn();
      try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
    });
    const inputs = [...document.querySelectorAll('input[data-id]')];
    // строки «остаток + дата»: сумма по холодильнику — в поле заготовки; плюсик — ещё строка, × — убрать
    const boxOf = pid => document.querySelector(`.bsub[data-rp="${CSS.escape(pid)}"]`);
    const readRows = pid => [...boxOf(pid).querySelectorAll('.brow[data-ri]')].map(r => ({ q: r.querySelector('[data-rq]').value, d: r.querySelector('[data-rd]').value }));
    const syncSum = pid => { const m = inputs.find(i => i.dataset.id === pid); if (m) { m.value = closeSum(readRows(pid)); m.dispatchEvent(new Event('input')); } };
    const redraw = (pid, rows, focusK) => {
      draft['r:' + pid] = rows; saveDraft();
      const p = me.preps.find(x => x.id === pid), box = boxOf(pid); box.innerHTML = closeRowsHtml(p);
      syncSum(pid);
      if (focusK != null) { const f = box.querySelectorAll('[data-rq]')[focusK]; if (f) f.focus(); }
    };
    document.querySelectorAll('.bsub[data-rp]').forEach(box => {
      const pid = box.dataset.rp;
      box.addEventListener('input', e => {
        const t = e.target;
        if (t.dataset.fq != null) { draft['f:' + pid] = t.value; t.parentNode.classList.remove('bad'); saveDraft(); syncBtn(); return; }
        if (t.dataset.rq == null && t.dataset.rd == null) return;
        (t.dataset.rd != null ? t : t.parentNode).classList.remove('bad');
        draft['r:' + pid] = readRows(pid); saveDraft(); syncSum(pid);
      });
      box.addEventListener('change', e => { if (e.target.dataset.rd != null) { e.target.classList.remove('bad'); draft['r:' + pid] = readRows(pid); saveDraft(); syncSum(pid); } });
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const rows = readRows(pid);
        if (b.dataset.radd != null) { rows.push({ q: '', d: '' }); redraw(pid, rows, rows.length - 1); try { tg.HapticFeedback.selectionChanged(); } catch (e) {} }
        else if (b.dataset.rdel != null) { rows.splice(+b.closest('.brow').dataset.ri, 1); redraw(pid, rows.length ? rows : [{ q: '', d: '' }]); }
      });
    });
    inputs.forEach(i => i.onclick = () => { const box = boxOf(i.dataset.id); if (!box) return; const f = [...box.querySelectorAll('[data-rq]')].find(x => x.value.trim() === '') || box.querySelector('[data-rq]'); if (f) f.focus(); });
    const cashIn = [...document.querySelectorAll('input[data-cash]')], cashVal = k => { const i = cashIn.find(x => x.dataset.cash === k); return i ? parseMoney(i.value) : NaN; };
    // подсказка: что уже записано из кассы через «Наличные» (бот вычтет это из остатка iiko)
    const cashHint = () => {
      const h = document.getElementById('cashHint'); if (!h) return;
      const o = me.cashOut || {}, parts = [o.exp ? 'расходы ' + money(o.exp) : '', o.toEnv ? 'в конверт ' + money(o.toEnv) : ''].filter(Boolean);
      h.innerHTML = (parts.length ? 'Из кассы за сегодня записано: ' + parts.join(', ') + '. ' : 'Из кассы за сегодня ничего не записано. ') +
        'Если что-то брали из кассы и не записали — сначала внеси во вкладке «Наличные».';
    };
    // проверка перед закрытием: разница больше ±20 000 → подсказка, исправить на месте, иначе причина
    const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v));
    const drawChk = () => {
      const box = document.getElementById('cashChk'); if (!box) return;
      const r = cashChk && cashChk.res;
      if (!r || !r.big) { box.innerHTML = ''; return; }
      const line = (ic, nm, d, ok) => Math.abs(d) > r.tol ? `${ic} ${nm}: ${d > 0 ? 'лишние ' : '<b>недостача</b> '}${esc(money(Math.abs(d)))}` : `${ic} ${nm} сходится`;
      const nums = `<p style="margin:6px 0 0">${line('🧾', 'Касса', r.kd)}${r.known ? '<br>' + line('✉️', 'Конверт', r.ed) : ''}</p>`;
      const ops = r.hint && r.hint.ops && r.hint.ops.length ? `<p class="sub" style="margin:8px 0 2px">Что записано — сверь с тем, что брали на самом деле:</p>` +
        r.hint.ops.map(o => `<div style="font-size:14px;margin:2px 0">${o.near ? '👉 <b>' : '• '}${esc(money(o.a))} — ${esc(o.what)}${o.near ? '</b>' : ''}${o.by ? ' · <i>' + esc(o.by) + '</i>' : ''}</div>`).join('') : '';
      const fixBtns = `<div class="chips" style="margin-top:8px"><button class="chip" id="chkExp">− Забытый расход</button><button class="chip" id="chkIn">+ Внесение в конверт</button></div>`;
      if (!r.short) {   // излишек: только подсказка, закрывать не мешает
        box.innerHTML = `<div style="margin-top:12px;padding:12px;border-radius:14px;background:var(--warm-soft);color:var(--forest)">
          <b>💰 Лишние деньги</b>${nums}${r.hint && r.hint.text ? `<p style="margin:8px 0 0">💡 ${esc(r.hint.text)}</p>` : ''}${fixBtns}</div>`;
      } else {
        const nl = (cashChk.note || '').trim().length;
        const step = (k, n, t) => `<button class="chip ${cashChk[k] ? 'on' : ''}" data-step="${k}" style="display:block;width:100%;text-align:left;margin:6px 0;white-space:normal">${cashChk[k] ? '' : '⬜️ '}<b>Шаг ${n}.</b> ${t}</button>`;
        box.innerHTML = `<div style="margin-top:12px;padding:12px;border-radius:14px;background:var(--warm-soft);color:var(--forest)">
          <b>⚠️ Недостача больше 20 000</b>${nums}
          ${r.hint && r.hint.text ? `<p style="margin:8px 0 0">💡 ${esc(r.hint.text)}</p>` : ''}${ops}
          <p class="sub" style="margin:12px 0 2px">Разберись, без этого смену не закрыть:</p>
          ${step('s1', 1, 'Пересчитал(а) кассу и конверт ещё раз и вписал(а) точные суммы')}
          ${step('s2', 2, 'Проверил(а): все расходы и внесения за смену записаны во вкладке «Наличные»')}
          ${fixBtns}
          <p class="sub" style="margin:12px 0 4px">Объясни своими словами, откуда недостача:</p>
          <div class="form"><textarea id="chkNote" maxlength="300" rows="3" placeholder="Например: дал сдачу 50 000 вместо 5 000 гостю за 3-м столом">${esc(cashChk.note || '')}</textarea></div>
          <p class="sub" id="chkNl" style="margin:2px 0 0">${nl >= r.noteMin ? '✅ Объяснение есть' : 'Ещё ' + (r.noteMin - nl) + ' знаков минимум'}</p></div>`;
        box.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
          const k = b.dataset.step; cashChk[k] = !cashChk[k];
          if (k === 's1' && cashChk[k]) { const i = cashIn.find(x => x.dataset.cash === 'cf'); if (i) { i.focus(); i.select(); } }
          drawChk(); syncBtn();
        });
        box.querySelector('#chkNote').oninput = e => {
          cashChk.note = e.target.value; const n = cashChk.note.trim().length, p = document.getElementById('chkNl');
          if (p) p.textContent = n >= r.noteMin ? '✅ Объяснение есть' : 'Ещё ' + (r.noteMin - n) + ' знаков минимум'; syncBtn();
        };
      }
      const after = async () => { await runChk(cashNow()); };
      const openF = async (kind, pre) => { try { if (!cashD) cashD = await call('cash'); openCashForm(kind, null, after, pre); } catch (e) { toast(e.message); } };
      box.querySelector('#chkExp').onclick = () => openF('exp', { src: Math.abs(r.kd) > r.tol || !r.known ? 'kassa' : 'env' });
      box.querySelector('#chkIn').onclick = () => openF('in', { from: r.kd > r.tol || (r.kd < -r.tol && r.ed > r.tol) ? 'kassa' : '' });
    };
    // разбор недостачи пройден: оба шага и объяснение своими словами
    const chkDone = () => !!(cashChk && cashChk.s1 && cashChk.s2 && (cashChk.note || '').trim().length >= ((cashChk.res && cashChk.res.noteMin) || 15) && (cashChk.note || '').trim().split(/\s+/).length >= 2);
    const cashNow = () => ({ ik: cashVal('ik'), cf: cashVal('cf'), env: cashVal('env') });
    // true — можно закрывать
    const runChk = async cash => {
      const r = await call('cashPreview', { cash });
      if (!cashChk) cashChk = { first: { kd: r.kd, ed: r.ed }, s1: false, s2: false, note: '' };
      cashChk.res = r; drawChk();
      return !r.short || chkDone();
    };
    cashIn.forEach(i => i.oninput = () => { draft['$' + i.dataset.cash] = i.value; saveDraft(); cashHint(); if (cashChk) { cashChk.res = null; drawChk(); } syncBtn(); });
    cashHint();
    drawChk();
    // что ещё мешает закрыть смену
    const MIN_PH = 3;
    const missing = () => {
      const m = [], cMiss = cl.length - checks.size, ph = photos.filter(p => p.id).length;
      const vMiss = inputs.filter(i => i.value.trim() === '').length + [...document.querySelectorAll('input[data-fq]')].filter(i => i.value.trim() === '').length;
      if (cMiss > 0) m.push(cMiss + ' ' + (cMiss === 1 ? 'пункт' : cMiss < 5 ? 'пункта' : 'пунктов'));
      if (ph < MIN_PH) m.push((MIN_PH - ph) + ' фото');
      if (vMiss > 0) m.push(vMiss + ' ' + (vMiss === 1 ? 'остаток' : vMiss < 5 ? 'остатка' : 'остатков'));
      if (cashIn.length && cashIn.some(i => !(parseMoney(i.value) >= 0))) m.push('касса');
      else if (cashChk && cashChk.res && cashChk.res.short && !chkDone()) m.push('разбор недостачи');
      return m;
    };
    const syncBtn = () => {
      const m = missing(), ready = !m.length && !photos.some(p => p.loading);
      btn.classList.toggle('locked', !ready);
      btn.textContent = ready ? '🌙 Закрыть смену' : photos.some(p => p.loading) ? '⏳ Загружаю фото…' : '🔒 Осталось: ' + m.join(' · ');
    };
    syncBtn.ref = setInterval(() => { if (!document.getElementById('send')) return clearInterval(syncBtn.ref); syncBtn(); }, 700);
    const upd = () => {
      const filled = inputs.filter(i => i.value.trim() !== '').length;
      document.getElementById('prog').style.width = (filled / inputs.length * 100) + '%';
      document.getElementById('progt').textContent = `Заполнено ${filled} из ${inputs.length}`;
      syncBtn();
    };
    inputs.forEach(i => i.oninput = () => {
      draft[i.dataset.id] = i.value; saveDraft();
      const row = i.closest('.prow'), v = toNum(i.value);
      row.classList.toggle('low', v !== '' && !isNaN(v) && v < Number(row.dataset.min));
      upd();
    });
    upd();
    syncBtn();
    // «вылили» — сразу на экране; «вернуть» — ждём бота, но одним запросом (свежие данные приходят в том же ответе)
    const offDone = async (action, id, msg, drop) => {
      toast(drop ? msg : 'Сохраняю…');
      try { await quick(action, { id }, ['me', 'fridge'], drop ? () => { me.offAsk = (me.offAsk || []).filter(y => y.id !== id); } : null); haptic('success'); if (!drop) toast(msg); } catch (e) {}
    };
    document.querySelectorAll('[data-offok]').forEach(b => b.onclick = () => offDone('autoOffOk', b.dataset.offok, 'Отмечено: вылили 🗑', true));
    document.querySelectorAll('[data-offret]').forEach(b => b.onclick = async () => {
      const x = (me.offAsk || []).find(y => y.id === b.dataset.offret); if (!x) return;
      if (!(await confirmBox(`Вернуть ${x.name} (${fmt(x.q)} ${x.unit})? Партия вернётся в холодильник и уйдёт из отчёта списаний.`))) return;
      offDone('batchReturn', x.id, 'Партия возвращена ↩️');
    });
    btn.onclick = async () => {
      if ((me.offAsk || []).length) { toast('Сначала ответь про списанные ботом заготовки'); haptic('error'); const o = document.querySelector('[data-offok]'); if (o) o.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      // строки по датам и морозилка: сначала поправим 1600 → 1,6, потом проверим числа и даты
      const qIn = [...document.querySelectorAll('input[data-rq], input[data-fq]')];
      const pOf = x => me.preps.find(y => y.id === (x.dataset.rq || x.dataset.fq)) || {};
      await fixBig(qIn.filter(x => toNum(x.value) !== '' && !isNaN(toNum(x.value))).map(x => { const p = pOf(x); return { v: toNum(x.value), unit: p.unit, name: p.name, inp: x }; }));
      const badQ = qIn.filter(x => { const v = toNum(x.value); return v !== '' && (isNaN(v) || v < 0); });
      if (badQ.length) { badQ.forEach(x => x.parentNode.classList.add('bad')); badQ[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Проверь числа — есть ошибка'); haptic('error'); return; }
      // остаток больше нуля — нужна дата с наклейки, и не из будущего
      const td = tashDay(), badD = [...document.querySelectorAll('.brow[data-ri]')].map(r => r.querySelector('[data-rd]')).filter(d => { const q = toNum(d.closest('.brow').querySelector('[data-rq]').value); return (q !== '' && q > 0 && !d.value) || (d.value && d.value > td); });
      if (badD.length) { badD.forEach(d => d.classList.add('bad')); badD[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); toast(badD[0].value ? 'Дата на наклейке не может быть из будущего' : 'Укажи дату с наклейки у каждого остатка'); haptic('error'); return; }
      const values = {}, rq = {}, fq = {};
      me.preps.forEach(p => {
        const box = boxOf(p.id); if (!box) return;
        const rs = readRows(p.id).filter(r => String(r.q).trim() !== '' || r.d), s = closeSum(rs);
        if (s === '') return;
        values[p.id] = toNum(s); rq[p.id] = rs.map(r => ({ q: toNum(r.q), d: r.d }));
      });
      document.querySelectorAll('input[data-fq]').forEach(i => { const v = toNum(i.value); if (v !== '') fq[i.dataset.fq] = v; });
      const cash = { ik: cashVal('ik'), cf: cashVal('cf'), env: cashVal('env') };
      if (photos.some(p => p.loading)) { toast('Подожди, фото ещё загружаются…'); return; }
      const m = missing();
      let force = false;
      if (m.length) {
        haptic('error');
        if (!me.isAdmin) { toast('Чтобы закрыть смену, осталось: ' + m.join(', ')); return; }
        if (!(await confirmBox('Не всё заполнено (' + m.join(', ') + '). Ты админ — закрыть смену всё равно?'))) return;
        force = true;
      }
      if (!force && cashIn.length) {
        btn.disabled = true; btn.textContent = 'Проверяю кассу…';
        let ok = false;
        try { ok = await runChk(cash); } catch (e) { toast(e.message); }
        btn.disabled = false; syncBtn();
        if (!ok) { haptic('error'); const b = document.getElementById('cashChk'); if (b && b.innerHTML) { toast('Недостача — пройди 2 шага и объясни своими словами'); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
      }
      const cashWhy = cashChk && cashChk.res && cashChk.res.short ? { s1: !!cashChk.s1, s2: !!cashChk.s2, note: (cashChk.note || '').trim() } : null, cashFirst = cashChk ? cashChk.first : null;
      btn.disabled = true; btn.textContent = 'Отправляю…';
      try { lastResult = await call('count', { values, rq, fq, checks: [...checks], photos: photos.filter(p => p.id).map(p => p.id), force, cash, cashWhy, cashFirst }); countReopen = false; me.closed = { by: me.name, at: Date.now(), items: lastResult.items || [] }; sentCopy = { draft: JSON.parse(JSON.stringify(draft)), checks: [...checks], photos: photos.filter(p => p.id).map(p => Object.assign({}, p)) }; draft = {}; checks.clear(); photos = []; hist = null; cashChk = null; clearDraft(); me = await call('me'); haptic('success'); render(); window.scrollTo(0, 0); askExtras(lastResult && lastResult.extra); }
      catch (e) { toast(e.message); btn.disabled = false; btn.textContent = cl.length ? '🌙 Закрыть смену' : 'Отправить остатки'; }
    };
  },
});

Object.assign(binds, {
  history() {
    const bb = document.getElementById('briefNow');
    if (bb) bb.onclick = async () => { bb.disabled = true; try { await call('briefNow'); toast('Брифинг отправлен тебе в личку ☀️'); } catch (e) { toast(e.message); } bb.disabled = false; };
    const wb = document.getElementById('weekNow');
    if (wb) wb.onclick = async () => { wb.disabled = true; try { await call('weekNow'); toast('Сводка отправлена тебе в личку 📊'); } catch (e) { toast(e.message); } wb.disabled = false; };
    const rb = document.getElementById('reportNow');
    if (rb) rb.onclick = async () => {
      if (!(await confirmBox('Отправить в группу итоги заготовок за последние 2 недели?'))) return;
      rb.disabled = true;
      try { await call('reportNow'); haptic('success'); toast('Итоги отправлены в группу 🏆'); } catch (e) { toast(e.message); }
      rb.disabled = false;
    };
    document.querySelectorAll('[data-h]').forEach(el => el.onclick = () => openClosing(hist[+el.dataset.h]));
  },
});

// ===== ПЕРЕДАЧА СКЛАДА: утро сдаёт по чек-листу, вечер принимает =====
const tm = ts => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' });
function skCard() {
  const k = me.sk; if (!k) return '';
  const s = k.s, acc = s && s.acc;
  const sum = s ? `<p class="sub">Сдал(а) <b>${esc(s.by)}</b> в ${tm(s.at)} · ${s.miss.length ? '⚠️ не в порядке: ' + s.miss.map(esc).join(', ') : '✅ все пункты в порядке'}${s.note ? '<br>💬 ' + esc(s.note) : ''}</p>` : '';
  const accLine = acc ? `<div class="status" style="${acc.note ? 'background:var(--warm-soft);color:var(--warm)' : ''}"><span class="big">${acc.note ? '⚠️' : '✅'}</span>Принял(а) ${esc(acc.by)} в ${tm(acc.at)}${acc.note ? ': ' + esc(acc.note) : ''}</div>` : '';
  if (k.role === 'give' && !s) return card(`<h2>📦 Передача склада</h2><p class="sub">Перед уходом пройди чек-лист уборки склада и сдай склад вечерней смене${k.take.length ? ' (' + k.take.map(esc).join(', ') + ')' : ''}. Что не в порядке — не отмечай.</p>` +
    k.items.map((it, i) => `<div class="check" data-sk="${i}"><div class="box">✓</div><div><b>${esc(it.t)}</b>${it.d ? `<span class="skd">${esc(it.d)}</span>` : ''}</div></div>`).join('') +
    `<div class="form"><textarea id="skNote" rows="2" placeholder="Комментарий для вечерней смены (необязательно)"></textarea></div><button class="btn" id="skGive">📦 Сдать склад</button>`);
  if (k.role === 'take' && !s) return card(`<h2>📦 Передача склада</h2><p class="sub">Утренняя смена${k.give.length ? ' (' + k.give.map(esc).join(', ') + ')' : ''} ещё не сдала склад. Как сдаст — придёт сообщение.</p>`);
  if (k.role === 'take' && !acc) return card(`<h2>📦 Приём склада</h2>${sum}<p class="sub">Проверь склад и подтверди.</p>
    <button class="btn" id="skOk">✅ Принял(а)</button><button class="btn soft" id="skBad">⚠️ Есть замечания</button>`);
  return card(`<h2>📦 Передача склада</h2>${sum}${accLine || (s ? '<p class="sub">Вечерняя смена ещё не подтвердила.</p>' : '')}`);
}
function bindSk() {
  const k = me.sk; if (!k) return;
  document.querySelectorAll('[data-sk]').forEach(el => el.onclick = () => el.classList.toggle('on'));
  const reload = async () => { me = await call('me'); render(); };
  const g = document.getElementById('skGive');
  if (g) g.onclick = async () => {
    const checks = [...document.querySelectorAll('[data-sk].on')].map(el => +el.dataset.sk), miss = k.items.length - checks.length;
    if (miss && !(await confirmBox(`Не отмечено пунктов: ${miss}. Сдать склад с пометкой «не в порядке»?`))) return;
    g.disabled = true; g.textContent = 'Отправляю…';
    try { await call('skGive', { checks: checks, note: document.getElementById('skNote').value }); haptic('success'); toast('Склад сдан — вечерняя смена получила сообщение ✅'); await reload(); }
    catch (e) { toast(e.message); g.disabled = false; g.textContent = '📦 Сдать склад'; }
  };
  const ok = document.getElementById('skOk');
  if (ok) ok.onclick = async () => { ok.disabled = true; try { toast((await call('skAcc', { ok: true })).msg); haptic('success'); await reload(); } catch (e) { toast(e.message); ok.disabled = false; } };
  const bad = document.getElementById('skBad');
  if (bad) bad.onclick = () => {
    closeSheet();
    const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
    wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>⚠️ Что не в порядке?</h2><p class="sub" style="margin-top:4px">Передам управляющему и утренней смене.</p>
      <div class="form"><textarea id="skBadT" rows="3" placeholder="Например: морозильник грязный, коробки в проходе"></textarea></div>
      <button class="btn" id="skBadSend">Отправить</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#closeSheet').onclick = closeSheet;
    wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
    const b = wrap.querySelector('#skBadSend');
    b.onclick = async () => {
      const note = wrap.querySelector('#skBadT').value.trim(); if (!note) return toast('Напиши, что не так');
      b.disabled = true;
      try { toast((await call('skAcc', { ok: false, note: note })).msg); closeSheet(); await reload(); } catch (e) { toast(e.message); b.disabled = false; }
    };
  };
}

