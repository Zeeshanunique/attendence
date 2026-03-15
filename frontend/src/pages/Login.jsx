import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScanFace, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('faculty')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username || !password) {
      setError('Please enter credentials')
      setLoading(false)
      return
    }

    try {
      await login({ username, password, role })
      navigate(role === 'student' ? '/reports' : '/dashboard')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      {/* Ambient glow */}
      <div style={styles.glowA} />
      <div style={styles.glowB} />

      {/* Grid pattern background */}
      <div style={styles.gridBg} />

      <div style={styles.loginCard} className="animate-in">
        {/* Logo */}
        <div style={styles.logoSection}>
          <div style={styles.logoMark}>
            <ScanFace size={28} strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>FaceSync</h1>
          <p style={styles.tagline}>AI-Powered Attendance System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              <Shield size={16} />
              {error}
            </div>
          )}

          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Role</label>
            <div style={styles.roleToggle}>
              {['student', 'faculty', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    ...styles.roleOption,
                    ...(role === r ? styles.roleActive : {}),
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? (
              <div style={styles.spinner} />
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p style={styles.hint}>
          Use your assigned username, password, and role to sign in
        </p>
      </div>

      {/* Decorative bottom line */}
      <div style={styles.bottomLine} />
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
  },
  glowA: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(79,110,247,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
    filter: 'blur(40px)',
  },
  glowB: {
    position: 'absolute',
    bottom: '5%',
    right: '15%',
    width: 350,
    height: 350,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
    filter: 'blur(40px)',
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(79,110,247,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(79,110,247,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--surface)',
    border: '1px solid var(--ink-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    position: 'relative',
    boxShadow: '0 12px 48px rgba(0,0,0,.4)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    marginBottom: 16,
    boxShadow: '0 0 30px var(--accent-glow)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 400,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  tagline: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: 4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    color: 'var(--text-muted)',
    padding: 4,
  },
  roleToggle: {
    display: 'flex',
    gap: 0,
    background: 'var(--ink)',
    borderRadius: 'var(--radius-sm)',
    padding: 3,
    border: '1px solid var(--ink-border)',
  },
  roleOption: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  roleActive: {
    background: 'var(--accent)',
    color: '#fff',
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px 24px',
    fontSize: '0.95rem',
    marginTop: 8,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: 20,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)',
  },
}
