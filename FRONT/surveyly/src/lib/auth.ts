import { getOwner, saveOwner, clearOwner } from '../db'

const SERVER_URL = import.meta.env.VITE_SERVER_URL

// Check if the current JWT is still valid
export async function validateToken(): Promise<boolean> {
  const owner = await getOwner()
  if (!owner?.token) return false

  try {
    const res = await fetch(`${SERVER_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${owner.token}` },
    })
    return res.ok
  } catch {
    return false
  }
}

// Try to get a new JWT using the refresh token
export async function refreshAccessToken(): Promise<string | null> {
  const owner = await getOwner()
  if (!owner?.refreshToken) return null

  try {
    const res = await fetch(`${SERVER_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: owner.refreshToken }),
    })

    if (!res.ok) return null

    const { token } = await res.json()
    await saveOwner({ ...owner, token })
    return token
  } catch {
    return null
  }
}

// Logout — calls server then clears local data
export async function logout(): Promise<void> {
  const owner = await getOwner()

  if (owner?.token) {
    try {
      await fetch(`${SERVER_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({ refreshToken: owner.refreshToken }),
      })
    } catch {
      // Server unreachable — still clear locally
    }
  }

  await clearOwner()
}