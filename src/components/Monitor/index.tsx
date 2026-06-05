import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import * as api from '../../types'

const HIST = 120

export default function MonitorPage() {
  const { metrics, metricsHistory, cpuInfo, startMonitoring, stopMonitoring } = useAppStore()
  const [live, setLive] = useState(false)

  useEffect(() => { startMonitoring(); setLive(true); return () => stopMonitoring() }, [])

  const toggle = () => { if (live) { stopMonitoring(); setLive(false) } else { startMonitoring(); setLive(true) } }

  if (!metrics) return <div className="app-loading"><div className="spinner"/><p>等待数据…</p></div>

  return (
    <div>
      <div className="monitor-header">
        <h2>实时监控</h2>
        <div className="monitor-status">
          <span style={{display:'flex', alignItems:'center', gap:5, fontSize:12}}>
            <span className={`status-dot ${live ? 'live' : ''}`} />
            {live ? '监控中' : '已暂停'}
          </span>
          <button className={`btn ${live ? 'btn-ghost' : 'btn-green'} btn-sm`} onClick={toggle}>{live ? '⏸ 暂停' : '▶ 开始'}</button>
        </div>
      </div>

      {/* Summary Pills */}
      <div className="summary-row">
        <Pill label="CPU%" value={`${metrics.cpu_usage_total.toFixed(1)}%`} color={gC(metrics.cpu_usage_total, 50, 80)} />
        <Pill label="温度" value={metrics.cpu_temp_c != null ? `${metrics.cpu_temp_c.toFixed(1)}°C` : '—'} color={metrics.cpu_temp_c != null ? gC(metrics.cpu_temp_c, 60, 85) : 'var(--text-muted)'} />
        <Pill label="频率" value={`${metrics.cpu_freq_current_mhz.toFixed(0)} MHz`} color="var(--cyan)" />
        <Pill label="内存" value={`${metrics.ram_usage_percent.toFixed(0)}%`} color={gC(metrics.ram_usage_percent, 60, 80)} />
        <Pill label="线程" value={`${metrics.cpu_threads}`} color="var(--purple)" />
        <Pill label="RAM" value={`${(metrics.ram_used_mb / 1024).toFixed(1)} / ${(metrics.ram_total_mb / 1024).toFixed(0)} GB`} color="var(--text-secondary)" />
      </div>

      {/* Chart */}
      {metricsHistory.length > 2 && (
        <div className="chart-wrap">
          <h3>线程使用率趋势 (最近 {HIST}s)</h3>
          <UsageChart history={metricsHistory} threads={metrics.cores.length} />
        </div>
      )}

      {/* Per-Thread Table */}
      {metrics.cores.length > 0 && (
        <div className="threads-wrap">
          <h3>线程详情 ({metrics.cores.length})</h3>
          <table className="tt">
            <thead><tr><th>ID</th><th>Usage</th><th>Freq</th>{metrics.cores.some(c => c.temperature_c != null) && <th>Temp</th>}<th></th></tr></thead>
            <tbody>
              {metrics.cores.map(c => (
                <tr key={c.thread_id}>
                  <td style={{color:'var(--accent)'}}>T{c.thread_id}</td>
                  <td style={{color: gC(c.c0_percent, 50, 80)}}>{c.c0_percent.toFixed(1)}%</td>
                  <td>{c.frequency_mhz > 0 ? `${(c.frequency_mhz / 1000).toFixed(2)} GHz` : '—'}</td>
                  {c.temperature_c != null && <td>{c.temperature_c.toFixed(1)}°C</td>}
                  <td><div className="mini-bar"><div className="mini-bar-fill" style={{width:`${Math.min(c.c0_percent,100)}%`, backgroundColor: gC(c.c0_percent, 50, 80)}}/></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Pill({label, value, color}: {label:string; value:string; color:string}) {
  return (
    <div className="summary-pill" style={{borderLeftColor: color}}>
      <div className="s-lbl">{label}</div>
      <div className="s-val" style={{color}}>{value}</div>
    </div>
  )
}

function gC(v: number, warn: number, hot: number) { return v > hot ? 'var(--red)' : v > warn ? 'var(--amber)' : 'var(--green)' }

function UsageChart({history, threads}: {history: api.CoreMetric[][]; threads: number}) {
  const w = 900, h = 200, pad = {l:36, r:8, t:8, b:22}
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b
  const maxShow = Math.min(threads, 16)
  const colors = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1','#84cc16','#f43f5e','#0ea5e9','#d946ef','#eab308','#a855f7']

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {/* Grid */}
      {[0,25,50,75,100].map(v => {
        const y = pad.t + ch - (v/100)*ch
        return <g key={v}><line x1={pad.l} y1={y} x2={pad.l+cw} y2={y} stroke="var(--border-subtle)" strokeWidth=".5"/><text x={pad.l-4} y={y+3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{v}</text></g>
      })}
      {/* Time labels */}
      {[0, 30, 60, 90, 120].map(t => {
        const x = pad.l + (t / HIST) * cw
        return <text key={t} x={x} y={h-4} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{t}s</text>
      })}
      {/* Lines */}
      {Array.from({length: maxShow}).map((_, i) => {
        const pts: [number, number][] = []
        for (let s = 0; s < history.length; s++) {
          const m = history[s]?.[i]
          if (m != null && m.c0_percent != null) pts.push([pad.l + (s / (HIST - 1)) * cw, pad.t + ch - (Math.min(m.c0_percent, 100) / 100) * ch])
        }
        if (pts.length < 2) return null
        const d = pts.map(([x,y], j) => `${j===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
        return <path key={i} d={d} fill="none" stroke={colors[i % colors.length]} strokeWidth=".9" opacity=".75"/>
      })}
      {/* Legend */}
      {Array.from({length: maxShow}).map((_, i) => (
        <text key={i} x={pad.l + 4} y={pad.t + 8 + i * 10} fill={colors[i % colors.length]} fontSize="8" opacity=".7">T{i}</text>
      ))}
    </svg>
  )
}
