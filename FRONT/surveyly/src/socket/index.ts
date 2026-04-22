import { saveResponse } from '../db'
import type { SurveyResponse } from '../types'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

let socket: WebSocket | null = null

export function connectSocket(_token: string) {
  if (socket?.readyState === WebSocket.OPEN) return

  // Convert http/https to ws/wss
  const wsUrl = SERVER_URL.replace(/^http/, 'ws') + '/filler/ws'

  socket = new WebSocket(wsUrl)

  socket.onopen = () => {
    console.log('[socket] connected')
  }

  socket.onmessage = async (event) => {
    try {
      const response: SurveyResponse = JSON.parse(event.data)
      console.log('[socket] new response received', response.id)
      await saveResponse({ ...response, synced: true })
    } catch {
      console.error('[socket] failed to parse message', event.data)
    }
  }

  socket.onclose = () => {
    console.log('[socket] disconnected')
    socket = null
  }

  socket.onerror = (err) => {
    console.error('[socket] error', err)
  }
}

export function disconnectSocket() {
  socket?.close()
  socket = null
}

export function getSocket() {
  return socket
}