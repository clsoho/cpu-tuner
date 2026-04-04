import { useAppStore } from '../../stores/appStore'

export default function Dashboard() {
  const { cpuInfo, metrics, profileConfig, applyProfile } = useAppStore()

  if (!cpuInfo) return <p>正在加载…</p>
  const activeProfile = profileConfig?.profiles[profileConfig.active_profile_id]

  return (
    <div className="dashboard">
      {/* Row 1: CPU Info + Profile Quick Switch */}
      <div className="dash-row">
        <Card title="CPU 信息" className="card-cpu">
          <div className="cpu-info-grid">
            <InfoItem label="型号" value={cpuInfo.name} />
            <InfoItem label="架构" value={cpuInfo.architecture} />
            <InfoItem label="核心" value={`${cpuInfo.cores_physical}P / ${cpuInfo.cores_logical}T`} />
            <InfoItem label="基础频率" value={`${cpuInfo.base_freq_mhz} MHz`} />
            <InfoItem label="Turbo Boost" value={cpuInfo.has_turbo_boost ? '✅ 支持' : '❌ 不支持'} />
            <InfoItem label="Speed Shift" value={cpuInfo.has_speed_shift ? '✅ 支持' : '❌ 不支持'} />
          </div>
        </Card>

        <Card title="快速切檔" className="card-profiles">
          <div className="profile-grid">
            {Object.values(profileConfig?.profiles ?? {}).map((p) => (
              <button
                key={p.id}
                className={`profile-btn ${profileConfig?.active_profile_id === p.id ? 'active' : ''}`}
                onClick={() => applyProfile(p.id)}
              >
                <span className="profile-icon">{p.icon}</span>
                <span className="profile-name">{p.name}</span>
              </button>
            ))}
          </div>
          {activeProfile && (
            <div className="active-profile-badge">
              当前配置: {activeProfile.icon} {activeProfile.name}
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: Real-time Metrics */}
      <div className="dash-row">
        <Card title="实时监控" className="card-metrics" noTitle>
          {metrics ? (
            <div className="metrics-grid">
              <MetricGauge
                label="CPU 使用率"
                value={metrics.cpu_usage_total}
                max={100}
                unit="%"
                color={metrics.cpu_usage_total > 80 ? '#ef4444' : metrics.cpu_usage_total > 50 ? '#f59e0b' : '#22c55e'}
              />
              {metrics.cpu_temp_c != null && (
                <MetricGauge
                  label="温度"
                  value={metrics.cpu_temp_c}
                  max={120}
                  unit="°C"
                  color={metrics.cpu_temp_c > 85 ? '#ef4444' : metrics.cpu_temp_c > 60 ? '#f59e0b' : '#22c55e'}
                />
              )}
              <MetricGauge
                label="频率"
                value={metrics.cpu_freq_current_mhz}
                max={Math.max(cpuInfo.max_freq_mhz, cpuInfo.base_freq_mhz) * 1.2 || 5000}
                unit="MHz"
                color="#3b82f6"
              />
              <MetricGauge
                label="内存"
                value={metrics.ram_usage_percent}
                max={100}
                unit="%"
                color={metrics.ram_usage_percent > 80 ? '#ef4444' : '#8b5cf6'}
              />
            </div>
          ) : (
            <p className="no-data">等待数据…</p>
          )}
        </Card>
      </div>

      {/* Row 3: Per-Core Mini Bars */}
      <div className="dash-row">
        <Card title="核心一览" className="card-cores">
          {metrics && metrics.cores.length > 0 ? (
            <div className="cores-grid">
              {metrics.cores.map((core) => (
                <div key={core.thread_id} className="core-cell"
                  title={`Thread ${core.thread_id}: ${core.usage_percent.toFixed(0)}% | ${core.frequency_mhz.toFixed(0)} MHz ${core.temperature_c ? `| ${core.temperature_c.toFixed(0)}°C` : ''}`}
                >
                  <div className="core-id">T{core.thread_id}</div>
                  <div className="core-bar">
                    <div
                      className="core-bar-fill"
                      style={{
                        width: `${Math.min(core.usage_percent, 100)}%`,
                        backgroundColor: core.usage_percent > 80 ? '#ef4444' : core.usage_percent > 50 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                  <div className="core-freq">{core.frequency_mhz > 0 ? `${(core.frequency_mhz / 1000).toFixed(1)}` : '—'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">没有核心数据</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
  className = '',
  noTitle = false,
}: {
  title?: string
  children: React.ReactNode
  className?: string
  noTitle?: boolean
}) {
  return (
    <div className={`card ${className}`}>
      {!noTitle && <div className="card-title">{title}</div>}
      {children}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}

function MetricGauge({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string
  value: number
  max: number
  unit: string
  color: string
}) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="gauge">
      <div className="gauge-header">
        <span className="gauge-label">{label}</span>
        <span className="gauge-value" style={{ color }}>
          {label === '频率' ? value.toFixed(0) : value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="gauge-track">
        <div
          className="gauge-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
