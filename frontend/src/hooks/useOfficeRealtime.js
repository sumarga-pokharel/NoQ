import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_PATH, SOCKET_URL } from '../config/runtime'

export function useOfficeRealtime(officeId, onUpdate) {
  useEffect(() => {
    if (!officeId || !onUpdate) return undefined

    const socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
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
