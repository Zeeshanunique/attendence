import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('facesync_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const loginUser = (payload) => api.post('/auth/login', payload)
export const getCurrentUser = () => api.get('/auth/me')

// Students
export const registerStudent = (formData) =>
  api.post('/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getStudents = () => api.get('/students')

export const deleteStudent = (id) => api.delete(`/students/${id}`)

// Attendance
export const markAttendance = (imageBlob, classId = 'default') => {
  const formData = new FormData()
  formData.append('image', imageBlob, 'capture.jpg')
  formData.append('class_id', classId)
  return api.post('/attendance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getAttendanceRecords = (params = {}) =>
  api.get('/attendance', { params })

export const getAttendanceStats = () => api.get('/attendance/stats')

export const exportAttendanceCSV = async (params = {}) => {
  const response = await api.get('/attendance/export', {
    params,
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api
