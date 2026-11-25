// Единый источник данных для схемы, списка и расчёта стоимости.
export const stations = Array.from({ length: 12 }, (_, i) => {
  const vip = i >= 8;
  const index = vip ? i - 8 : i;
  return {
    id: `${vip ? 'vip' : 'pc'}-${String(index + 1).padStart(2, '0')}`,
    name: `${vip ? 'VIP' : 'PC'}-${String(index + 1).padStart(2, '0')}`,
    type: vip ? 'vip' : 'standard',
    price: vip ? 250 : 150,
    description: vip ? 'RTX 4080 · 32 ГБ RAM · монитор 240 Гц · премиальная периферия' : 'RTX 4060 · 16 ГБ RAM · монитор 144 Гц · механическая клавиатура',
    position: { row: Math.floor(index / 4) + 1, column: index % 4 + 1 },
    occupied: i === 1 || i === 9
  };
});
export const MAX_HOURS = 12;
export const money = value => `${value.toLocaleString('ru-RU')} ₽`;
