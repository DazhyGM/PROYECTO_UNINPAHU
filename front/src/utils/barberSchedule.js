const clock = (value) => String(value || '').slice(0, 5);

export const defaultSchedules = () => ([
  { day_of_week: 1, label: 'Lunes', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 2, label: 'Martes', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 3, label: 'Miércoles', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 4, label: 'Jueves', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 5, label: 'Viernes', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 6, label: 'Sábado', enabled: true, start_time: '08:00', end_time: '20:00', break_enabled: false, break_start: '13:00', break_end: '14:00' },
  { day_of_week: 0, label: 'Domingo', enabled: false, start_time: '08:00', end_time: '14:00', break_enabled: false, break_start: '12:00', break_end: '12:30' }
]);

export const applySchedules = (days, rows) => {
  const saved = new Map((rows || []).map((row) => [Number(row.day_of_week), row]));
  days.forEach((day) => {
    const row = saved.get(day.day_of_week);
    day.enabled = Boolean(row);
    if (!row) return;
    day.start_time = clock(row.start_time);
    day.end_time = clock(row.end_time);
    day.break_enabled = Boolean(row.break_start && row.break_end);
    if (day.break_enabled) {
      day.break_start = clock(row.break_start);
      day.break_end = clock(row.break_end);
    }
  });
};

export const schedulesPayload = (days) => days
  .filter((day) => day.enabled)
  .map((day) => ({
    day_of_week: day.day_of_week,
    start_time: day.start_time,
    end_time: day.end_time,
    break_start: day.break_enabled ? day.break_start : null,
    break_end: day.break_enabled ? day.break_end : null
  }));

export const validateSchedules = (days) => {
  const active = days.filter((day) => day.enabled);
  if (!active.length) return 'Asigna al menos un día de atención para el barbero.';

  for (const day of active) {
    if (!day.start_time || !day.end_time || day.start_time >= day.end_time) {
      return `Revisa el horario del ${day.label}: la hora de fin debe ser posterior a la de inicio.`;
    }
    if (!day.break_enabled) continue;
    if (!day.break_start || !day.break_end || day.break_start >= day.break_end) {
      return `Revisa el descanso del ${day.label}: la hora de fin debe ser posterior a la de inicio.`;
    }
    if (!(day.start_time < day.break_start && day.break_end < day.end_time)) {
      return `El descanso del ${day.label} debe quedar dentro de la jornada.`;
    }
  }

  return '';
};
