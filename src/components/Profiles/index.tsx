import { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import * as api from '../../types'

export default function ProfilesPage() {
  const { profileConfig, applyProfile, updateProfile, fetchProfiles, startMonitoring } = useAppStore()
  const [editing, setEditing] = useState<api.Profile | null>(null)
  const [applying, setApplying] = useState<number | null>(null)

  if (!profileConfig) return <div className="app-loading"><div className="spinner"/><p>加载配置…</p></div>

  const profiles = Object.values(profileConfig.profiles).sort((a,b) => a.id - b.id)
  const activeId = profileConfig.active_profile_id

  const handleApply = async (id: number) => {
    setApplying(id)
    await applyProfile(id)
    setApplying(null)
  }

  return (
    <div className="profiles-page">
      <h2>性能配置</h2>
      <p className="subtitle">一键切换 CPU 性能参数 — 类比 ThrottleStop Profile 按钮</p>

      <div className="profile-cards">
        {profiles.map(p => (
          <div key={p.id} className={`profile-card ${activeId === p.id ? 'active' : ''}`}>
            {activeId === p.id && <span className="active-badge">ACTIVE</span>}
            <div className="profile-card-head">
              <span className="profile-emoji">{p.icon}</span>
              <div>
                <div className="profile-card-name">{p.name}</div>
                <div style={{fontSize:10, color:'var(--text-muted)'}}>ID: {p.id}</div>
              </div>
            </div>
            <div className="profile-specs">
              <Spec label="Min CPU" value={p.min_processor_state != null ? `${p.min_processor_state}%` : '—'} />
              <Spec label="Max CPU" value={p.max_processor_state != null ? `${p.max_processor_state}%` : '—'} />
              <Spec label="散热" value={coolingLabel(p.system_cooling_policy)} />
              <Spec label="Boost" value={boostLabel(p.processor_boost_mode)} />
              <Spec label="EPP" value={p.speed_shift_epp != null ? `${p.speed_shift_epp}` : '—'} />
              <Spec label="Turbo" value={p.disable_turbo === false ? 'ON' : p.disable_turbo === true ? 'OFF' : '—'} />
            </div>
            <div className="profile-card-actions">
              <button className={`btn ${activeId === p.id ? 'btn-green' : 'btn-primary'}`} disabled={applying !== null} onClick={() => handleApply(p.id)}>
                {applying === p.id ? '⏳ 应用…' : activeId === p.id ? '✓ 已激活' : '应用'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>编辑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="card" style={{marginTop: 8}}>
        <div className="card-head"><span className="card-title">参数对照</span></div>
        <div className="card-body" style={{overflowX:'auto'}}>
          <table className="tt">
            <thead><tr><th>参数</th>{profiles.map(p => <th key={p.id}>{p.icon} {p.name}</th>)}</tr></thead>
            <tbody>
              <CompRow label="Min CPU" fn={p => p.min_processor_state != null ? `${p.min_processor_state}%` : '—'} profiles={profiles} />
              <CompRow label="Max CPU" fn={p => p.max_processor_state != null ? `${p.max_processor_state}%` : '—'} profiles={profiles} />
              <CompRow label="散热" fn={p => coolingLabel(p.system_cooling_policy)} profiles={profiles} />
              <CompRow label="Boost" fn={p => boostLabel(p.processor_boost_mode)} profiles={profiles} />
              <CompRow label="EPP" fn={p => p.speed_shift_epp != null ? `${p.speed_shift_epp}` : '—'} profiles={profiles} />
              <CompRow label="Turbo" fn={p => p.disable_turbo === false ? 'ON' : p.disable_turbo === true ? 'OFF' : '—'} profiles={profiles} />
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && <EditModal profile={editing} onClose={() => setEditing(null)} onSave={async pf => { await updateProfile(pf); setEditing(null) }} />}
    </div>
  )
}

function Spec({label, value}: {label: string; value: string}) {
  return <div className="spec"><span className="spec-lbl">{label}</span><span className="spec-val">{value}</span></div>
}
function CompRow({label, fn, profiles}: {label: string; fn: (p: api.Profile) => string; profiles: api.Profile[]}) {
  return (
    <tr><td style={{color:'var(--text-muted)', fontFamily:'inherit'}}>{label}</td>{profiles.map(p => <td key={p.id}>{fn(p)}</td>)}</tr>
  )
}
function EditModal({profile, onClose, onSave}: {profile: api.Profile; onClose: () => void; onSave: (p: api.Profile) => void}) {
  const [data, setData] = useState({...profile})
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>编辑: {profile.icon} {profile.name}</h3>
        <div className="form-group"><label>名称</label><input value={data.name} onChange={e => setData({...data, name: e.target.value})} /></div>
        <div className="form-group"><label>Icon</label><input value={data.icon} onChange={e => setData({...data, icon: e.target.value})} /></div>
        <div className="form-group"><label>Min Processor State (%)</label><input type="number" min={0} max={100} value={data.min_processor_state ?? ''} onChange={e => setData({...data, min_processor_state: e.target.value ? +e.target.value : null})} /></div>
        <div className="form-group"><label>Max Processor State (%)</label><input type="number" min={0} max={100} value={data.max_processor_state ?? ''} onChange={e => setData({...data, max_processor_state: e.target.value ? +e.target.value : null})} /></div>
        <div className="form-group"><label>System Cooling Policy</label><select value={data.system_cooling_policy ?? ''} onChange={e => setData({...data, system_cooling_policy: e.target.value ? +e.target.value : null})}><option value="">默认</option><option value={0}>被动 (0)</option><option value={1}>主动 (1)</option></select></div>
        <div className="form-group"><label>Boost Mode</label><select value={data.processor_boost_mode ?? ''} onChange={e => setData({...data, processor_boost_mode: e.target.value ? +e.target.value : null})}><option value="">默认</option><option value={0}>Disabled</option><option value={1}>Enabled</option><option value={2}>Efficient</option><option value={3}>Aggressive</option></select></div>
        <div className="form-group"><label>Speed Shift EPP (0-255)</label><input type="number" min={0} max={255} value={data.speed_shift_epp ?? ''} onChange={e => setData({...data, speed_shift_epp: e.target.value ? +e.target.value : null})} /></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>取消</button><button className="btn btn-primary" onClick={() => onSave(data)}>保存</button></div>
      </div>
    </div>
  )
}
function coolingLabel(v: number | null | undefined): string { return v === 0 ? '被动' : v === 1 ? '主动' : '—' }
function boostLabel(v: number | null | undefined): string { return v === 0 ? 'Disabled' : v === 1 ? 'Enabled' : v === 2 ? 'Efficient' : v === 3 ? 'Aggressive' : '—' }
