import { useEffect } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

export function useOfficeRealtime(officeId, onUpdate) {
  useEffect(() => {
    if (!officeId || !onUpdate) return undefined

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    })

    const joinOffice = () => socket.emit('office:join', officeId)
    socket.on('connect', joinOffice)
    socket.on('queue:update', onUpdate)
    socket.on('ticket:update', onUpdate)

    return () => {
      socket.emit('office:leave', officeId)
      socket.off('connect', joinOffice)
      socket.off('queue:update', onUpdate)
      socket.off('ticket:update', onUpdate)
      socket.disconnect()
    }
  }, [officeId, onUpdate])
}
