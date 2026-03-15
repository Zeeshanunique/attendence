import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import Register from './pages/Register'
import Reports from './pages/Reports'
import './App.css'

function ProtectedLayout({ user }) {
  const isStudent = user?.role === 'student'

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route
            path="/dashboard"
            element={isStudent ? <Navigate to="/reports" replace /> : <Dashboard />}
          />
          <Route
            path="/capture"
            element={isStudent ? <Navigate to="/reports" replace /> : <Capture />}
          />
          <Route
            path="/register"
            element={isStudent ? <Navigate to="/reports" replace /> : <Register />}
          />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to={isStudent ? '/reports' : '/dashboard'} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'student' ? '/reports' : '/dashboard'} replace /> : <Login />}
      />
      <Route
        path="/*"
        element={user ? <ProtectedLayout user={user} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}
