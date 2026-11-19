const ANCHOR_MINUTES = 30;
const STEP_MINUTES = 15;

const overlaps = (start, end, blocks) => blocks.some((block) => start < block.end && end > block.start);

const isEdgeFill = (start, duration, boundaries) => boundaries.some((boundary) => (
  start + duration <= boundary && start + STEP_MINUTES + duration > boundary
));

const buildAvailableSlots = ({
  scheduleStart,
  scheduleEnd,
  breakStart = null,
  breakEnd = null,
  duration,
  nowMinutes = null,
  isToday = false,
  blocks = []
}) => {
  const safeDuration = Math.max(1, Number(duration) || 0);
  const busy = blocks
    .filter((block) => Number.isFinite(block.start) && Number.isFinite(block.end) && block.end > block.start)
    .map((block) => ({ start: block.start, end: block.end }));

  if (Number.isFinite(breakStart) && Number.isFinite(breakEnd) && breakEnd > breakStart) {
    busy.push({ start: breakStart, end: breakEnd });
  }

  const boundaries = [scheduleEnd];
  if (Number.isFinite(breakStart)) boundaries.push(breakStart);

  const slots = [];
  for (let cursor = scheduleStart; cursor + safeDuration <= scheduleEnd; cursor += STEP_MINUTES) {
    if (isToday && nowMinutes != null && cursor <= nowMinutes) continue;

    const slotEnd = cursor + safeDuration;
    if (overlaps(cursor, slotEnd, busy)) continue;

    const anchor = (cursor - scheduleStart) % ANCHOR_MINUTES === 0;
    const recovery = busy.some((block) => block.end > cursor - STEP_MINUTES && block.end <= cursor);
    const edge = isEdgeFill(cursor, safeDuration, boundaries);
    if (!anchor && !recovery && !edge) continue;

    slots.push({ start: cursor, end: slotEnd });
  }

  return slots;
};

module.exports = {
  ANCHOR_MINUTES,
  STEP_MINUTES,
  buildAvailableSlots
};
