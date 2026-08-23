// Formats a 24h "HH:MM" (as stored on Provider) into a 12h display string.
export function formatHour(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatHoursRange(openTime, closeTime) {
  if (!openTime || !closeTime) return ''
  return `${formatHour(openTime)} – ${formatHour(closeTime)}`
}
