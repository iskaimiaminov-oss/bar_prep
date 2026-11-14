// Файл «js/08_grafik.js»: вкладка «График» (автографик, пожелания выходных)
Object.assign(views, {
  async grafik() {
    grD = grD || await call('grafik');
    const d = grD, r = d.req;
    const dayS = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const dmS = s => s.slice(8, 10) + '.' + s.slice(5, 7);
    const range = (a, b) => { const out = []; for (let x = a; x <= b && out.length < 40; x = addD(x, 1)) out.push(x); return out; };
    let out = '';
    // сотрудник: отметить желаемые выходные
    const pv = d.isAdmin && grPrev;   // админ смотрит, как видят сотрудники
    if (pv || (r && r.open && (d.inList || !d.isAdmin))) {
      const rr = pv ? grPrev : r, mineD = pv ? null : d.mine, days = pv ? grPrev.days : d.days;
      if (!grSel) { grSel = new Set((mineD && mineD.d) || []); }
      // список дней: день недели и число, сколько ещё можно взять выходных, кнопка «Выходной»
      // 🌴 мой выходной · 🔒 мест нет (можно заявление) · ⏳ заявление ждёт · ✅ заявление одобрено
      const info = x => (days || []).find(y => y.date === x) || { free: true, left: null, z: '' };
      const wdL = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' });
      const dnL = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
      const places = n => n + ' ' + (n % 10 === 1 && n % 100 !== 11 ? 'место' : [2, 3, 4].indexOf(n % 10) >= 0 && (n % 100 < 12 || n % 100 > 14) ? 'места' : 'мест');
      const chips = range(rr.from, rr.to).filter(x => pv || !d.maxOff || d.maxOff >= 3 || (days || []).some(y => y.date === x)).map(x => {
        const i = info(x), mine = grSel.has(x), left = i.left == null ? null : Math.max(0, i.left - (mine ? 1 : 0));
        let btn;
        if (!mine && (i.z === 'ok' || i.z === 'wait')) btn = `<button class="grbtn ${i.z === 'ok' ? 'on' : 'busy'}" data-grz-st="${i.z}">${i.z === 'ok' ? '✅ Одобрено' : '⏳ Заявление'}</button>`;
        else if (!mine && !i.free) btn = `<button class="grbtn busy" data-grbusy="${x}">🔒 Занято</button>`;
        else btn = `<button class="grbtn ${mine ? 'on' : ''}" data-grday="${x}">${mine ? '🌴 Выходной' : 'Выходной'}</button>`;
        const sub = left == null ? '' : !mine && !i.free ? 'мест нет — можно заявление' : left ? 'ещё можно: ' + places(left) : 'мест больше нет';
        return `<div class="grrow${mine ? ' on' : ''}"><div class="grday"><b>${esc(wdL(x))}</b><span>${esc(dnL(x))}${sub ? ' · ' + sub : ''}</span></div>${btn}</div>`;
      }).join('');
      const zForm = grZ ? card(`<h2>📝 Заявление на выходной</h2><p class="sub">${esc(dayS(grZ))} уже занят — в один день могут отдыхать не все, иначе некому работать. Если очень нужно — напиши причину, админ решит и бот пришлёт ответ</p>
        <div class="form"><textarea id="grZr" rows="3" maxlength="300" placeholder="Например: запись к врачу, экзамен"></textarea></div>
        <div class="two"><button class="btn" id="grZSend">Отправить админу</button><button class="btn soft" id="grZNo">Отмена</button></div>`) : '';
      out += card(`${pv ? '<p class="sub" style="margin:0 0 8px;color:var(--warm)">👀 Предпросмотр — так увидят сотрудники. Нажимать можно, но ничего не сохранится</p>' : ''}<h2>🗓 Желаемые выходные</h2><p class="sub">График на ${dmS(rr.from)}–${dmS(rr.to)}. ${!pv && d.maxOff === 2 ? 'Обычно ты выходишь в субботу и воскресенье. Если нужен выходной — отметь один или оба дня' : 'Отметь дни, когда хочешь отдыхать'}, до <b>${esc(rr.dlText)}</b> — бот постарается учесть. В один день могут отдыхать не все: если мест нет (🔒), можно подать заявление</p>
        <div class="grlist2">${chips}</div>
        <div class="form"><label>Комментарий для админа (необязательно)<textarea id="grNote" rows="2" maxlength="300" placeholder="Например: в пятницу могу только с 16:00">${esc(grForm.note != null ? grForm.note : (mineD && mineD.note) || '')}</textarea></label></div>
        <button class="btn" id="${pv ? 'grPrevSave' : 'grSave'}">${mineD && mineD.done ? 'Сохранить изменения' : 'Сохранить'}</button>
        ${pv ? '<button class="btn soft" id="grPrevOff">Закрыть предпросмотр</button>' : ''}
        ${mineD && mineD.done ? `<p class="sub" style="margin-top:10px">✅ Записано: ${mineD.d.length ? mineD.d.map(dmS).join(', ') : 'без пожеланий'}</p>` : ''}`) + zForm +
        (pv ? '' : card(grVac ? `<h2>🤒 Отпуск / больничный</h2><p class="sub">Выбери, что и с какого по какое число. Админ подтвердит — бот впишет в график и не поставит тебя на смены</p>
          <div class="two"><button class="grbtn ${grVac.t === 'o' ? 'on' : ''}" data-grvt="o">🏖 Отпуск</button><button class="grbtn ${grVac.t === 'b' ? 'on' : ''}" data-grvt="b">🤒 Больничный</button></div>
          <div class="form two"><label>С<input type="date" id="grVFrom" value="${esc(grVac.from || '')}"></label><label>По<input type="date" id="grVTo" value="${esc(grVac.to || '')}"></label></div>
          <div class="two"><button class="btn" id="grVSend">Отправить админу</button><button class="btn soft" id="grVNo">Отмена</button></div>`
          : `<button class="btn soft" id="grVOpen">🤒 Я в отпуске / на больничном</button>`));
    } else if (r && !r.open && !d.isAdmin) out += empty('🗓', 'Сбор выходных закончен', `Пожелания на ${dmS(r.from)}–${dmS(r.to)} собраны — скоро будет график`);
    else if (!d.isAdmin) out += empty('🗓', 'Сейчас сбор выходных не идёт', 'Когда админ начнёт составлять график, бот пришлёт сообщение — отметишь дни здесь или кнопками в чате');
    if (!d.isAdmin) return out;
    if (!d.canEdit) out += `<p class="sub" style="margin:0 0 8px">👀 График — только просмотр: составляет и меняет админ</p>`;
    // админ: по дням — сколько выходных занято (из скольки можно) и кто взял
    if (r) {
      const wdL = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'long', timeZone: 'UTC' });
      const dnL = s => new Date(s + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
      const rows = (d.days || []).map(x => { const n = (x.names || []).length, full = x.cap != null && n >= x.cap;
        return `<div class="grrow"><div class="grday"><b>${esc(wdL(x.date))}</b><span>${esc(dnL(x.date))}${n ? ' · 🌴 ' + esc(x.names.join(', ')) : ''}</span></div><span class="grbtn ${full ? 'on' : ''}">${n}${x.cap != null ? ' из ' + x.cap : ''}</span></div>`; }).join('');
      const zl = (d.answers || []).flatMap(w => (w.z || []).map(z => `<br>📝 ${esc(w.name)}, ${dmS(z.date)}: ${z.st === 'ok' ? '✅ одобрено' : z.st === 'no' ? '❌ отказано' : '⏳ ждёт решения'} — «${esc(z.r)}»`)).join('');
      out += card(`<h2>🗓 Выходные ${dmS(r.from)}–${dmS(r.to)}</h2><p class="sub">${r.open ? 'Сбор идёт до ' + esc(r.dlText) + '. График бот составит, когда нажмёшь кнопку' : r.done ? 'Сбор закрыт' : 'Сбор закончен'}. Справа — сколько выходных взяли из скольки можно</p>
        <div class="grlist2">${rows}</div>
        ${(d.wait || []).length ? `<p class="sub" style="margin-top:10px">Ещё не ответили: ${esc(d.wait.join(', '))}</p>` : ''}${zl ? `<p class="sub" style="margin-top:6px">Заявления:${zl}</p>` : ''}
        ${r.open && !d.job && d.canEdit ? `<p class="sub" style="margin-top:10px">Не хочешь ждать — составь по тем выходным, что уже отметили. Сбор не закроется: кто не ответил — 5/2, отмечать можно до ${esc(r.dlText)}. Новые выходные бот учтёт, только если нажмёшь ещё раз</p>
          <button class="btn" id="grNowBtn">${d.draft && d.draft.from === r.from && d.draft.status === 'done' ? '🔄 Пересоставить с новыми выходными' : '🧩 Составить график сейчас'}</button>
          <p class="sub" style="margin-top:12px">График уже готов (ботом или руками в таблице)? Можно закрыть сбор раньше — отмечать выходные больше не смогут</p>
          <button class="btn soft" id="grDoneBtn">✅ График готов, закрыть сбор</button>` : ''}`);
    } else out += empty('🗓', 'Сбор выходных сейчас не идёт', 'Каждую пятницу в 12:00 бот сам открывает сбор на следующую неделю (до субботы 18:00). График составляет только по твоей кнопке');
    // админ: начать сбор на следующую неделю раньше пятницы
    const nx = d.next;
    if (nx && !nx.err && d.canEdit) out += card(`<h2>🚀 Сбор на ${dmS(nx.from)}–${dmS(nx.to)}</h2><p class="sub">${nx.ahead ? 'Заранее, на неделю вперёд' : 'Не ждать пятницы'}: бот сразу напишет команде, примет выходные до ${esc(nx.dlText)}, напомнит. График — по твоей кнопке. В пятницу второй сбор не откроется</p><button class="btn" id="grStartNext">🗓 Открыть сбор на ${dmS(nx.from)}–${dmS(nx.to)}</button>`);
    // админ: составленный график
    const dr = d.draft;
    if (d.job) out += card(`<h2>⏳ Составляю график…</h2><p class="sub">Это займёт пару минут — пришлю в бот</p><button class="btn soft" id="grReload">🔄 Обновить</button>`);
    else if (dr) {
      const st = { done: '✅ внесён в лист «' + dr.month + '»', new: 'ждёт решения', approved: '✅ утверждён — перенесён в лист «' + dr.month + '»', manual: '✍️ оставлен — правишь сам' }[dr.status] || dr.status;
      out += card(`<h2>🧩 График ${dmS(dr.from)}–${dmS(dr.to)}</h2><p class="sub">Лист «${esc(dr.sheet)}» · ${esc(st)}</p>
        ${dr.wishes ? `<p class="sub">🌴 Желаемые выходные: учтено ${dr.wishOk} из ${dr.wishes}</p>` : ''}
        ${dr.notes.length ? `<p class="sub">${dr.notes.map(x => '🕖 ' + esc(x)).join('<br>')}</p>` : ''}
        ${dr.issues.length ? `<h3>⚠️ Не сходится с правилами (${dr.issues.length})</h3><ul class="grlist">${dr.issues.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="sub">✅ Все правила соблюдены</p>'}
        ${(dr.urls || [{ sheet: dr.sheet, url: dr.url }]).map(u => `<button class="btn soft" data-grurl="${esc(u.url)}">📄 Открыть «${esc(u.sheet)}»</button>`).join('')}
        ${dr.status === 'new' && d.canEdit ? `<div class="two"><button class="btn" id="grApprove">✅ Утвердить</button><button class="btn soft" id="grManual">✍️ Поправлю сам</button></div>` : ''}
        ${dr.status === 'done' ? `<p class="sub" style="margin-top:10px">${dr.sent > 0 ? '📤 Команде разослан ' + esc(new Date(dr.sent).toLocaleString('ru-RU', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })) : '📤 ' + esc(dr.sendNote || '')}</p>
          ${d.canEdit ? `<div class="two"><button class="btn" id="grSend">📤 ${dr.sent > 0 ? 'Разослать ещё раз' : 'Разослать команде'}</button><button class="btn soft" id="grRegen">🔄 Пересоставить</button></div>` : ''}` : ''}
        ${d.snap && d.canEdit ? `<p class="sub" style="margin-top:10px">Не понравился новый вариант — можно вернуть график, составленный ${esc(new Date(d.snap.at).toLocaleString('ru-RU', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }))}</p><button class="btn soft" id="grRestore">↩️ Вернуть предыдущий график</button>` : ''}`);
    }
    return out;
  },
});

Object.assign(binds, {
  grafik() {
    const act = async (btn, action, payload, ok) => {
      if (btn) btn.disabled = true;
      try { const r = await call(action, payload); grD = r; grSel = null; if (r.msg) toast(r.msg); else if (ok) toast(ok); haptic('success'); render(); return r; }
      catch (e) { toast(e.message); if (btn) btn.disabled = false; }
    };
    const keepNote = () => { const n = document.getElementById('grNote'); if (n) grForm.note = n.value; };
    document.querySelectorAll('[data-grday]').forEach(b => b.onclick = () => {
      const x = b.dataset.grday;
      if (!grSel.has(x) && grSel.size + ((grD.days || []).filter(y => y.z === 'ok' || y.z === 'wait').length) >= (grD.maxOff || 3)) return toast(grD.maxOff === 2 ? 'Выходной можно взять только в сб или вс' : 'Можно не больше 3 выходных в неделю');
      if (grSel.has(x)) grSel.delete(x); else grSel.add(x);
      try { tg.HapticFeedback.selectionChanged(); } catch (e) {}
      keepNote(); render();
    });
    document.querySelectorAll('[data-grbusy]').forEach(b => b.onclick = () => { keepNote(); grZ = b.dataset.grbusy; render(); });
    document.querySelectorAll('[data-grz-st]').forEach(b => b.onclick = () => toast(b.dataset.grzSt === 'ok' ? 'Выходной по заявлению одобрен ✅' : 'Заявление ждёт решения админа ⏳'));
    const po = document.getElementById('grPrevOn');
    if (po) po.onclick = async () => {
      po.disabled = true; po.textContent = 'Считаю лимиты по таблице…';
      try { grPrev = await call('grPreview'); grSel = null; render.toTop = true; render(); window.scrollTo(0, 0); } catch (e) { toast(e.message); po.disabled = false; po.textContent = '👀 Как видят сотрудники'; }
    };
    const pf = document.getElementById('grPrevOff'); if (pf) pf.onclick = () => { grPrev = null; grSel = null; render(); };
    const ps = document.getElementById('grPrevSave'); if (ps) ps.onclick = () => toast('Это предпросмотр — у сотрудника тут сохранится 🌴');
    if (grPrev) document.querySelectorAll('[data-grbusy]').forEach(b => b.onclick = () => toast('У сотрудника тут откроется заявление с причиной'));
    const zs = document.getElementById('grZSend');
    if (zs) zs.onclick = async () => {
      const reason = document.getElementById('grZr').value.trim();
      if (!reason) return toast('Напиши причину');
      keepNote(); const date = grZ;
      const r = await act(zs, 'grZ', { date, reason });
      if (r) { grZ = null; render(); }
    };
    const zn = document.getElementById('grZNo'); if (zn) zn.onclick = () => { keepNote(); grZ = null; render(); };
    const sv = document.getElementById('grSave');
    if (sv) sv.onclick = () => { grForm.note = null; return act(sv, 'grWish',{ d: Array.from(grSel), note: document.getElementById('grNote').value.trim() }, 'Записал 🌴 Спасибо!'); };
    const keepVac = () => { if (!grVac) return; ['from', 'to'].forEach((k, i) => { const el = document.getElementById(i ? 'grVTo' : 'grVFrom'); if (el) grVac[k] = el.value; }); };
    const vo = document.getElementById('grVOpen'); if (vo) vo.onclick = () => { keepNote(); grVac = { t: '', from: '', to: '' }; render(); };
    document.querySelectorAll('[data-grvt]').forEach(b => b.onclick = () => { keepNote(); keepVac(); grVac.t = b.dataset.grvt; render(); });
    const vn = document.getElementById('grVNo'); if (vn) vn.onclick = () => { keepNote(); grVac = null; render(); };
    const vs = document.getElementById('grVSend');
    if (vs) vs.onclick = async () => {
      keepNote(); keepVac();
      if (!grVac.t) return toast('Выбери: отпуск или больничный');
      if (!grVac.from) return toast('Выбери, с какого числа');
      const r = await act(vs, 'grVac', { t: grVac.t, from: grVac.from, to: grVac.to || grVac.from });
      if (r) { grVac = null; render(); }
    };
    const gs = document.getElementById('grSend');
    if (gs) gs.onclick = async () => { if (await confirmBox('Разослать каждому его смены на эту неделю?')) act(gs, 'grSend', {}); };
    const gr = document.getElementById('grRegen');
    if (gr) gr.onclick = async () => { if (await confirmBox('Пересоставить график? Уберу то, что вписал бот, и составлю заново. Клетки, которые ты правил руками, останутся')) act(gr, 'grRegen', {}); };
    const gb = document.getElementById('grRestore');
    if (gb) gb.onclick = async () => { if (await confirmBox(grD && grD.snap ? grD.snap.ask : 'Вернуть предыдущий график?')) act(gb, 'grRestore', {}); };
    const rl = document.getElementById('grReload'); if (rl) rl.onclick = () => { grD = null; render(); };
    document.querySelectorAll('[data-grurl]').forEach(op => op.onclick = () => { try { tg.openLink(op.dataset.grurl); } catch (e) { window.open(op.dataset.grurl, '_blank'); } });
    const ap = document.getElementById('grApprove');
    if (ap) ap.onclick = async () => {
      if (!(await confirmBox('Перенести смены из черновика в лист месяца?'))) return;
      const r = await act(ap, 'grApprove', {});
      if (r && r.conflict && (await confirmBox('После черновика в листе месяца поменяли смены этого периода. Перенести черновик поверх? Ручные правки в этих днях пропадут'))) act(null, 'grApprove', { force: true });
    };
    const mn = document.getElementById('grManual'); if (mn) mn.onclick = () => act(mn, 'grManual', {});
    const stp = document.getElementById('grStop');
    if (stp) stp.onclick = async () => { if (await confirmBox('Закончить сбор? Бот пришлёт тебе итог')) act(stp, 'grStop', {}, 'Сбор закончен'); };
    const gen = document.getElementById('grGen'); if (gen) gen.onclick = () => act(gen, 'grGen', {}, 'Составляю — пришлю в бот через пару минут ⏳');
    const v = id => (document.getElementById(id) || {}).value || '';
    ['grFrom', 'grTo', 'grDl'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.onchange = () => { grForm[['from', 'to', 'deadline'][i]] = el.value; }; });
    const st = document.getElementById('grStart');
    if (st) st.onclick = async () => {
      if (!(await confirmBox('Разослать команде просьбу отметить желаемые выходные?'))) return;
      act(st, 'grStart', { from: v('grFrom'), to: v('grTo'), deadline: v('grDl') }, 'Разослал команде 📨');
    };
    const nb = document.getElementById('grNowBtn');
    if (nb) nb.onclick = async () => { if (await confirmBox('Составить график по уже отмеченным выходным? Сбор не закроется')) act(nb, 'grGenNow', {}); };
    const db = document.getElementById('grDoneBtn');
    if (db) db.onclick = async () => { if (await confirmBox('Закрыть сбор выходных? Отмечать больше нельзя')) act(db, 'grDone', {}); };
    const sn = document.getElementById('grStartNext');
    if (sn) sn.onclick = async () => {
      const nx = grD.next || {};
      if (!(await confirmBox(`Начать сбор выходных на ${nx.from ? nx.from.slice(8, 10) + '.' + nx.from.slice(5, 7) : ''}–${nx.to ? nx.to.slice(8, 10) + '.' + nx.to.slice(5, 7) : ''}? Бот сразу напишет всей команде`))) return;
      act(sn, 'grStartNext', {});
    };
    const gn = document.getElementById('grGenNow'); if (gn) gn.onclick = () => act(gn, 'grGen', { from: v('grFrom'), to: v('grTo') }, 'Составляю — пришлю в бот через пару минут ⏳');
  },
});
