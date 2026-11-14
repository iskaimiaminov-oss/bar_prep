// Файл «js/09_tasks.js»: вкладка «Задачи» и генуборка
// ===== ГЕНУБОРКА (пн–ср) =====
function guCard() {
  const g = me.gu; if (!g) return '';
  return card(`<h2>🧹 Генуборка</h2><p class="sub">${g.shifts.length > 1 ? 'Твои смены: ' : 'Твоя смена: '}<b>${g.shifts.map(esc).join('; ')}</b></p>` +
    (g.done ? `<div class="status"><span class="big">✅</span>Отмечено — спасибо!</div>`
      : `<p class="sub">Зону уборки посмотри в сообщении в группе. Убрал(а) — нажми кнопку и загрузи фото: их получат администраторы. Отметить можно до конца среды.</p><button class="btn" id="guBtn">✅ Выполнил</button>`));
}
function bindGu() { const b = document.getElementById('guBtn'); if (b) b.onclick = openGuDone; }
function openGuDone() {
  const g = me.gu; if (!g) return;
  closeSheet();
  const ph = [], MAX = 5;
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  const grid = () => ph.map((p, k) => `<div class="ph ${p.loading ? 'loading' : ''}"><img src="${p.src}" alt=""><button class="x" data-gp="${k}">×</button></div>`).join('') +
    (ph.length < MAX ? `<label class="ph add" for="gpinput"><span><b>+</b>Фото</span></label>` : '');
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>🧹 Генуборка выполнена</h2>
    <p class="sub" style="margin-top:4px">Загрузи фото своей зоны (до ${MAX}) — их получат администраторы. Если уже выложил(а) фото в группу — просто нажми кнопку.</p>
    <div class="photos" id="gpgrid">${grid()}</div><input type="file" id="gpinput" accept="image/*" multiple style="display:none">
    <button class="btn" id="gpSend">✅ Выполнил</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('#gpSend');
  const sync = () => { const busy = ph.some(p => p.loading), n = ph.filter(p => p.id).length; btn.textContent = busy ? '⏳ Загружаю фото…' : n ? '✅ Выполнил · ' + n + ' фото' : '✅ Выполнил'; };
  const redraw = () => { wrap.querySelector('#gpgrid').innerHTML = grid(); wrap.querySelectorAll('[data-gp]').forEach(b => b.onclick = () => { ph.splice(+b.dataset.gp, 1); redraw(); }); sync(); };
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  wrap.querySelector('#gpinput').onchange = async e => {
    const files = [...e.target.files].slice(0, MAX - ph.length); e.target.value = '';
    for (const f of files) {
      let x; try { x = { src: await compress(f), loading: true }; } catch (er) { toast(er.message); continue; }
      ph.push(x); redraw();
      post('guPhoto', { data: x.src }).then(r => { x.id = r.id; x.loading = false; }).catch(() => { toast('Фото не загрузилось'); ph.splice(ph.indexOf(x), 1); }).finally(redraw);
    }
  };
  btn.onclick = async () => {
    if (ph.some(p => p.loading)) return toast('Подожди, фото загружаются…');
    const ids = ph.filter(p => p.id).map(p => p.id);
    if (!ids.length && !(await confirmBox('Фото уже выложил(а) в группу?'))) return;
    btn.disabled = true; btn.textContent = 'Отправляю…';
    try { const r = await call('guDone', { mon: g.mon, photos: ids, _back: ['me'] }); haptic('success'); toast('Спасибо! Генуборка отмечена ✅'); closeSheet(); me = r._me || await call('me'); render(); }
    catch (e) { toast(e.message); btn.disabled = false; sync(); }
  };
}

// Выполнить задачу: 2–5 фото результата (заказ посуды — без фото)
const TASK_PH_MIN = 2, TASK_PH_MAX = 5;
function openTaskDone(t, done) {
  closeSheet();
  const ph = [];
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  const grid = () => ph.map((p, k) => `<div class="ph ${p.loading ? 'loading' : ''}"><img src="${p.src}" alt=""><button class="x" data-tp="${k}">×</button></div>`).join('') +
    (ph.length < TASK_PH_MAX ? `<label class="ph add" for="tpinput"><span><b>+</b>Фото</span></label>` : '');
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>✅ Задача выполнена</h2>
    <p class="sub" style="margin-top:4px">${esc(t.text)}</p>
    <p class="sub">Приложи фото результата — <b>минимум ${TASK_PH_MIN}</b>, до ${TASK_PH_MAX}. ${esc(t.byName)} увидит их вместе с отметкой</p>
    <div class="photos" id="tpgrid">${grid()}</div><input type="file" id="tpinput" accept="image/*" multiple style="display:none">
    <button class="btn" id="tpSend">Отметить выполненной</button><button class="btn soft" id="closeSheet">Отмена</button></div>`;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('#tpSend');
  const sync = () => {
    const ok = ph.filter(p => p.id).length, busy = ph.some(p => p.loading);
    btn.classList.toggle('locked', ok < TASK_PH_MIN || busy);
    btn.textContent = busy ? '⏳ Загружаю фото…' : ok < TASK_PH_MIN ? '🔒 Добавь ещё ' + (TASK_PH_MIN - ok) + ' фото' : 'Отметить выполненной';
  };
  const redraw = () => { wrap.querySelector('#tpgrid').innerHTML = grid(); wrap.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { ph.splice(+b.dataset.tp, 1); redraw(); }); sync(); };
  wrap.querySelector('#closeSheet').onclick = closeSheet;
  wrap.onclick = e => { if (e.target === wrap) closeSheet(); };
  wrap.querySelector('#tpinput').onchange = async e => {
    const files = [...e.target.files].slice(0, TASK_PH_MAX - ph.length); e.target.value = '';
    for (const f of files) {
      let x; try { x = { src: await compress(f), loading: true }; } catch (er) { toast(er.message); continue; }
      ph.push(x); redraw();
      post('taskPhoto', { data: x.src }).then(r => { x.id = r.id; x.loading = false; }).catch(() => { toast('Фото не загрузилось'); ph.splice(ph.indexOf(x), 1); }).finally(redraw);
    }
  };
  btn.onclick = async () => {
    if (ph.some(p => p.loading)) return toast('Подожди, фото загружаются…');
    const ids = ph.filter(p => p.id).map(p => p.id);
    if (ids.length < TASK_PH_MIN) return toast('Приложи минимум ' + TASK_PH_MIN + ' фото');
    btn.disabled = true; btn.textContent = 'Отправляю…';
    try { await call('taskDone', { id: t.id, photos: ids }); haptic('success'); toast('Молодец! ✅'); closeSheet(); done && done(); }
    catch (e) { toast(e.message); btn.disabled = false; sync(); }
  };
  sync();
}
// Фото, которые приложили к выполненной задаче (видит тот, кто поставил, и админ)
function openTaskPhotos(t) {
  closeSheet();
  const wrap = document.createElement('div'); wrap.className = 'sheet-bg'; wrap.id = 'sheet';
  wrap.innerHTML = `<div class="sheet"><div class="grab"></div><h2>📷 Фото к задаче</h2><p class="sub" style="margin-top:4px">${esc(t.text)}</p>` +
    t.photos.map(g => `<h3>${esc(g.name)}</h3><div class="photos">${g.ids.map(id => `<div class="ph loading" data-pid="${esc(id)}"><img alt=""></div>`).join('')}</div>`).join('') +
    `<button class="btn soft" id="closeSheet">Закрыть</button></div>`;
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


Object.assign(views, {
  async tasks() {
    if (!taskData) taskData = await call('tasks');
    const d = taskData;
    const open = d.mine.filter(t => !t.doneMe), done = d.mine.filter(t => t.doneMe);
    const row = t => `<div class="task ${t.doneMe ? 'done' : ''}"><div class="box" ${t.doneMe ? '' : `data-tdone="${esc(t.id)}"`}>✓</div>
      <div class="pname"><b>${esc(t.text)}</b><span>от ${esc(t.byName)}${t.due ? ' · срок: ' + esc(t.due) : ''}</span></div></div>`;
    let out = card(`<h2>Мои задачи</h2><p class="sub">${open.length ? 'Сделал — нажми на квадрат и приложи 2–5 фото результата' : 'Все задачи выполнены 🎉'}</p>` +
      (open.length ? open.map(row).join('') : '') + (done.length ? `<h3>Выполнено</h3>` + done.slice(0, 10).map(row).join('') : ''));
    if (d.canCreate) {
      out += card(`<h2>Поставить задачу</h2><div class="form">
        <label>Что нужно сделать<textarea id="tText" rows="3" placeholder="Например: протереть полки за кофемашиной"></textarea></label>
        <label>Срок (необязательно)<input id="tDue" placeholder="до пятницы, до 18:00…"></label>
        <label>Кому</label>${audiencePicker(taskForm, d, 't')}
        <button class="btn" id="tAdd">Поставить задачу</button></div>`);
      if (d.created.length) out += card(`<h2>Поставленные</h2>` + d.created.map(t => `<div class="task"><div class="pname"><b>${esc(t.text)}</b>
        <span>${esc(t.to)} · готово ${t.doneCnt}/${t.total}${t.leftNames.length && t.leftNames.length <= 6 ? ' · ждём: ' + esc(t.leftNames.join(', ')) : ''}</span></div>${(t.photos || []).length ? `<button class="tkbtn" data-tph="${esc(t.id)}">📷 ${t.photos.reduce((a, g) => a + g.ids.length, 0)}</button>` : ''}
        <button class="x" data-tdel="${esc(t.id)}">×</button></div>`).join(''));
    }
    return out;
  },

});

Object.assign(binds, {
  tasks() {
    restoreForm('t');
    bindAudience(taskForm, 't');
    document.querySelectorAll('[data-tph]').forEach(b => b.onclick = () => { const t = taskData.created.find(x => x.id === b.dataset.tph); if (t) openTaskPhotos(t); });
    document.querySelectorAll('[data-tdone]').forEach(b => b.onclick = async () => {
      const t = taskData.mine.find(x => x.id === b.dataset.tdone);
      if (t && t.needPhoto) return openTaskDone(t, () => { taskData = null; me.openTasks = Math.max(0, (me.openTasks || 1) - 1); render(); });
      if (!(await confirmBox('Отметить задачу выполненной? Тот, кто поставил, получит уведомление.'))) return;
      try { await call('taskDone', { id: b.dataset.tdone }); haptic('success'); toast('Молодец! ✅'); taskData = null; me.openTasks = Math.max(0, (me.openTasks || 1) - 1); render(); } catch (e) { toast(e.message); }
    });
    document.querySelectorAll('[data-tdel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Удалить задачу?'))) return;
      try { await call('taskDel', { id: b.dataset.tdel }); taskData = null; render(); } catch (e) { toast(e.message); }
    });
    const add = document.getElementById('tAdd'); if (!add) return;
    add.onclick = async () => {
      const text = document.getElementById('tText').value.trim(), due = document.getElementById('tDue').value.trim();
      if (!text) return toast('Напиши, что нужно сделать');
      if (taskForm.mode === 'status' && !taskForm.statuses.length) return toast('Выбери статус');
      if (taskForm.mode === 'people' && !taskForm.ids.length) return toast('Выбери людей');
      add.disabled = true; add.textContent = 'Отправляю…';
      try { const r = await call('taskAdd', { text, due, to: taskForm, _back: ['me'] }); haptic('success'); toast('Задача отправлена ✅');
        Object.keys(formKeep).filter(k => k[0] === 't').forEach(k => delete formKeep[k]); taskData = null; me = r._me || await call('me'); render(); }
      catch (e) { toast(e.message); add.disabled = false; add.textContent = 'Поставить задачу'; }
    };
  },
});
