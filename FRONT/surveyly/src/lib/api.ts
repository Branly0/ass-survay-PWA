import { getOwner } from '../db'
import { refreshAccessToken, logout } from './auth'
import { disconnectSocket, connectSocket } from '../socket'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const owner = await getOwner()

  const headers = {
    'Content-Type': 'application/json',
    ...(owner?.token ? { Authorization: `Bearer ${owner.token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers })

  // Token expired — try refresh
  if (res.status === 401) {
    const newToken = await refreshAccessToken()

    if (newToken) {
      // Reconnect socket with new token
      disconnectSocket()
      connectSocket(newToken)

      // Retry original request with new token
      const retryRes = await fetch(`${SERVER_URL}${path}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      })
      return retryRes
    } else {
      // Refresh failed — logout
      await logout()
      window.location.reload()
    }
  }

  return res
}