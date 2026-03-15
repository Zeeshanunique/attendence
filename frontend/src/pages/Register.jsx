import { useState, useRef, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import {
  UserPlus,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Trash2,
  Image,
  ScanFace,
} from 'lucide-react'
import { registerStudent, getStudents, deleteStudent } from '../utils/api'

export default function Register() {
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)
  const [name, setName] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [photoMode, setPhotoMode] = useState('webcam') // 'webcam' | 'upload'
  const [capturedImage, setCapturedImage] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null) // {type, text}
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  const loadStudents = useCallback(async () => {
    try {
      const res = await getStudents()
      setStudents(res.data || [])
    } catch {
      // Backend may not be running
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
    }
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = () => setCapturedImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !rollNumber || !loginPassword) {
      setMessage({ type: 'danger', text: 'Please fill in all fields' })
      return
    }

    let photoBlob
    if (photoMode === 'webcam' && capturedImage) {
      const res = await fetch(capturedImage)
      photoBlob = await res.blob()
    } else if (photoMode === 'upload' && uploadedFile) {
      photoBlob = uploadedFile
    } else {
      setMessage({ type: 'danger', text: 'Please capture or upload a photo' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('roll_number', rollNumber)
      formData.append('login_password', loginPassword)
      formData.append('photo', photoBlob, 'student.jpg')

      await registerStudent(formData)
      setMessage({ type: 'success', text: `${name} registered successfully!` })
      setName('')
      setRollNumber('')
      setLoginPassword('')
      setCapturedImage(null)
      setUploadedFile(null)
      loadStudents()
    } catch (err) {
      setMessage({
        type: 'danger',
        text: err.response?.data?.detail || 'Registration failed — is the backend running?',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, studentName) => {
    try {
      await deleteStudent(id)
      setMessage({ type: 'success', text: `${studentName} removed` })
      loadStudents()
    } catch {
      setMessage({ type: 'danger', text: 'Delete failed' })
    }
  }

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1 className="page-title">Student Registration</h1>
        <p className="page-subtitle">
          Register students with their face data for automated attendance
        </p>
      </div>

      {message && (
        <div
          className={`alert alert-${message.type} animate-in`}
          style={{ marginBottom: 20 }}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <XCircle size={16} />
          )}
          {message.text}
        </div>
      )}

      <div style={styles.layout}>
        {/* Registration form */}
        <div className="card animate-in animate-in-delay-1" style={styles.formCard}>
          <div className="card-header">
            <span className="card-title">New Student</span>
            <span className="badge badge-accent">
              <UserPlus size={12} />
              Register
            </span>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Amit Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Roll Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., CS2021045"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Student Login Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Set a password for this student"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            {/* Photo mode toggle */}
            <div className="input-group">
              <label>Photo</label>
              <div style={styles.modeToggle}>
                <button
                  type="button"
                  onClick={() => { setPhotoMode('webcam'); setCapturedImage(null) }}
                  style={{
                    ...styles.modeBtn,
                    ...(photoMode === 'webcam' ? styles.modeBtnActive : {}),
                  }}
                >
                  <Camera size={14} />
                  Webcam
                </button>
                <button
                  type="button"
                  onClick={() => { setPhotoMode('upload'); setCapturedImage(null) }}
                  style={{
                    ...styles.modeBtn,
                    ...(photoMode === 'upload' ? styles.modeBtnActive : {}),
                  }}
                >
                  <Upload size={14} />
                  Upload
                </button>
              </div>
            </div>

            {/* Photo capture area */}
            <div style={styles.photoArea}>
              {capturedImage ? (
                <div style={styles.previewWrap}>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    style={styles.preview}
                  />
                  <button
                    type="button"
                    onClick={() => { setCapturedImage(null); setUploadedFile(null) }}
                    style={styles.retakeBtn}
                  >
                    <XCircle size={14} />
                    Retake
                  </button>
                </div>
              ) : photoMode === 'webcam' ? (
                <div style={styles.webcamArea}>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.8}
                    videoConstraints={{
                      width: 320,
                      height: 240,
                      facingMode: 'user',
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    style={styles.captureBtn}
                  >
                    <Camera size={16} />
                  </button>
                </div>
              ) : (
                <div
                  style={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image
                    size={32}
                    color="var(--text-muted)"
                    strokeWidth={1}
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Click to upload photo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-success"
              disabled={submitting || !capturedImage}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              {submitting ? (
                'Registering...'
              ) : (
                <>
                  <ScanFace size={18} />
                  Register Student
                </>
              )}
            </button>
          </form>
        </div>

        {/* Student list */}
        <div className="card animate-in animate-in-delay-2" style={{ flex: 1 }}>
          <div className="card-header">
            <span className="card-title">Registered Students</span>
            <span className="badge badge-accent">{students.length}</span>
          </div>

          {students.length === 0 ? (
            <div style={styles.emptyState}>
              <UserPlus
                size={40}
                color="var(--text-muted)"
                strokeWidth={1}
              />
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  marginTop: 12,
                }}
              >
                {loadingStudents
                  ? 'Loading students...'
                  : 'No students registered yet'}
              </p>
            </div>
          ) : (
            <div style={styles.studentList}>
              {students.map((s) => (
                <div key={s.id} style={styles.studentItem}>
                  <div style={styles.studentAvatar}>
                    {s.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.studentName}>{s.name}</div>
                    <div style={styles.studentRoll}>{s.roll_number}</div>
                  </div>
                  <span className="badge badge-success">Enrolled</span>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    style={styles.deleteBtn}
                    title="Remove student"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  formCard: {
    width: 400,
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  modeToggle: {
    display: 'flex',
    gap: 0,
    background: 'var(--ink)',
    borderRadius: 'var(--radius-sm)',
    padding: 3,
    border: '1px solid var(--ink-border)',
  },
  modeBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  modeBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  photoArea: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: 'var(--ink)',
    border: '1px solid var(--ink-border)',
    aspectRatio: '4/3',
    position: 'relative',
  },
  webcamArea: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  captureBtn: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px var(--accent-glow)',
    transition: 'transform 0.2s',
    border: '3px solid rgba(255,255,255,0.3)',
  },
  uploadArea: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    gap: 8,
  },
  previewWrap: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  retakeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(10,14,26,0.8)',
    color: '#fff',
    fontSize: '0.75rem',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  studentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    maxHeight: 500,
    overflowY: 'auto',
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.2s',
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  studentName: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  studentRoll: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
}
