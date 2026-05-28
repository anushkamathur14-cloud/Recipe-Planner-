export function getMonday(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatWeekKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseWeekParam(week?: string): Date {
  if (!week) return getMonday();
  const parsed = new Date(week + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return getMonday();
  return getMonday(parsed);
}

export function addWeeks(monday: Date, weeks: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
