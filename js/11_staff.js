// Файл «js/11_staff.js»: команда и профиль: статусы, аватарки, выбор адресатов
const ST_LIST = ['стажер', 'бариста', 'про бариста', 'старший бариста', 'управляющий', 'владелец'];
const ST_LABEL = { 'стажер': 'Стажёр', 'бариста': 'Бариста', 'про бариста': 'Про бариста', 'старший бариста': 'Старший бариста', 'управляющий': 'Управляющий', 'владелец': 'Владелец' };

function avaHtml(name, extraStyle) {   // фото сотрудника или кружок с буквой, если фото нет
  const src = AVATARS[name];
  const st = extraStyle || '';
  if (src) return `<img class="ava" src="${esc(src)}" style="object-fit:cover${st ? ';' + st : ''}">`;
  return `<div class="ava"${st ? ` style="${st}"` : ''}>${esc(String(name || '?')[0] || '?')}</div>`;
}
const stBadge = st => st ? `<span class="stb st${ST_LIST.indexOf(st)}">${ST_LABEL[st] || esc(st)}</span>` : '';
const statusOf = name => (me.statuses || {})[name] || '';
// Выбор адресатов: всем / по статусу / админам / выбрать людей
function audiencePicker(f, d, p, withAdmins) {
  const modes = [['all', 'Всем'], ['status', 'По статусу']].concat(withAdmins ? [['admins', 'Админам']] : []).concat([['people', 'Выбрать людей']]);
  let html = `<div class="seg">${modes.map(([m, l]) => `<button data-${p}mode="${m}" class="${f.mode === m ? 'on st3' : ''}">${l}</button>`).join('')}</div>`;
  if (f.mode === 'status') html += `<div class="seg" style="margin-top:10px">${(d.statuses || ST_LIST).map(st => `<button data-${p}st="${esc(st)}" class="${f.statuses.indexOf(st) >= 0 ? 'on st' + ST_LIST.indexOf(st) : ''}">${ST_LABEL[st]}</button>`).join('')}</div>`;
  if (f.mode === 'people') html += `<div class="chips" style="margin-top:10px">${(d.people || []).map(x => `<button class="chip ${f.ids.indexOf(x.id) >= 0 ? 'on' : ''}" data-${p}pid="${esc(x.id)}">${esc(x.name)}</button>`).join('') || '<p class="sub">Никто не подключён к боту</p>'}</div>`;
  return html;
}
function bindAudience(f, p) {
  document.querySelectorAll(`[data-${p}mode]`).forEach(b => b.onclick = () => { keepForm(p); f.mode = b.dataset[p + 'mode']; render(); });
  document.querySelectorAll(`[data-${p}st]`).forEach(b => b.onclick = () => { keepForm(p); const v = b.dataset[p + 'st'], i = f.statuses.indexOf(v); if (i >= 0) f.statuses.splice(i, 1); else f.statuses.push(v); render(); });
  document.querySelectorAll(`[data-${p}pid]`).forEach(b => b.onclick = () => { keepForm(p); const v = b.dataset[p + 'pid'], i = f.ids.indexOf(v); if (i >= 0) f.ids.splice(i, 1); else f.ids.push(v); render(); });
}
const formKeep = {};
function keepForm(p) { document.querySelectorAll(`[id^="${p}"]`).forEach(el => { if ('value' in el) formKeep[el.id] = el.value; }); }
function restoreForm(p) { Object.keys(formKeep).filter(k => k[0] === p).forEach(k => { const el = document.getElementById(k); if (el) el.value = formKeep[k]; }); }


Object.assign(views, {
  async profile() {
    const want = cardName || me.name;
    if (!cardData || cardData.name !== want) cardData = await call('card', cardName ? { name: cardName } : null);
    const c = cardData, s = c.stats, mo = c.month;
    const got = c.badges.filter(b => b.got).length;
    const who = c.people && c.people.length ? `<label class="sub" style="display:block;margin:0 0 10px">Чья карточка<select id="cardWho" style="margin-top:6px">${[me.name].concat(c.people.filter(n => n !== me.name)).map(n => `<option ${n === want ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : '';
    const tile = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const badges = c.badges.slice().sort((a, b) => b.got - a.got).map(b => `<div class="badge2 ${b.got ? '' : 'off'}"><div class="ic">${b.icon}</div><b>${esc(b.title)}</b><small>${esc(b.desc)}</small>
      ${b.got ? '' : `<div class="bar"><i style="width:${Math.round(b.have / b.goal * 100)}%"></i></div><small>${b.have} из ${b.goal}</small>`}</div>`).join('');
    return card(`${who}<div style="display:flex;align-items:center;gap:14px">${avaHtml(c.name, 'width:56px;height:56px;font-size:24px')}
        <div class="pname"><b style="font-size:20px">${esc(c.name)}</b>${stBadge(c.status).replace('margin-left:6px', '')}<span style="display:block;margin-top:4px">${c.rank ? '🏅 ' + c.rank.pos + '-е место по заготовкам за 2 недели (из ' + c.rank.of + ')' : 'Сваришь заготовку — попадёшь в рейтинг'}</span></div></div>
        <h3>За 30 дней</h3><div class="stats">${tile(mo.m, 'заготовок')}${tile(mo.c, 'закрытий')}${tile(mo.pf, 'идеальных')}</div>
        <h3>За всё время</h3><div class="stats">${tile(s.m, 'заготовок')}${tile(s.c, 'закрытий')}${tile(s.pf, 'идеальных')}${tile(s.t, 'задач')}${tile(s.sw, 'замен')}${tile(s.pr, 'проблем найдено')}</div>`) +
      card(`<h2>Достижения</h2><p class="sub">Открыто ${got} из ${c.badges.length}</p><div class="badges">${badges}</div>`);
  },

});

Object.assign(views, {
  async staff() {
    await getCfg();
    const off = cfg.off || [];
    const chips = (cfg.schedule || []).map(n => `<button class="chip ${off.indexOf(n) < 0 ? 'on' : ''}" data-name="${esc(n)}">${esc(n)}</button>`).join('') || '<p class="sub">В графике этого месяца никого не нашёл</p>';
    const extra = (cfg.extra || []).map((n, k) => `<div class="user">${avaHtml(n)}<div class="pname"><b>${esc(n)}</b><span>добавлен вручную</span></div><button class="x" data-xdel="${k}">×</button></div>`).join('');
    const users = cfg.users.length
      ? cfg.users.map(u => { const v = (cfg.viewers || []).indexOf(u.id) >= 0;
          return `<div class="user">${avaHtml(u.name)}<div class="pname"><b>${esc(u.name)}</b><span>${v ? '🛡 админ: отчёты, задачи, события' : 'сотрудник'}${(cfg.schedule || []).length && !(cfg.schedule || []).some(n => n.toLowerCase().trim() === String(u.name).toLowerCase().trim()) ? ' · ⚠️ имя не как в графике — бот не нашёл однозначную строку, поправь вручную' : ''}</span></div>
          <button class="tkbtn" data-view="${esc(u.id)}" data-on="${v ? 0 : 1}" style="${v ? 'background:var(--forest);color:var(--cream)' : ''}">🛡 Админ</button><button class="x" data-rm="${esc(u.id)}">×</button></div>`; }).join('')
      : '<p class="sub">Пока никто не зарегистрировался. Скинь команде ссылку на бота.</p>';
    const badges = list => list && list.length ? list.map(n => `<span class="badge">${esc(n)}</span>`).join('') : '<span class="sub">никого</span>';
    const whoHtml = who ? `<h3>Заготовки 14:00–15:30</h3>${badges(who.prep)}<h3>Подсчёт в ${esc(who.countAt)}</h3>${badges(who.count)}` : '';
    const sts = cfg.statuses || {};
    const stNames = (cfg.schedule || []).filter(n => (cfg.off || []).indexOf(n) < 0).concat(cfg.extra || []);
    const statusCard = card(`<h2>Статусы</h2><p class="sub">Нажми на статус — сохраняется сразу. Цвет видно на главном экране</p>` +
      stNames.map(n => `<div class="strow"><b>${esc(n)}</b> ${stBadge(sts[n])}<label style="float:right;font-size:13px;color:var(--muted)">🎂 <input class="bdin" data-bd="${esc(n)}" placeholder="дд.мм" inputmode="numeric" maxlength="5" value="${(cfg.bdays || {})[n] ? cfg.bdays[n].slice(3) + '.' + cfg.bdays[n].slice(0, 2) : ''}"></label><div class="seg">${ST_LIST.map((st, k) => `<button data-stname="${esc(n)}" data-st="${st}" class="${sts[n] === st ? 'on st' + k : ''}">${ST_LABEL[st]}</button>`).join('')}</div></div>`).join(''));
    const usersCard = card(`<h2>Подключены к боту</h2><p class="sub">«🛡 Админ» — работает как обычный сотрудник (отмечает заготовки, закрывает смену по графику, берёт замены), плюс видит историю закрытий и фото, ставит задачи и создаёт события. Список заготовок и команду менять не может</p>${users}`);
    return card(`<h2>Команда бара</h2><p class="sub">Все из графика этого месяца попадают сюда сами. Новый человек в графике — появится тут, убрали из графика — пропадёт. Нажми на имя, чтобы выключить того, кто не работает в баре.</p><div class="chips">${chips}</div>
        <h3>Добавить вручную</h3><p class="sub">Если человека нет в графике</p>${extra}
        <div class="cl-row" style="margin-top:8px"><input id="newName" placeholder="Имя" style="min-width:0;flex:1;border:1.5px solid transparent;background:var(--cream);border-radius:10px;padding:10px 12px;outline:none"><button class="tkbtn" id="addName" style="padding:10px 14px;flex:0 0 auto">Добавить</button></div>
        <h3>Статусы «не в баре»</h3><textarea id="exclude" rows="3">${esc(cfg.exclude.join(', '))}</textarea>
        <button class="btn" id="saveStaff">Сохранить</button>`) +
      statusCard + usersCard +
      card(`<h2>Проверка графика</h2><p class="sub">Кого бот отметит сегодня. Поменял график — нажми «Обновить график» на вкладке «Сегодня»</p>${whoHtml}<button class="btn soft" id="who">Проверить сегодня</button>`);
  },

});

Object.assign(binds, {
  profile() {
    const s = document.getElementById('cardWho');
    if (s) s.onchange = () => { cardName = s.value === me.name ? null : s.value; cardData = null; render(); };
  },
});

Object.assign(binds, {
  staff() {
    document.querySelectorAll('.chip').forEach(c => c.onclick = () => c.classList.toggle('on'));
    const readOff = () => { cfg.off = [...document.querySelectorAll('.chip:not(.on)')].map(c => c.dataset.name); };
    document.getElementById('addName').onclick = () => {
      const v = document.getElementById('newName').value.trim(); if (!v) return;
      readOff(); cfg.extra = (cfg.extra || []).concat([v]); render();
    };
    document.querySelectorAll('[data-xdel]').forEach(b => b.onclick = () => { readOff(); cfg.extra.splice(+b.dataset.xdel, 1); render(); });
    document.getElementById('saveStaff').onclick = async e => {
      readOff();
      const exclude = document.getElementById('exclude').value.split(',').map(s => s.trim()).filter(Boolean);
      e.target.disabled = true;
      try { const r = await call('saveStaff', { off: cfg.off, extra: cfg.extra || [], exclude }); cfg.exclude = exclude; if (r && r.schedule) { cfg.schedule = r.schedule; cfg.extra = r.extra || []; render(); } toast('Сохранено ✅'); haptic('success'); }
      catch (err) { toast(err.message); }
      e.target.disabled = false;
    };
    // дата ДР: можно набирать только цифры — точка ставится сама (2210 → 22.10)
    document.querySelectorAll('[data-bd]').forEach(inp => inp.oninput = () => {
      const dg = inp.value.replace(/\D/g, '').slice(0, 4);
      inp.value = dg.length > 2 ? dg.slice(0, 2) + '.' + dg.slice(2) : dg;
    });
    document.querySelectorAll('[data-bd]').forEach(inp => inp.onchange = async () => {
      const dg = inp.value.replace(/\D/g, '');
      let dd = 0, mm = 0;
      if (dg.length === 4) { dd = +dg.slice(0, 2); mm = +dg.slice(2); }
      else if (dg.length === 3) { dd = +dg.slice(0, 1); mm = +dg.slice(1); }
      if (dg && !(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12)) return toast('Введи день и месяц, например 2210 → 22.10');
      if (dg) inp.value = String(dd).padStart(2, '0') + '.' + String(mm).padStart(2, '0');
      const date = dg ? String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0') : '';
      try { const r = await call('setBirthday', { name: inp.dataset.bd, date }); cfg.bdays = r.bdays; if (homeData) homeData.bdays = r.bdays; toast(date ? 'День рождения сохранён 🎂' : 'Удалено'); } catch (e) { toast(e.message); }
    });
    document.querySelectorAll('[data-stname]').forEach(b => b.onclick = async () => {
      const name = b.dataset.stname, st = (cfg.statuses || {})[name] === b.dataset.st ? '' : b.dataset.st;
      try { const r = await call('setStatus', { name, status: st }); cfg.statuses = r.statuses; me.statuses = r.statuses; try { tg.HapticFeedback.selectionChanged(); } catch (e) {} render(); } catch (e) { toast(e.message); }
    });
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = async () => {
      const on = b.dataset.on === '1';
      if (on && !(await confirmBox('Сделать админом? Он увидит отчёты закрытий, сможет ставить задачи и создавать события. Менять заготовки и закрывать смену не сможет.'))) return;
      b.disabled = true;
      try { const r = await call('setViewer', { id: b.dataset.view, on }); cfg.viewers = r.viewers; haptic('success'); render(); } catch (e) { toast(e.message); b.disabled = false; }
    });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('Отключить сотрудника от бота?'))) return;
      try { await call('removeUser', { id: b.dataset.rm }); cfg = await call('config'); cfgP = null; render(); } catch (e) { toast(e.message); }
    });
    document.getElementById('who').onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Смотрю график…';
      try { who = await call('whoToday'); render(); } catch (err) { toast(err.message); e.target.disabled = false; }
    };
  },
});
