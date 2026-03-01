import axios from 'axios'

const API_BASE = ''

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// Students
export const registerStudent = (formData) =>
  api.post('/api/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getStudents = () => api.get('/api/students')

export const deleteStudent = (id) => api.delete(`/api/students/${id}`)

// Attendance
export const markAttendance = (imageBlob, classId = 'default') => {
  const formData = new FormData()
  formData.append('image', imageBlob, 'capture.jpg')
  formData.append('class_id', classId)
  return api.post('/api/attendance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getAttendanceRecords = (params = {}) =>
  api.get('/api/attendance', { params })

export const getAttendanceStats = () => api.get('/api/attendance/stats')

export const exportAttendanceCSV = async (params = {}) => {
  const response = await api.get('/api/attendance/export', {
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
