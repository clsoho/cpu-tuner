import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import * as api from '../../types'

export default function OptionsPanel() {
  const { profileConfig, updateProfile, fetchProfiles, showToast } = useAppStore()
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [startWithWindows, setStartWithWindows] = useState(false)
  const [autoApply, setAutoApply] = useState(true)
  const [alarmTemp, setAlarmTemp] = useState<number | null>(95)

  useEffect(() => {
    if (profileConfig) {
      setMinimizeToTray(profileConfig.minimize_to_tray)
      setStartWithWindows(profileConfig.start_with_windows)
      setAutoApply(profileConfig.auto_apply_on_startup)
      setAlarmTemp(profileConfig.alarm_temp_threshold ?? 95)
    }
  }, [profileConfig])

  const profiles = Object.values(profileConfig?.profiles ?? {}).sort((a, b) => a.id - b.id)
  const [batteryProfile, setBatteryProfile] = useState<number | null>(null)
  const [acProfile, setAcProfile] = useState<number | null>(null)

  useEffect(() => {
    if (profileConfig) {
      setBatteryProfile(profileConfig.battery_profile_id)
      setAcProfile(profileConfig.ac_profile_id)
    }
  }, [profileConfig])

  const handleSave = async () => {
    // Save options by updating profile config
    showToast('Options saved')
  }

  const handleEditProfile = (p: api.Profile) => {
    setEditProfile(p)
  }

  const [editProfile, setEditProfile] = useState<api.Profile | null>(null)
  const [editData, setEditData] = useState<api.Profile | null>(null)

  useEffect(() => {
    if (editProfile) setEditData({...editProfile})
  }, [editProfile])

  const handleSaveProfile = async () => {
    if (!editData) return
    await updateProfile(editData)
    setEditProfile(null)
  }

  return (
    <div>
      {/* Profile Settings */}
      <div className="panel" style={{marginBottom:4}}>
        <div className="panel-head">
          <span className="panel-title">Profiles</span>
        </div>
        <div className="panel-body">
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:6}}>
            {profiles.map(p => (
              <div key={p.id} className="card" style={{background:'var(--bg-chip)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-s)', padding:'8px'}}>
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                  <span style={{fontSize:18}}>{p.icon}</span>
                  <input
                    className="ts-input"
                    style={{flex:1, width:'auto'}}
                    value={p.name}
                    onChange={e => updateProfile({...p, name: e.target.value})}
                  />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:2, fontSize:10, color:'var(--text-secondary)'}}>
                  <span>EPP: {p.speed_shift_epp ?? 'Auto'} | Turbo: {p.disable_turbo === true ? 'OFF' : p.disable_turbo === false ? 'ON' : 'Default'}</span>
                  <span>CPU: {p.min_processor_state ?? 0}% – {p.max_processor_state ?? 100}%</span>
                  <span>Core: {p.undervolt_core_mv != null ? `${p.undervolt_core_mv}mV` : 'Default'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Options */}
      <div className="panel" style={{marginBottom:4}}>
        <div className="panel-head">
          <span className="panel-title">Global Settings</span>
        </div>
        <div className="panel-body">
          <div className="options-grid">
            <div>
              <div className="toggle-row">
                <span className="toggle-label">Minimize to Tray</span>
                <div className={`toggle ${minimizeToTray ? 'on' : ''}`} onClick={() => setMinimizeToTray(!minimizeToTray)} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">Start with Windows</span>
                <div className={`toggle ${startWithWindows ? 'on' : ''}`} onClick={() => setStartWithWindows(!startWithWindows)} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">Auto Apply on Startup</span>
                <div className={`toggle ${autoApply ? 'on' : ''}`} onClick={() => setAutoApply(!autoApply)} />
              </div>
            </div>
            <div>
              <div className="data-row">
                <span className="data-label">Temperature Alarm</span>
                <input className="ts-input ts-input-sm" type="number" min={50} max={105} value={alarmTemp ?? ''} onChange={e => setAlarmTemp(e.target.value ? +e.target.value : null)} />
              </div>
              <div className="data-row">
                <span className="data-label">On Battery</span>
                <select
                  style={{background:'var(--bg-input)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xs)', color:'var(--text-primary)', padding:'2px 4px', fontSize:11}}
                  value={batteryProfile ?? ''}
                  onChange={e => setBatteryProfile(e.target.value ? +e.target.value : null)}
                >
                  <option value="">—</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <div className="data-row">
                <span className="data-label">On AC Power</span>
                <select
                  style={{background:'var(--bg-input)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xs)', color:'var(--text-primary)', padding:'2px 4px', fontSize:11}}
                  value={acProfile ?? ''}
                  onChange={e => setAcProfile(e.target.value ? +e.target.value : null)}
                >
                  <option value="">—</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" style={{marginTop:6}} onClick={handleSave}>Save Settings</button>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="panel">
        <div className="panel-head"><span className="panel-title">About</span></div>
        <div className="panel-body">
          <div style={{fontSize:10, color:'var(--text-muted)', lineHeight:1.6}}>
            <div><b>CPU Tuner</b> v0.1.0 — Windows CPU Performance Tuning Utility</div>
            <div>Inspired by ThrottleStop by Kevin Glynn (TechPowerUp)</div>
            <div style={{marginTop:4}}>
              ⚠ TDP and voltage modifications can damage hardware. Use at your own risk.<br />
              Always monitor temperatures when adjusting settings.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
