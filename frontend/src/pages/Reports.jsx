import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { getAttendanceRecords, exportAttendanceCSV } from '../utils/api'

export default function Reports() {
  const [tab, setTab] = useState('records') // 'records' | 'students'
  const [records, setRecords] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getAttendanceRecords({
          date: dateFilter || undefined,
          class_id: classFilter || undefined,
        })
        setRecords(res.data || [])
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFilter, classFilter])

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      r.student_name?.toLowerCase().includes(q) ||
      r.roll_number?.toLowerCase().includes(q)
    )
  })

  const studentSummary = useMemo(() => {
    const byStudent = new Map()
    const classDates = new Set(records.map((r) => new Date(r.timestamp).toDateString()))
    const totalClasses = classDates.size

    records.forEach((r) => {
      const key = r.roll_number || r.student_id || r.student_name
      if (!key) return
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          name: r.student_name || 'Unknown',
          roll: r.roll_number || '-',
          presentDates: new Set(),
        })
      }
      byStudent.get(key).presentDates.add(new Date(r.timestamp).toDateString())
    })

    return Array.from(byStudent.values()).map((s) => {
      const present = s.presentDates.size
      const percentage = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0
      return { name: s.name, roll: s.roll, total: totalClasses, present, percentage }
    })
  }, [records])

  const filteredStudents = studentSummary.filter((s) => {
    const q = searchQuery.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
  })

  const handleExport = async () => {
    try {
      await exportAttendanceCSV({ date: dateFilter, class_id: classFilter })
    } catch {
      const csv = [
        'Name,Roll Number,Timestamp,Confidence,Class',
        ...filteredRecords.map(
          (r) =>
            `${r.student_name},${r.roll_number},${r.timestamp},${r.confidence},${r.class_id}`
        ),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const formatDate = (ts) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="page-container">
      <div
        className="page-header animate-in"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            View and export attendance records and student analytics
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Tab toggle */}
      <div style={styles.tabBar} className="animate-in animate-in-delay-1">
        <button
          onClick={() => setTab('records')}
          style={{
            ...styles.tab,
            ...(tab === 'records' ? styles.tabActive : {}),
          }}
        >
          <FileSpreadsheet size={15} />
          Attendance Records
        </button>
        <button
          onClick={() => setTab('students')}
          style={{
            ...styles.tab,
            ...(tab === 'students' ? styles.tabActive : {}),
          }}
        >
          <Users size={15} />
          Student Summary
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters} className="animate-in animate-in-delay-2">
        <div style={styles.searchWrap}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search by name or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        {tab === 'records' && (
          <>
            <input
              type="date"
              className="input-field"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ width: 170 }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Class ID"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              style={{ width: 130 }}
            />
          </>
        )}
      </div>

      {/* Table */}
      <div className="card animate-in animate-in-delay-3" style={{ padding: 0, overflow: 'hidden' }}>
        {tab === 'records' ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Confidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={styles.tableAvatar}>
                          {r.student_name?.[0]}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {r.student_name}
                        </span>
                      </div>
                    </td>
                    <td>{r.roll_number}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} />
                        {formatDate(r.timestamp)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} />
                        {formatTime(r.timestamp)}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-accent">{r.class_id}</span>
                    </td>
                    <td>
                      <div style={styles.confCell}>
                        <div style={styles.confBarBg}>
                          <div
                            style={{
                              ...styles.confBarFill,
                              width: `${r.confidence * 100}%`,
                              background:
                                r.confidence >= 0.9
                                  ? 'var(--success)'
                                  : r.confidence >= 0.8
                                    ? 'var(--warning)'
                                    : 'var(--danger)',
                            }}
                          />
                        </div>
                        <span>{(r.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        <CheckCircle2 size={10} />
                        Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && (
              <div style={styles.noResults}>
                <p style={{ color: 'var(--text-muted)' }}>
                  {loading ? 'Loading records...' : 'No records found'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No.</th>
                  <th>Total Classes</th>
                  <th>Present</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.roll}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={styles.tableAvatar}>
                          {s.name[0]}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td>{s.roll}</td>
                    <td>{s.total}</td>
                    <td>{s.present}</td>
                    <td>
                      <div style={styles.confCell}>
                        <div style={styles.confBarBg}>
                          <div
                            style={{
                              ...styles.confBarFill,
                              width: `${s.percentage}%`,
                              background:
                                s.percentage >= 75
                                  ? 'var(--success)'
                                  : s.percentage >= 60
                                    ? 'var(--warning)'
                                    : 'var(--danger)',
                            }}
                          />
                        </div>
                        <span>{s.percentage}%</span>
                      </div>
                    </td>
                    <td>
                      {s.percentage >= 75 ? (
                        <span className="badge badge-success">Safe</span>
                      ) : s.percentage >= 60 ? (
                        <span className="badge badge-warning">At Risk</span>
                      ) : (
                        <span className="badge badge-danger">Critical</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div style={styles.noResults}>
                <p style={{ color: 'var(--text-muted)' }}>
                  {loading ? 'Loading student summary...' : 'No student summary available'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  tabBar: {
    display: 'flex',
    gap: 4,
    background: 'var(--ink-light)',
    borderRadius: 'var(--radius-sm)',
    padding: 4,
    marginBottom: 20,
    width: 'fit-content',
    border: '1px solid var(--ink-border)',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 18px',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--accent)',
    color: '#fff',
    boxShadow: '0 0 12px var(--accent-glow)',
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
    maxWidth: 360,
  },
  tableAvatar: {
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  confCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 100,
  },
  confBarBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'var(--ink-border)',
    overflow: 'hidden',
  },
  confBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.4s ease',
  },
  noResults: {
    padding: '40px 20px',
    textAlign: 'center',
  },
}
