import { useState, useEffect } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts'
import { getAttendanceStats, getStudents, getAttendanceRecords } from '../utils/api'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    atRisk: 0,
    avgAttendance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [weeklyData, setWeeklyData] = useState([])
  const [trendData, setTrendData] = useState([])
  const [riskData, setRiskData] = useState([])
  const [recentCaptures, setRecentCaptures] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, studentsRes, recordsRes] = await Promise.allSettled([
          getAttendanceStats(),
          getStudents(),
          getAttendanceRecords({ limit: 500 }),
        ])

        const statsData = statsRes.status === 'fulfilled' ? (statsRes.value.data || {}) : {}
        if (Object.keys(statsData).length > 0) {
          setStats(statsData)
        }

        const students =
          studentsRes.status === 'fulfilled' ? (studentsRes.value.data || []) : []
        const records =
          recordsRes.status === 'fulfilled' ? (recordsRes.value.data || []) : []

        const totalStudents = Number(statsData.totalStudents || students.length || 0)
        const recordsByDate = {}
        records.forEach((r) => {
          if (!r?.timestamp) return
          const dayKey = new Date(r.timestamp).toISOString().slice(0, 10)
          if (!recordsByDate[dayKey]) recordsByDate[dayKey] = new Set()
          recordsByDate[dayKey].add(r.student_id || r.roll_number || r.student_name)
        })

        const last7Days = [...Array(7)].map((_, idx) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - idx))
          const dayKey = d.toISOString().slice(0, 10)
          const present = recordsByDate[dayKey]?.size || 0
          return {
            key: dayKey,
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            present,
            absent: Math.max(totalStudents - present, 0),
          }
        })

        setWeeklyData(last7Days)
        setTrendData(
          last7Days.map((d, i) => ({
            week: `D${i + 1}`,
            rate:
              totalStudents > 0
                ? Number(((d.present / totalStudents) * 100).toFixed(1))
                : 0,
          }))
        )

        const recent = [...records]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5)
          .map((r) => ({
            name: r.student_name || 'Unknown',
            time: r.timestamp
              ? new Date(r.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '--:--',
            confidence: Number(r.confidence || 0),
          }))
        setRecentCaptures(recent)

        const totalClassDays = Object.keys(recordsByDate).length
        const presentByStudent = {}
        records.forEach((r) => {
          const studentKey = r.student_id || r.roll_number || r.student_name
          if (!studentKey || !r.timestamp) return
          if (!presentByStudent[studentKey]) presentByStudent[studentKey] = new Set()
          presentByStudent[studentKey].add(new Date(r.timestamp).toISOString().slice(0, 10))
        })

        const risk = students
          .map((s) => {
            const key = s.id || s.roll_number || s.name
            const attended = presentByStudent[key]?.size || 0
            const attendance =
              totalClassDays > 0
                ? Number(((attended / totalClassDays) * 100).toFixed(0))
                : 0
            return {
              name: s.name,
              roll: s.roll_number,
              attendance,
              trend: attendance < 75 ? 'down' : 'up',
            }
          })
          .filter((s) => s.attendance < 75)
          .sort((a, b) => a.attendance - b.attendance)
          .slice(0, 4)

        setRiskData(risk)
      } catch {
        setWeeklyData([])
        setTrendData([])
        setRiskData([])
        setRecentCaptures([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pieData = [
    { name: 'Present', value: stats.presentToday },
    { name: 'Absent', value: stats.absentToday },
  ]
  const trendDelta =
    trendData.length >= 2
      ? Number((trendData[trendData.length - 1].rate - trendData[trendData.length - 2].rate).toFixed(1))
      : 0

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Real-time attendance overview and analytics</p>
      </div>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        {[
          {
            label: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            color: 'var(--accent)',
            bg: 'var(--accent-soft)',
          },
          {
            label: 'Present Today',
            value: stats.presentToday,
            icon: UserCheck,
            color: 'var(--success)',
            bg: 'var(--success-soft)',
            change: '+3',
            up: true,
          },
          {
            label: 'Absent Today',
            value: stats.absentToday,
            icon: UserX,
            color: 'var(--danger)',
            bg: 'var(--danger-soft)',
            change: '-2',
            up: false,
          },
          {
            label: 'At Risk (<75%)',
            value: stats.atRisk,
            icon: AlertTriangle,
            color: 'var(--warning)',
            bg: 'var(--warning-soft)',
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`card animate-in animate-in-delay-${i + 1}`}
            style={styles.statCard}
          >
            <div style={styles.statTop}>
              <div
                style={{
                  ...styles.statIcon,
                  background: stat.bg,
                  color: stat.color,
                }}
              >
                <stat.icon size={18} />
              </div>
              {stat.change && (
                <div
                  style={{
                    ...styles.changeBadge,
                    color: stat.up ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {stat.up ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  {stat.change}
                </div>
              )}
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={styles.chartsRow}>
        {/* Weekly attendance bar chart */}
        <div
          className="card animate-in animate-in-delay-3"
          style={{ flex: 2 }}
        >
          <div className="card-header">
            <span className="card-title">Weekly Attendance</span>
            <span className="badge badge-accent">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--ink-border)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="present"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
                name="Present"
              />
              <Bar
                dataKey="absent"
                fill="var(--danger)"
                radius={[4, 4, 0, 0]}
                name="Absent"
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
          {weeklyData.length === 0 && !loading && (
            <p style={styles.emptyText}>No attendance trend data yet.</p>
          )}
        </div>

        {/* Attendance pie */}
        <div
          className="card animate-in animate-in-delay-4"
          style={{ flex: 1 }}
        >
          <div className="card-header">
            <span className="card-title">Today's Split</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={idx === 0 ? 'var(--accent)' : 'var(--danger)'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--ink-border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              <div style={styles.legend}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: 'var(--accent)',
                  }}
                />
                <span>Present ({stats.presentToday})</span>
              </div>
              <div style={styles.legend}>
                <div
                  style={{
                    ...styles.legendDot,
                    background: 'var(--danger)',
                  }}
                />
                <span>Absent ({stats.absentToday})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={styles.bottomRow}>
        {/* Trend */}
        <div
          className="card animate-in animate-in-delay-4"
          style={{ flex: 1 }}
        >
          <div className="card-header">
            <span className="card-title">Attendance Trend</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--success)',
                fontSize: '0.8rem',
              }}
            >
              <TrendingUp size={14} />
              <span>{trendDelta >= 0 ? `+${trendDelta}%` : `${trendDelta}%`}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--accent)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--ink-border)"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                domain={[75, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--ink-border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#trendGrad)"
                name="Rate %"
              />
            </AreaChart>
          </ResponsiveContainer>
          {trendData.length === 0 && !loading && (
            <p style={styles.emptyText}>No trend data yet.</p>
          )}
        </div>

        {/* Risk list */}
        <div
          className="card animate-in animate-in-delay-5"
          style={{ flex: 1 }}
        >
          <div className="card-header">
            <span className="card-title">At-Risk Students</span>
            <span className="badge badge-warning">Below 75%</span>
          </div>
          <div style={styles.riskList}>
            {riskData.length === 0 && !loading && (
              <p style={styles.emptyText}>No at-risk students yet.</p>
            )}
            {riskData.map((student) => (
              <div key={student.roll} style={styles.riskItem}>
                <div>
                  <div style={styles.riskName}>{student.name}</div>
                  <div style={styles.riskRoll}>{student.roll}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className={`badge ${student.attendance < 70 ? 'badge-danger' : 'badge-warning'}`}
                  >
                    {student.attendance}%
                  </span>
                  {student.trend === 'down' ? (
                    <ArrowDownRight size={14} color="var(--danger)" />
                  ) : (
                    <ArrowUpRight size={14} color="var(--success)" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent captures */}
        <div
          className="card animate-in animate-in-delay-5"
          style={{ flex: 1 }}
        >
          <div className="card-header">
            <span className="card-title">Recent Captures</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div className="live-dot" />
              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                Live
              </span>
            </div>
          </div>
          <div style={styles.captureList}>
            {recentCaptures.length === 0 && !loading && (
              <p style={styles.emptyText}>No recent captures yet.</p>
            )}
            {recentCaptures.map((cap, i) => (
              <div key={i} style={styles.captureItem}>
                <div style={styles.captureAvatar}>
                  {cap.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.captureName}>{cap.name}</div>
                  <div style={styles.captureTime}>
                    <Clock size={10} />
                    {cap.time}
                  </div>
                </div>
                <span
                  className={`badge ${cap.confidence >= 0.9 ? 'badge-success' : cap.confidence >= 0.8 ? 'badge-warning' : 'badge-danger'}`}
                >
                  {(cap.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    padding: 20,
  },
  statTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  chartsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  bottomRow: {
    display: 'flex',
    gap: 16,
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  riskItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    transition: 'background 0.2s',
  },
  riskName: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  riskRoll: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
  },
  captureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  captureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
  },
  captureAvatar: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  captureName: {
    fontSize: '0.825rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  captureTime: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  emptyText: {
    marginTop: 12,
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
}
