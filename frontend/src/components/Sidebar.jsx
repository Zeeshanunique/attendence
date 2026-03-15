import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  ScanFace,
  UserPlus,
  FileBarChart,
  LogOut,
  Radio,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/capture', label: 'Attendance', icon: ScanFace },
  { path: '/register', label: 'Register', icon: UserPlus },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const visibleNavItems = user?.role === 'student'
    ? navItems.filter((item) => item.path === '/reports')
    : navItems

  return (
    <aside style={styles.sidebar}>
      {/* Glow effect at top */}
      <div style={styles.glowOrb} />

      {/* Brand */}
      <div style={styles.brand}>
        <div style={styles.logoMark}>
          <ScanFace size={22} strokeWidth={1.5} />
        </div>
        <div>
          <div style={styles.brandName}>FaceSync</div>
          <div style={styles.brandTag}>AI Attendance</div>
        </div>
      </div>

      {/* Live status */}
      <div style={styles.liveStatus}>
        <div className="live-dot" />
        <span style={styles.liveText}>System Online</span>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {visibleNavItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              style={{
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              }}
            >
              <div
                style={{
                  ...styles.navIcon,
                  ...(isActive ? styles.navIconActive : {}),
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span>{label}</span>
              {isActive && <div style={styles.activeIndicator} />}
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.username?.[0]?.toUpperCase() || 'F'}
          </div>
          <div>
            <div style={styles.userName}>{user?.username || 'Faculty'}</div>
            <div style={styles.userRole}>{user?.role || 'faculty'}</div>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn} title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 'var(--sidebar-width)',
    height: '100vh',
    background: 'var(--ink-light)',
    borderRight: '1px solid var(--ink-border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    top: -60,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 180,
    height: 120,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%)',
    pointerEvents: 'none',
    opacity: 0.6,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '24px 24px 0',
    position: 'relative',
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 0 20px var(--accent-glow)',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  brandTag: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  liveStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '20px 24px',
    padding: '8px 12px',
    background: 'var(--success-soft)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(34, 197, 94, 0.15)',
  },
  liveText: {
    fontSize: '0.75rem',
    color: 'var(--success)',
    fontWeight: 500,
  },
  nav: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: 450,
    transition: 'all 0.2s',
    textDecoration: 'none',
    position: 'relative',
  },
  navLinkActive: {
    color: 'var(--text-primary)',
    background: 'var(--accent-soft)',
  },
  navIcon: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  navIconActive: {
    color: 'var(--accent)',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    borderRadius: 3,
    background: 'var(--accent)',
  },
  userSection: {
    padding: '16px 20px',
    borderTop: '1px solid var(--ink-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 'var(--radius-sm)',
    background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  userName: {
    fontSize: '0.825rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  userRole: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--ink-border)',
    transition: 'all 0.2s',
  },
}
