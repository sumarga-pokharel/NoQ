const CACHE_PREFIX = 'noq.ticket.'
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000

export function readTicketCache(ticketId) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${ticketId}`))
    if (!cached?.data || !cached.savedAt || Date.now() - cached.savedAt > MAX_CACHE_AGE) return null
    return cached
  } catch {
    return null
  }
}

export function writeTicketCache(ticketId, data) {
  const savedAt = Date.now()
  try {
    localStorage.setItem(`${CACHE_PREFIX}${ticketId}`, JSON.stringify({ data, savedAt }))
  } catch {
    // Storage can be unavailable in private browsing or when the quota is full.
  }
  return savedAt
}
