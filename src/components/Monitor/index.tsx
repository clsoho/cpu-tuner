import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import * as api from '../../types'

const HISTORY_LENGTH = 120

export default function MonitorPage() {
  const { cpuInfo, metrics, metricsHistory, startMonitoring, stopMonitoring } = useAppStore()
  const [running, setRunning] = useState(false)

  useEffect(() => {
    startMonitoring()
    setRunning(true)
    return () => stopMonitoring()
  }, [])

  const toggleRun = () => {
    if (running) {
      stopMonitoring()
      setRunning(false)
    } else {
      startMonitoring()
      setRunning(true)
    }
  }

  return (
    <div className="monitor-page">
      <div className="monitor-header">
        <h2>实时监控</h2>
        <div className="monitor-controls">
          <div className={`status-indicator ${running ? 'active' : ''}`}>
            <span className="status-dot" />
            <span>{running ? '监控中' : '已暂停'}</span>
          </div>
          <button className={`btn-run ${running ? 'btn-stop' : 'btn-start'}`} onClick={toggleRun}>
            {running ? '⏸ 暂停' : '▶ 开始'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {metrics && (
        <div className="monitor-summary">
          <SummaryCard
            label="CPU 总使用率"
            value={`${metrics.cpu_usage_total.toFixed(1)}%`}
            color={metrics.cpu_usage_total > 80 ? '#ef4444' : '#3b82f6'}
          />
          {metrics.cpu_temp_c != null && (
            <SummaryCard
              label="温度"
              value={`${metrics.cpu_temp_c.toFixed(1)}°C`}
              color={metrics.cpu_temp_c > 85 ? '#ef4444' : '#f59e0b'}
            />
          )}
          <SummaryCard
            label="当前频率"
            value={`${metrics.cpu_freq_current_mhz.toFixed(0)} MHz`}
            color="#22c55e"
          />
          <SummaryCard
            label="线程数"
            value={`${metrics.cpu_threads}`}
            color="#8b5cf6"
          />
        </div>
      )}

      {/* CPU Usage Chart */}
      {metrics && metrics.cores.length > 0 && (
        <div className="chart-section">
          <h3>线程使用率</h3>
          <CpuUsageChart history={metricsHistory} threadCount={metrics.cores.length} />
        </div>
      )}

      {/* Per-Thread Table */}
      {metrics && metrics.cores.length > 0 && (
        <div className="threads-table-container">
          <h3>线程详情</h3>
          <table className="threads-table">
            <thead>
              <tr>
                <th>线程</th>
                <th>使用率</th>
                <th>频率</th>
                {metrics.cores.some(c => c.temperature_c != null) && <th>温度</th>}
                <th>可视化</th>
              </tr>
            </thead>
            <tbody>
              {metrics.cores.map(core => (
                <tr key={core.thread_id}>
                  <td><span className="thread-id">T{core.thread_id}</span></td>
                  <td>{core.usage_percent.toFixed(1)}%</td>
                  <td>{core.frequency_mhz > 0 ? `${core.frequency_mhz.toFixed(0)} MHz` : '—'}</td>
                  {core.temperature_c != null && <td>{core.temperature_c.toFixed(1)}°C</td>}
                  <td>
                    <div className="mini-bar">
                      <div
                        className="mini-bar-fill"
                        style={{
                          width: `${Math.min(core.usage_percent, 100)}%`,
                          backgroundColor: core.usage_percent > 80 ? '#ef4444' : core.usage_percent > 50 ? '#f59e0b' : '#3b82f6',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="summary-card" style={{ borderColor: color }}>
      <div className="summary-label">{label}</div>
      <div className="summary-value" style={{ color }}>{value}</div>
    </div>
  )
}

function CpuUsageChart({ history, threadCount }: { history: api.CoreMetric[][]; threadCount: number }) {
  const width = 900
  const height = 300
  const padding = { top: 20, right: 10, bottom: 30, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxThreads = Math.max(threadCount, 1)
  const rows = 3 // Show first 8 threads in 3 rows
  const threadCount2 = threadCount
  const rowsNeeded = Math.min(threadCount2, 16)
  
  const colors = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
    '#84cc16', '#f43f5e', '#0ea5e9', '#d946ef', '#eab308',
    '#a855f7', '#10b981', '#f97316', '#6366f1', '#ec4899',
    '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  ]

  if (rowsNeeded === 0) return <p className="no-data">没有数据</p>
  
  const rowsPerDisplay = Math.min(Math.ceil(threadCount / 16), 1)
  
  return (
    <div className="chart-container">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${chartH * rowsNeeded + padding.top * 2 + 40 * (rowsNeeded - 1)}`}
        className="svg-chart"
      >
        {/* Grid */}
        {Array.from({ length: rowsNeeded }).map((_, r) => {
          const startY = padding.top + r * (chartH + 40)
          return (
            <g key={r}>
              {[0, 25, 50, 75, 100].map(v => (
                <line
                  key={v}
                  x1={padding.left}
                  y1={startY + chartH - (v / 100) * chartH}
                  x2={padding.left + chartW}
                  y2={startY + chartH - (v / 100) * chartH}
                  stroke="var(--border-primary)"
                  strokeWidth="0.5"
                />
              ))}
              {[0, 25, 50, 75, 100].map(v => (
                <text
                  key={v}
                  x={padding.left - 5}
                  y={startY + chartH - (v / 100) * chartH + 4}
                  fontSize="10"
                  fill="var(--text-tertiary)"
                  textAnchor="end"
                >
                  {v}
                </text>
              ))}
            </g>
          )
        })}

        {/* Lines per thread */}
        {Array.from({ length: threadCount }).map((_, threadIdx) => {
          const threadIdx2 = threadIdx
          const row = Math.floor(threadIdx2 / 16)
          if (row >= rowsNeeded) return null
          const col = threadIdx2 % 16
          const startY = padding.top + row * (chartH + 40)
          
          const points: [number, number][] = []
          for (let i = 0; i < HISTORY_LENGTH; i++) {
            const sample = history[i]
            const metric = sample?.[threadIdx2]
            if (metric != null && metric.usage_percent != null) {
              const x = padding.left + (i / (HISTORY_LENGTH - 1)) * chartW
              const y = startY + chartH - (Math.min(metric.usage_percent, 100) / 100) * chartH
              points.push([x, y])
            }
          }

          if (points.length < 2) return null
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

          return (
            <g key={threadIdx2}>
              <path
                d={d}
                fill="none"
                stroke={colors[threadIdx2 % colors.length]}
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Thread label */}
              <text
                x={padding.left}
                y={startY - 5}
                fontSize="10"
                fill={colors[threadIdx2 % colors.length]}
              >
                T{threadIdx2}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
