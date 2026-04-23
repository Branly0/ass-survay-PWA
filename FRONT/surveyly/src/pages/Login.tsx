import { useState } from 'react'
import { saveOwner } from '../db'
import { connectSocket } from '../socket'

interface Props {
  onLogin: () => void
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      // OAuth2 requires form-encoded data, not JSON
      const formData = new URLSearchParams()
      formData.append('username', email)  // OAuth2 uses 'username' not 'email'
      formData.append('password', password)
    
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
    
      console.log('status:', res.status)
      const data = await res.json()
      console.log('response data:', data)
    
      if (!res.ok) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }
    
      await saveOwner({ email, token: data.access_token, refreshToken: data.refresh_token })
      await new Promise(resolve => setTimeout(resolve, 100))
      connectSocket(data.access_token)
      onLogin()
    
    } catch (err) {
      console.error('fetch error:', err)
      setError('Could not reach the server. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8">

        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-xl font-medium text-gray-900">
            Survey<span className="text-gray-400 font-normal">ly</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="w-full py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

      </div>
    </div>
  )
}