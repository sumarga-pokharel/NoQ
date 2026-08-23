import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const UPDATE_INTERVAL_MS = 30_000

export function useTicketLocation(ticketId, ticketActive) {
  const watchId = useRef(null)
  const lastSentAt = useRef(0)
  const [sharing, setSharing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [coords, setCoords] = useState(null)

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
    }
    watchId.current = null
    setSharing(false)
    setCoords(null)
  }, [])

  const start = useCallback(() => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setLocationError('Location sharing requires a supported browser over a secure connection.')
      return
    }
    if (watchId.current !== null) return

    setLocationError('')
    setSharing(true)
    watchId.current = navigator.geolocation.watchPosition(
      async ({ coords: position }) => {
        // Reflected on the map on every reading; only throttled toward the
        // server below so the visitor's pin still tracks smoothly between
        // the periodic PATCH calls.
        setCoords({ lat: position.latitude, lng: position.longitude })
        const now = Date.now()
        if (now - lastSentAt.current < UPDATE_INTERVAL_MS) return
        lastSentAt.current = now
        try {
          await api(`/public/tickets/${ticketId}/location`, {
            method: 'PATCH',
            body: { lat: position.latitude, lng: position.longitude, accuracy: position.accuracy },
          })
          setLastUpdated(new Date())
          setLocationError('')
        } catch (error) {
          lastSentAt.current = 0
          setLocationError(error.message)
        }
      },
      (error) => {
        const messages = {
          1: 'Location permission was denied. Enable it in your browser settings to share your position.',
          2: 'Your location is currently unavailable.',
          3: 'Finding your location timed out. Please try again.',
        }
        setLocationError(messages[error.code] || 'Unable to access your location.')
        stop()
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 20_000 },
    )
  }, [stop, ticketId])

  useEffect(() => {
    if (!ticketActive && watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    return () => {
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [ticketActive])

  return { sharing, coords, lastUpdated, locationError, start, stop }
}
