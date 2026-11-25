import { stations, MAX_HOURS } from './data.js';
export const KEY = 'sector1.reservations.v1';
const valid = entries => {
  if (!Array.isArray(entries)) return false;
  const ids = new Set(), numbers = new Set();
  return entries.every(b => {
    if (!b || typeof b !== 'object') return false;
    const group = b.stationIds;
    if (!Array.isArray(group) || !group.length || new Set(group).size !== group.length || typeof b.number !== 'string' || !/^S1-[A-Z0-9-]+$/.test(b.number) || numbers.has(b.number) || !Number.isInteger(b.hours) || b.hours < 1 || b.hours > MAX_HOURS) return false;
    const items = group.map(id=>stations.find(s=>s.id===id));
    if (items.some(s=>!s || s.occupied || ids.has(s.id)) || b.total !== items.reduce((sum,s)=>sum+s.price,0)*b.hours) return false;
    group.forEach(id=>ids.add(id)); numbers.add(b.number); return true;
  });
};
export function loadBookings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { bookings: [], warning: '' };
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed) ? parsed.map(b => b && !b.stationIds && b.stationId ? {...b, stationIds:[b.stationId]} : b) : parsed;
    if (!valid(data)) throw new Error('Invalid data');
    return { bookings: data, warning: '' };
  } catch {
    return { bookings: [], warning: 'Не удалось прочитать сохранённые брони. Демо открыто без них. Можно сбросить демо или создать новую бронь.' };
  }
}
export function saveBookings(bookings) {
  try { localStorage.setItem(KEY, JSON.stringify(bookings)); return ''; }
  catch { return 'Сохранение недоступно. Изменения работают до обновления страницы.'; }
}
export function clearBookings() {
  try { localStorage.removeItem(KEY); return ''; }
  catch { return 'Не удалось удалить сохранённые данные. Сброс действует до обновления страницы.'; }
}
