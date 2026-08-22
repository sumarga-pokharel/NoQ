const notificationKey = (ticketId, event) => `noq.notification.${ticketId}.${event}`

export const browserNotificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext

export const getBrowserNotificationStatus = () =>
  browserNotificationsSupported() ? Notification.permission : 'unsupported'

export async function requestBrowserNotifications() {
  if (!browserNotificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'unsupported'
  }
}

function showOnce(ticketId, event, title, options) {
  const key = notificationKey(ticketId, event)
  if (localStorage.getItem(key) || getBrowserNotificationStatus() !== 'granted') return

  try {
    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `noq-${ticketId}-${event}`,
      renotify: true,
      ...options,
    })
    localStorage.setItem(key, new Date().toISOString())
    notification.onclick = () => {
      window.focus()
      window.location.assign(`/ticket/${ticketId}`)
      notification.close()
    }
  } catch {
    // Some browsers expose Notification but still reject construction.
  }
}

export function notifyForTicket({ ticket, office, position, estimate }) {
  if (!ticket?.notifyBrowser || !browserNotificationsSupported()) return

  if (['called', 'serving'].includes(ticket.status)) {
    showOnce(ticket._id, 'called', `${ticket.token}: it’s your turn`, {
      body: `${office.officeName}${ticket.counter?.name ? ` · ${ticket.counter.name}` : ''}. Please approach the counter.`,
      requireInteraction: true,
    })
    return
  }

  if (ticket.status === 'waiting' && position.ahead <= 3) {
    showOnce(ticket._id, 'near', `${ticket.token}: you’re almost up`, {
      body: `${position.ahead} ahead · estimated ${estimate.min}–${estimate.max} minutes at ${office.officeName}.`,
    })
  }
}
