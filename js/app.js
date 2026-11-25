import { stations, MAX_HOURS, money } from './data.js';
import { loadBookings, saveBookings, clearBookings, KEY } from './storage.js';
const $ = id => document.getElementById(id);
const initial = loadBookings();
let bookings = initial.bookings;
const selectedIds = new Set();
let category = 'all', maxPrice = 999, onlyFree = false;
const hours = $('hours');
$('storage-notice').textContent = initial.warning;
const busy = s => s.occupied || bookings.some(b => b.stationIds.includes(s.id));
const visible = s => (category === 'all' || s.type === category) && s.price <= maxPrice && (!onlyFree || !busy(s));
const selected = () => stations.filter(s => selectedIds.has(s.id));
const status = s => busy(s) ? '× Занято' : selectedIds.has(s.id) ? '✓ Выбрано' : '○ Свободно';
const stateClass = s => busy(s) ? 'busy' : selectedIds.has(s.id) ? 'selected' : 'free';
const announce = message => { $('notice').textContent = message; };
const error = message => { $('form-error').textContent = message; hours.setAttribute('aria-invalid', message && selectedIds.size ? 'true' : 'false'); };
const monitor = '<svg viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="2" width="22" height="11" rx="1"/><path d="M14 13v3M9 16h10"/><rect x="3" y="19" width="16" height="4" rx=".5"/><rect x="22" y="18" width="3" height="5" rx="1"/></svg>';
function stationButton(s, map) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `${map ? 'station' : 'station-row'} ${stateClass(s)}`;
  b.disabled = busy(s); b.dataset.station = s.id; b.dataset.view = map ? 'map' : 'list';
  b.setAttribute('aria-label', `${s.name}, ${s.type}, ${s.price} рублей в час, ${status(s)}`);
  b.setAttribute('aria-pressed', String(selectedIds.has(s.id)));
  if (map) {
    
    b.innerHTML = `${monitor}<span>${s.name}</span><span class="status">${status(s)}</span>`;
  } else {
    b.innerHTML = `<span><strong>${s.name}</strong><small>${s.type.toUpperCase()}</small></span><span class="row-right"><strong>${money(s.price)}/ч</strong><small>${status(s)}</small></span>`;
  }
  b.addEventListener('click', () => choose(s.id, b.dataset.view));
  return b;
}
function renderStations() {
  const filtered = stations.filter(visible);
  $('map').replaceChildren(); $('station-list').replaceChildren();
  // Сохраняем геометрию плана при фильтрации: скрытые станции не сдвигают стены.
  const plan = document.createElement('div'); plan.className = 'floor-plan';
  const make = (cls, html) => { const el = document.createElement('div'); el.className = cls; el.innerHTML = html; return el; };
  const standard = make('room room-standard', '<div class="room-label"><span>A / STANDARD</span><small>150 ₽/ч</small></div>');
  const vip = make('room room-vip', '<div class="room-label"><span>B / VIP</span><small>250 ₽/ч</small></div>');
  for (const [type, room] of [['standard', standard], ['vip', vip]]) {
    const grid = make('room-seats', '');
    stations.filter(s => s.type === type).forEach(s => {
      const slot = make('desk-slot', '');
      if (visible(s)) slot.append(stationButton(s, true));
      else { slot.classList.add('filtered-slot'); slot.setAttribute('aria-hidden','true'); }
      grid.append(slot);
    });
    room.append(grid);
  }
  const corridor = make('corridor', '<span>←</span><span>ПРОХОД / 01</span><span>→</span>');
  const lounge = make('room room-lounge', '<div class="room-label">C / LOUNGE</div><div class="sofa" aria-hidden="true"></div><div class="lounge-table" aria-hidden="true"></div><small>Зона отдыха</small>');
  const reception = make('room room-reception', '<div class="room-label">D / RECEPTION</div><div class="reception-desk" aria-hidden="true">DESK</div><small>Ресепшен</small>');
  const entry = make('entry', '<span>↑ ВХОД</span><span>01 / ACCESS</span>');
  plan.append(standard,vip,corridor,lounge,reception,entry); $('map').append(plan);
  if (!filtered.length) {
    for (const id of ['map', 'station-list']) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Нет станций по этим фильтрам. Измените цену или категорию.'; $(id).append(p); }
  } else filtered.forEach(s => $('station-list').append(stationButton(s, false)));
  $('stat-all').textContent = stations.length;
  $('stat-free').textContent = stations.filter(s=>!busy(s)).length;
  $('stat-busy').textContent = stations.filter(busy).length;
  $('stat-vip').textContent = stations.filter(s=>s.type==='vip'&&!busy(s)).length;
  $('availability').textContent = `${filtered.filter(s => !busy(s)).length} / ${filtered.length} СВОБОДНО`;
  $('result-count').textContent = `НАЙДЕНО: ${filtered.length}`;
}
function renderDetail() {
  const items = selected();
  $('detail-info').innerHTML = items.length ? `<div class="detail-info"><span class="tag">[ GROUP ACCESS / ${items.length} ]</span><h3>Выбрано: ${items.length}</h3><div class="selection-items">${items.map(s => `<div class="selection-item"><div><strong>${s.name} · ${money(s.price)}/ч</strong><p>${s.description}</p></div><button type="button" class="outline remove-item" data-remove="${s.id}" aria-label="Убрать ${s.name}">×</button></div>`).join('')}</div><p class="price">${money(items.reduce((sum,s)=>sum+s.price,0))} / час за все места</p></div>` : '<div class="empty-detail"><span class="eyebrow">[ WAITING FOR INPUT ]</span><strong>Собери свою команду</strong><p>Выбери одно или несколько свободных мест. Повторное нажатие снимает выбор.</p></div>';
  $('clear-selection').disabled = !items.length;
  $('detail-info').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.remove); ($('clear-selection').disabled ? $('hours') : $('clear-selection')).focus();}));
  updateTotal();
}
function validHours() { return hours.value !== '' && Number.isInteger(hours.valueAsNumber) && hours.valueAsNumber >= 1 && hours.valueAsNumber <= MAX_HOURS; }
function updateTotal() { document.querySelectorAll('[data-hours]').forEach(b=>b.setAttribute('aria-pressed',String(validHours() && Number(b.dataset.hours)===hours.valueAsNumber))); const items = selected(); $('total').textContent = items.length && validHours() ? money(items.reduce((sum,s)=>sum+s.price,0) * hours.valueAsNumber) : '—'; }
function choose(id, view) {
  const s = stations.find(s => s.id === id);
  if (!s || busy(s) || !visible(s)) return;
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  error(''); announce(`Выбрано станций: ${selectedIds.size}.`);
  renderStations(); renderDetail();
  if(view) document.querySelector(`[data-station="${id}"][data-view="${view}"]`)?.focus({preventScroll:true});
}
$('clear-selection').addEventListener('click',()=>{selectedIds.clear();error('');announce('Выбор очищен.');renderStations();renderDetail();});
function renderBookings() {
  const list = $('booking-list'); list.replaceChildren(); $('nav-count').textContent = bookings.length;
  if (!bookings.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'У тебя пока нет броней. Выбери свободную станцию, чтобы начать.'; list.append(p); return; }
  for (const b of bookings) {
    const items = stations.filter(s => b.stationIds.includes(s.id));
    const names = items.map(s=>s.name).join(', ');
    const article = document.createElement('article'); article.className = 'reservation';
    const info = document.createElement('div');
    const num = document.createElement('span'); num.className = 'mono'; num.textContent = b.number;
    const title = document.createElement('h3'); title.textContent = names;
    const meta = document.createElement('p'); meta.textContent = `${items.length} мест · ${b.hours} ч. · Подтверждено`;
    info.append(num,title,meta);
    const price = document.createElement('span'); price.className = 'reservation-price'; price.textContent = money(b.total);
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'outline'; cancel.textContent = 'Отменить бронь'; cancel.setAttribute('aria-label', `Отменить бронь ${names}`);
    cancel.addEventListener('click', () => { bookings = bookings.filter(x => x.number !== b.number); persist(); announce(`Бронь ${names} отменена. Станции снова свободны.`); renderAll(); $('reset-demo').focus(); });
    const ticket = document.createElement('div'); ticket.className = 'ticket-code'; ticket.setAttribute('aria-hidden','true'); ticket.innerHTML = '<span>ACCESS / GRANTED</span><i></i>'; article.append(info,price,ticket,cancel); list.append(article);
  }
}
function persist() { $('storage-notice').textContent = saveBookings(bookings); }
function renderAll() { renderStations(); renderDetail(); renderBookings(); }
function applyFilters() {
  category = $('category').value; maxPrice = Number($('max-price').value); onlyFree = $('only-free').value === 'free';
  const hidden = selected().filter(s=>!visible(s));
  if (hidden.length) { hidden.forEach(s=>selectedIds.delete(s.id)); error(''); announce('Скрытые фильтром станции удалены из выбора.'); }
  else announce('');
  renderStations(); renderDetail();
}
$('only-free').addEventListener('change', applyFilters); $('category').addEventListener('change', applyFilters); $('max-price').addEventListener('change', applyFilters);
$('reset-filters').addEventListener('click', () => { $('category').value = 'all'; $('max-price').value = '999'; $('only-free').value = 'all'; applyFilters(); });
document.querySelectorAll('[data-hours]').forEach(b=>b.addEventListener('click',()=>{hours.value=b.dataset.hours;error('');updateTotal();}));
document.querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>{$('category').value=b.dataset.zone;$('max-price').value='999';$('only-free').value='all';applyFilters();$('booking').scrollIntoView();$('category').focus({preventScroll:true});}));
hours.addEventListener('input', () => { error(validHours() ? '' : 'Введите целое число от 1 до 12.'); updateTotal(); });
for (const [id, step] of [['minus', -1], ['plus', 1]]) $(id).addEventListener('click', () => { hours.value = String(Math.min(MAX_HOURS, Math.max(1, (validHours() ? hours.valueAsNumber : 1) + step))); error(''); updateTotal(); });
$('booking-form').addEventListener('submit', event => {
  event.preventDefault();
  const items = selected();
  if (!items.length || items.some(s=>busy(s)||!visible(s))) { error('Сначала выбери свободную станцию.'); return; }
  if (!validHours()) { error('Введите целое число от 1 до 12.'); hours.focus(); return; }
  const number = `S1-${(globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`).toUpperCase()}`;
  bookings.push({ number, stationIds: items.map(s=>s.id), hours: hours.valueAsNumber, total: items.reduce((sum,s)=>sum+s.price,0) * hours.valueAsNumber });
  selectedIds.clear(); hours.value = '1'; error(''); persist(); announce(`Готово! ${items.map(s=>s.name).join(', ')} — забронировано. Запись добавлена в «Мои брони».`); renderAll();
});
$('reset-demo').addEventListener('click', () => {
  if (!window.confirm('Удалить все учебные брони SECTOR 1?')) return;
  bookings = []; selectedIds.clear(); hours.value = '1'; $('category').value = 'all'; $('max-price').value = '999'; category = 'all'; maxPrice = 999; onlyFree = false; $('only-free').value = 'all'; error(''); $('storage-notice').textContent = clearBookings(); announce('Демо сброшено.'); renderAll();
});
// Синхронизация при изменении данных в другой вкладке того же сайта.
window.addEventListener('storage', event => { if (event.key !== KEY && event.key !== null) return; const result = loadBookings(); bookings = result.bookings; $('storage-notice').textContent = result.warning; selected().filter(busy).forEach(s=>selectedIds.delete(s.id)); error(''); announce('Брони обновлены из другой вкладки.'); renderAll(); });
renderAll();

// Alternative views share the same filters, selection and reservations.
function setView(view) {
  $('map-view').hidden = view !== 'map';
  $('list-view').hidden = view !== 'list';
  $('show-map').setAttribute('aria-pressed', String(view === 'map'));
  $('show-list').setAttribute('aria-pressed', String(view === 'list'));
}
$('show-map').addEventListener('click', () => setView('map'));
$('show-list').addEventListener('click', () => setView('list'));
