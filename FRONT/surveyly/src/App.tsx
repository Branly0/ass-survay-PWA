import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getOwner } from './db'
import { connectSocket } from './socket'
import { validateToken, refreshAccessToken, logout } from './lib/auth'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Builder from './pages/Builder'
import Filler from './pages/Filler'
import Results from './pages/Results'

function App() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const owner = await getOwner()

      // No token at all — go to login
      if (!owner?.token) {
        setIsAuth(false)
        return
      }

      // Step 1: check if existing JWT is still valid
      const valid = await validateToken()
      if (valid) {
        connectSocket(owner.token)
        setIsAuth(true)
        return
      }

      // Step 2: JWT expired — try refresh
      const newToken = await refreshAccessToken()
      if (newToken) {
        connectSocket(newToken)
        setIsAuth(true)
        return
      }

      // Step 3: both failed — logout
      await logout()
      setIsAuth(false)
    }

    checkAuth()
  }, [])

  if (isAuth === null) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/survey/:id" element={<Filler />} />
        {isAuth ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/builder/:id" element={<Builder />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Login onLogin={() => setIsAuth(true)} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App