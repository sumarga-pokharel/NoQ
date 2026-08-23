// Turns a "minutes from now" wait range (as returned by the estimate APIs)
// into an actual clock-time range, e.g. minMinutes=12, maxMinutes=27 at
// 12:00 -> "12:12 – 12:27 PM". Computed at render time from the current
// clock, not persisted — it's just a friendlier way to read the same
// duration estimate.
export function formatEstimateWindow(minMinutes, maxMinutes) {
  if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes)) return ''
  const now = Date.now()
  const start = new Date(now + minMinutes * 60_000)
  const end = new Date(now + maxMinutes * 60_000)
  const fmt = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}
