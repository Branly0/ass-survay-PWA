import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getOwner } from './db'
import { connectSocket } from './socket'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Builder from './pages/Builder'
import Filler from './pages/Filler'
import Results from './pages/Results'

function App() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null) // null = still checking

  useEffect(() => {
    async function checkAuth() {
      const owner = await getOwner()
      if (owner?.token) {
        connectSocket(owner.token)
        setIsAuth(true)
      } else {
        setIsAuth(false)
      }
    }
    checkAuth()
  }, [])

  // Still checking IndexedDB — render nothing to avoid flash
  if (isAuth === null) return null

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — respondents fill surveys, no login needed */}
        <Route path="/survey/:id" element={<Filler />} />

        {/* Auth routes */}
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