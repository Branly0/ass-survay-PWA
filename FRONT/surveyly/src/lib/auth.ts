import { getOwner, saveOwner, clearOwner } from '../db'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

export async function validateToken(): Promise<boolean> {
  const owner = await getOwner()
  if (!owner?.token) return false

  try {
    const res = await fetch(`${SERVER_URL}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${owner.token}` },
    })
    console.log('validateToken status:', res.status)
    return res.ok
  } catch (err) {
    console.error('validateToken error:', err)
    return false
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const owner = await getOwner()
  if (!owner?.refreshToken) return null

  try {
    const res = await fetch(
      `${SERVER_URL}/auth/refresh?refresh_token=${owner.refreshToken}`,
      { method: 'POST' }
    )
    console.log('refreshAccessToken status:', res.status)
    if (!res.ok) return null

    const data = await res.json()
    const newToken = data.access_token
    await saveOwner({ ...owner, token: newToken })
    return newToken
  } catch (err) {
    console.error('refreshAccessToken error:', err)
    return null
  }
}

export async function logout(): Promise<void> {
  const owner = await getOwner()

  if (owner?.refreshToken) {
    try {
      await fetch(
        `${SERVER_URL}/auth/logout?refresh_token=${owner.refreshToken}`,
        { method: 'POST' }
      )
    } catch {
      // Server unreachable — still clear locally
    }
  }

  await clearOwner()
}