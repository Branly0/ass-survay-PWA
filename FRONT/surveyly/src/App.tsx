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
      console.log('owner in db:', owner)

      if (!owner?.token) {
        console.log('no token found')
        setIsAuth(false)
        return
      }

      const valid = await validateToken()
      console.log('token valid:', valid)

      if (valid) {
        connectSocket(owner.token)
        setIsAuth(true)
        return
      }

      const newToken = await refreshAccessToken()
      console.log('refresh result:', newToken)

      if (newToken) {
        connectSocket(newToken)
        setIsAuth(true)
        return
      }

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
            <Route
              path="/login"
              element={<Login onLogin={() => setIsAuth(true)} />}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App