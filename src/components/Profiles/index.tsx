import { useEffect, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

export default function Profiles() {
  const { profileConfig, applyProfile, fetchProfiles } = useAppStore()
  const [applying, setApplying] = useState<number | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  if (!profileConfig) return <p>加载中…</p>
  const profiles = Object.values(profileConfig.profiles)
  const activeId = profileConfig.active_profile_id

  return (
    <div className="profiles-page">
      <h2>性能配置</h2>
      <p className="page-desc">一键切换 CPU 性能模式 — 类似 ThrottleStop 的 Profile 按钮</p>

      <div className="profile-quick-grid">
        {profiles.map(p => (
          <div key={p.id} className={`profile-card ${activeId === p.id ? 'active' : ''}`}>
            <div className="profile-card-header">
              <span className="profile-emoji">{p.icon}</span>
              <div className="profile-name">{p.name}</div>
            </div>

            <div className="profile-specs">
              {p.min_processor_state != null && <Spec label="Min CPU" value={`${p.min_processor_state}%`} />}
              {p.max_processor_state != null && <Spec label="Max CPU" value={`${p.max_processor_state}%`} />}
              <Spec label="散热" value={coolingLabel(p.system_cooling_policy)} />
              <Spec label="Boost" value={boostLabel(p.processor_boost_mode)} />
              {p.speed_shift_epp != null && <Spec label="EPP" value={`${p.speed_shift_epp}`} />}
            </div>

            <button
              className={`btn-apply ${activeId === p.id ? 'btn-apply-active' : ''}`}
              disabled={applying !== null}
              onClick={async () => {
                setApplying(p.id)
                await applyProfile(p.id)
                setApplying(null)
              }}
            >
              {applying === p.id ? '应用中…' : activeId === p.id ? '当前激活 ✓' : '应用此配置'}
            </button>
          </div>
        ))}
      </div>

      {/* Settings Info */}
      <div className="profiles-info">
        <h3>参数说明</h3>
        <table className="params-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>说明</th>
              <th>省电</th>
              <th>均衡</th>
              <th>高性能</th>
              <th>极致</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Min CPU</td>
              <td>CPU 最低占用百分比</td>
              <td>5%</td>
              <td>5%</td>
              <td>100%</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>Max CPU</td>
              <td>CPU 最高占用百分比</td>
              <td>50%</td>
              <td>100%</td>
              <td>100%</td>
              <td>100%</td>
            </tr>
            <tr>
              <td>EPP</td>
              <td>Speed Shift 性能偏好</td>
              <td>212</td>
              <td>128</td>
              <td>32</td>
              <td>0</td>
            </tr>
            <tr>
              <td>Boost</td>
              <td>Turbo Boost 模式</td>
              <td>Disabled</td>
              <td>Efficient</td>
              <td>Aggressive</td>
              <td>Aggressive</td>
            </tr>
            <tr>
              <td>散热</td>
              <td>风扇策略</td>
              <td>被动</td>
              <td>主动</td>
              <td>主动</td>
              <td>主动</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec">
      <span className="spec-label">{label}</span>
      <span className="spec-value">{value}</span>
    </div>
  )
}

function coolingLabel(mode: number | null | undefined): string {
  return mode === 0 ? '被动 🌀' : mode === 1 ? '主动 💨' : '默认'
}

function boostLabel(mode: number | null | undefined): string {
  switch (mode) {
    case 0: return 'Disabled ❌'
    case 1: return 'Enabled ✅'
    case 2: return 'Efficient ⚡'
    case 3: return 'Aggressive 🔥'
    default: return '默认'
  }
}
