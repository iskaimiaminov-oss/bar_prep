// Файл «js/07_fridge.js»: вкладка «Холодильник»
Object.assign(views, {
  async fridge() {
    if (!fridgeData) fridgeData = await call('fridge');
    const d = fridgeData, now = Date.now(), ed = d.canEdit;
    const pl = (n, a, b, c) => { const m = n % 10, h = n % 100; return h > 10 && h < 20 ? c : m === 1 ? a : m > 1 && m < 5 ? b : c; };
    const badge = x => {
      if (!x.exp) return '<span class="days">срок не указан</span>';
      const L = (x.exp - now) / 864e5;
      if (L < 0) return '<span class="days today">срок истёк</span>';
      const n = Math.ceil(L);
      if (x.state === 'f') return `<span class="days frz">❄️ ${n} ${pl(n, 'день', 'дня', 'дней')}</span>`;
      return `<span class="days ${n <= 1 ? 'today' : n <= 2 ? 'soon' : ''}">${n <= 1 ? 'последний день' : 'ещё ' + n + ' ' + pl(n, 'день', 'дня', 'дней')}</span>`;
    };
    const dd = ts => new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const row = x => `<div class="batch"><div class="pname"><b>${esc(x.name)}${x.state === 'f' ? ' · ' + fmt(x.q) + ' ' + esc(x.unit) : ''}</b><span>${esc(dd(x.made))} · ${x.state === 'f' ? 'заморозил(а)' : x.thaw ? 'разморозил(а)' : x.cnt ? 'завёл(а) на закрытии' : 'сварил(а)'} ${x.by ? esc(x.by) : '—'}${x.q0 && !(x.state === 'f' && Math.abs(x.q0 - x.q) < 0.001) ? ' · ' + (x.state === 'f' ? 'было ' : '') + fmt(x.q0) + ' ' + esc(x.unit) : ''}${x.state !== 'f' && (!x.q0 || Math.abs(x.q0 - x.q) > 0.001) ? ' · осталось ' + fmt(x.q) + ' ' + esc(x.unit) : ''}${x.ext ? ' · продлевали ' + x.ext + ' р.' : ''}</span>${x.mark ? `<span style="color:var(--danger)">🏷 Не промаркирована</span>` : ''}
        ${ed ? `<div class="acts" style="margin-top:8px">${x.state === 'f'
          ? `${x.mark ? `<button class="tkbtn" data-bmark="${esc(x.id)}">🏷 Промаркировал(а)</button>` : ''}<button class="tkbtn" data-bthaw="${esc(x.pid)}">❄️ Разморозить</button><button class="tkbtn" data-bused="${esc(x.id)}">Закончилась</button><button class="tkbtn" data-bwaste="${esc(x.id)}" style="background:var(--warm-soft);color:var(--danger)">🗑 Списать</button>`
          : `${x.mark ? `<button class="tkbtn" data-bmark="${esc(x.id)}">🏷 Промаркировал(а)</button>` : ''}${x.exp && x.exp < now ? (x.aliveBlock ? `<span class="sub" style="width:100%">${x.aliveBlock === 'limit' ? 'Продлили 7 раз: дальше решает управляющий' : 'Сегодня уже продлили, следующий раз завтра'}</span>` : `<button class="tkbtn" data-balive="${esc(x.id)}">👌 Ещё живая</button>`) : ''}<button class="tkbtn" data-bused="${esc(x.id)}">Закончилась</button><button class="tkbtn" data-bwaste="${esc(x.id)}" style="background:var(--warm-soft);color:var(--danger)">🗑 Списать</button>`}</div>` : ''}</div>${badge(x)}</div>`;
    const work = d.batches.filter(x => x.state === 'w'), frozen = d.batches.filter(x => x.state === 'f');
    let out = card(`<h2>🧊 В работе</h2><p class="sub">${work.length ? 'Сверху — то, что истекает раньше. Срок вышел, а заготовка ещё живая — жми «👌 Ещё живая», проверим завтра. Партии от этой даты нет — «Закончилась»' : 'Партии появятся, когда сотрудники отметят сваренные заготовки'}</p>${work.map(row).join('')}`);
    if (d.frz.length || frozen.length) {
      out += card(`<h2>❄️ В морозилке</h2><p class="sub">${frozen.length ? 'Срок хранения после разморозки считается с дня разморозки' : 'Пока пусто'}</p>${frozen.map(row).join('')}` +
        (ed ? d.frz.map(p => `<button class="btn soft" data-bfreeze="${esc(p.id)}" style="padding:11px">＋ Положить в морозилку: ${esc(p.name)}</button>`).join('') : ''));
    }
    const offs = d.autoOff || [];
    if (offs.length) {
      out += card(`<h2>🗑 Списано ботом</h2><p class="sub">Просрочку до 16:00 никто не проверил, и бот списал её сам. Заготовку не выбросили и она ещё живая — жми «↩️ Вернуть», партия вернётся и уйдёт из отчёта списаний</p>` +
        offs.map(x => `<div class="batch"><div class="pname"><b>${esc(x.name)} · ${fmt(x.q)} ${esc(x.unit)}</b><span>от ${esc(dd(x.made))} · вернуть можно до конца ${esc(dd(x.till))}</span>
          ${ed ? `<div class="acts" style="margin-top:8px"><button class="tkbtn" data-bret="${esc(x.id)}">↩️ Вернуть</button></div>` : ''}</div></div>`).join(''));
    }
    return out;
  },

});

Object.assign(binds, {
  fridge() {
    // apply — что поменять на экране сразу (списание, «Закончилась», маркировка); остальное ждёт ответ бота, но одним запросом
    const act = async (payload, okMsg, apply) => {
      if (apply) toast(okMsg); else toast('Сохраняю…');
      try { const r = await quick(payload.action, payload.data, ['fridge', 'me'], apply); haptic('success'); if (!apply) toast(okMsg); askLabel(r && r.label); }
      catch (e) {}
    };
    const drop = id => () => { fridgeData.batches = fridgeData.batches.filter(y => y.id !== id); };
    const find = id => fridgeData.batches.find(x => x.id === id);
    document.querySelectorAll('[data-bmark]').forEach(b => b.onclick = () => act({ action: 'batchMark', data: { ids: [b.dataset.bmark] } }, 'Промаркировано 🏷', () => { const x = find(b.dataset.bmark); if (x) x.mark = 0; }));
    document.querySelectorAll('[data-bret]').forEach(b => b.onclick = async () => {
      const x = (fridgeData.autoOff || []).find(y => y.id === b.dataset.bret); if (!x) return;
      if (!(await confirmBox(`Вернуть ${x.name} (${fmt(x.q)} ${x.unit})? Партия вернётся в холодильник и уйдёт из отчёта списаний. Потом отметь её: «Ещё живая» с датой с наклейки или «Закончилась».`))) return;
      act({ action: 'batchReturn', data: { id: x.id } }, 'Партия возвращена ↩️');
    });
    document.querySelectorAll('[data-bused]').forEach(b => b.onclick = async () => {
      const x = find(b.dataset.bused); if (!x || !(await confirmBox(`${x.name} закончилась? Партия уберётся из списка.`))) return;
      act({ action: 'batchDone', data: { id: x.id } }, 'Убрано ✅', drop(x.id));
    });
    document.querySelectorAll('[data-bwaste]').forEach(b => b.onclick = async () => {
      const x = find(b.dataset.bwaste); if (!x) return;
      const q = await askQty('🗑 Списать: ' + x.name, 'Сколько выкинули? Попадёт в отчёт о списаниях, партия уберётся из списка', '', x.unit, 'Списать');
      if (q != null) act({ action: 'batchDone', data: { id: x.id, waste: true, q } }, 'Списано 🗑', drop(x.id));
    });
    document.querySelectorAll('[data-balive]').forEach(b => b.onclick = async () => {
      const x = find(b.dataset.balive); if (!x) return;
      const tz = ts => new Date(ts + 5 * 36e5).toISOString().slice(0, 10), date = await askDate('👌 Ещё живая: ' + x.name, 'В боте партия от ' + esc(new Date(x.made).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })) + '. Посмотри на наклейку и выбери дату с неё. Для размороженной — дату разморозки', tz(Date.now()), 'Подтвердить');
      if (!date) return;
      toast('Сохраняю…');
      try {
        let r = await call('batchAlive', { id: x.id, date, _back: ['fridge', 'me'] });
        if (r && r.check) {
          const was = new Date(r.was).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), now2 = new Date(date + 'T12:00:00+05:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
          const sure = await confirmBox(`На наклейке ${now2}, а в боте эта партия от ${was} — она старше. Перепроверь холодильник: нет ли там ещё ${x.name} от ${was}? Нажми «ОК», если старой нет: бот поправит дату, а старую партию посчитает закончившейся.`);
          if (!sure) { toast('Тогда отметь старую партию: «Ещё живая» с её датой, «Закончилась» или «Списать»'); return; }
          r = await call('batchAlive', { id: x.id, date, sure: true, _back: ['fridge', 'me'] });
        }
        fridgeData = r._fridge || null; if (r._me) me = r._me; haptic('success'); toast(date === tz(x.made) ? 'Ок, проверим завтра 👌' : 'Дату исправили по наклейке ✅'); render();
      } catch (e) { toast(e.message); }
    });
    document.querySelectorAll('[data-bthaw]').forEach(b => b.onclick = async () => {
      const pid = b.dataset.bthaw, all = fridgeData.batches.filter(x => x.pid === pid && x.state === 'f'), tot = all.reduce((a, x) => a + x.q, 0);
      const q = await askQty('❄️ Разморозить: ' + all[0].name, 'В морозилке ' + fmt(tot) + ' ' + esc(all[0].unit) + '. Сначала берём самые старые партии', '', all[0].unit, 'Разморозить');
      if (q != null) act({ action: 'thaw', data: { pid, q } }, 'Разморожено ❄️');
    });
    document.querySelectorAll('[data-bfreeze]').forEach(b => b.onclick = async () => {
      const p = fridgeData.frz.find(x => x.id === b.dataset.bfreeze); if (!p) return;
      const q = await askQty('❄️ В морозилку: ' + p.name, 'Сколько положили в морозилку', '', p.unit, 'Положить');
      if (q != null) act({ action: 'freeze', data: { pid: p.id, q } }, 'Убрано в морозилку ❄️');
    });
  },
});
