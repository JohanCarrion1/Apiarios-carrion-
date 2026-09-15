export function formatHour(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? 'a.m.' : 'p.m.';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const mm = minutes.toString().padStart(2, '0');
  return `${hour12}:${mm} ${period}`;
}

export function formatHourFromTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date(0, 0, 1, h || 0, m || 0, 0, 0);
  return formatHour(date);
}