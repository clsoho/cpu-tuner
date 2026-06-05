import { useAppStore } from '../../stores/appStore'

export default function Dashboard() {
  const { cpuInfo, metrics, profileConfig, applyProfile, toast, error } = useAppStore()

  if (!cpuInfo) return <div className="app-loading"><div className="spinner"/><p>检测 CPU…</p></div>

  const activeId = profileConfig?.active_profile_id ?? 2
  const activeProfile = profileConfig?.profiles[activeId]
  const presets = Object.values(profileConfig?.profiles ?? {}).sort((a, b) => a.id - b.id)

  return (
    <div className="dash">
      {/* ── Row 1: CPU Info + Profiles ── */}
      <div className="card">
        <div className="card-head"><span className="card-title">Processor</span></div>
        <div className="card-body">
          <div className="cpu-grid">
            <Row k="型号" v={cpuInfo.name.replace(/®/g,'').replace(/™/g,'')} />
            <Row k="架构" v={cpuInfo.architecture} />
            <Row k="核心" v={`${cpuInfo.cores_physical}P / ${cpuInfo.cores_logical}T`} />
            <Row k="基础频率" v={`${cpuInfo.base_freq_mhz} MHz`} />
            <Row k="Turbo" v={cpuInfo.has_turbo_boost ? '✅' : '❌'} />
            <Row k="Speed Shift" v={cpuInfo.has_speed_shift ? '✅' : '—'} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">Quick Presets</span></div>
        <div className="card-body">
          <div className="preset-grid">
            {presets.map(p => (
              <button
                key={p.id}
                className={`preset-btn ${activeId === p.id ? 'active' : ''}`}
                onClick={() => applyProfile(p.id)}
              >
                <span className="emoji">{p.icon}</span>
                <div className="preset-info">
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-desc">
                    {profileConfig?.active_profile_id === p.id ? '● 当前' : `Min ${p.min_processor_state ?? '—'}% / Max ${p.max_processor_state ?? '—'}%`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Gauges ── */}
      {metrics && (
        <div className="card">
          <div className="card-head"><span className="card-title">Live Metrics</span></div>
          <div className="card-body">
            <div className="gauges">
              <Gauge label="CPU" value={metrics.cpu_usage_total} max={100} unit="%" color={gColor(metrics.cpu_usage_total, 50, 80)} digits={0} />
              {metrics.cpu_temp_c != null && <Gauge label="温度" value={metrics.cpu_temp_c} max={100} unit="°C" color={gColor(metrics.cpu_temp_c, 60, 85)} digits={1} />}
              <Gauge label="频率" value={metrics.cpu_freq_current_mhz} max={Math.max(cpuInfo.max_freq_mhz, cpuInfo.base_freq_mhz) * 1.2 || 5000} unit="MHz" color="#3b82f6" digits={0} />
              <Gauge label="内存" value={metrics.ram_usage_percent} max={100} unit="%" color={gColor(metrics.ram_usage_percent, 60, 80)} digits={0} />
            </div>
          </div>
        </div>
      )}

      {/* ── Row 3: Per-Core ── */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Per-Thread</span>
          {metrics && <span style={{fontSize:10, color:'var(--text-muted)'}}>{metrics.cores.length} threads</span>}
        </div>
        <div className="card-body">
          {metrics && metrics.cores.length > 0 ? (
            <div className="core-grid">
              {metrics.cores.map(c => (
                <div key={c.thread_id} className="core-cell" title={`T${c.thread_id}: ${c.c0_percent.toFixed(0)}% / ${c.frequency_mhz.toFixed(0)} MHz`}>
                  <div className="core-id">T{c.thread_id}</div>
                  <div className="core-mini-bar">
                    <div
                      className="core-mini-fill"
                      style={{
                        height: `${Math.max(Math.min(c.c0_percent, 100), 8)}%`,
                        backgroundColor: c.c0_percent > 80 ? 'var(--red)' : c.c0_percent > 50 ? 'var(--amber)' : 'var(--green)',
                      }}
                    />
                  </div>
                  <div className="core-freq">{c.frequency_mhz > 0 ? `${(c.frequency_mhz / 1000).toFixed(1)}` : '—'}</div>
                </div>
              ))}
            </div>
          ) : <p style={{textAlign:'center', color:'var(--text-muted)'}}>等待数据…</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function Row({k, v}: {k: string; v: string}) {
  return <div className="cpu-row"><span className="cpu-label">{k}</span><span className="cpu-val">{v}</span></div>
}
function RowNum(k: string, v: string) {
  return <div className="cpu-row"><span className="cpu-label">{k}</span><span className="cpu-val">{v}</span></div>
}
function Gauge({label, value, max, unit, color, digits}: {label:string; value:number; max:number; unit:string; color:string; digits:number}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="gauge">
      <div className="gauge-top">
        <span className="gauge-lbl">{label}</span>
        <span className="gauge-val" style={{color}}>{label === '频率' ? value.toFixed(digits) : value.toFixed(digits)}{unit}</span>
      </div>
      <div className="gauge-track"><div className="gauge-fill" style={{width:`${pct}%`, backgroundColor: color}}/></div>
    </div>
  )
}
function gColor(v: number, warn: number, hot: number) { return v > hot ? 'var(--red)' : v > warn ? 'var(--amber)' : 'var(--green)' }
