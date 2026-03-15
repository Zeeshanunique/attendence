import { createContext, useContext, useState } from 'react'
import { loginUser, getCurrentUser } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('facesync_user')
    const token = localStorage.getItem('facesync_token')
    if (!saved || !token) return null
    return JSON.parse(saved)
  })

  const login = async ({ username, password, role }) => {
    const response = await loginUser({ username, password, role })
    const token = response.data?.access_token
    const userData = response.data?.user
    if (!token || !userData) {
      throw new Error('Invalid login response')
    }

    localStorage.setItem('facesync_token', token)

    // Validate token and normalize user payload from backend.
    try {
      const me = await getCurrentUser()
      const normalizedUser = {
        username: me.data?.user?.username || userData.username,
        role: me.data?.user?.role || userData.role,
        name: me.data?.user?.name || userData.name,
        student_id: me.data?.user?.student_id || userData.student_id,
      }
      setUser(normalizedUser)
      localStorage.setItem('facesync_user', JSON.stringify(normalizedUser))
      return normalizedUser
    } catch {
      setUser(userData)
      localStorage.setItem('facesync_user', JSON.stringify(userData))
      return userData
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('facesync_user')
    localStorage.removeItem('facesync_token')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
