import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useI18n } from '../../stores/i18n'
import * as api from '../../types'

export default function OptionsPanel() {
  const { profileConfig, updateProfile, showToast } = useAppStore()
  const { t } = useI18n()
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
    showToast('Options saved')
  }

  return (
    <div>
      {/* Profile Settings */}
      <div className="panel" style={{marginBottom:6}}>
        <div className="panel-head">
          <span className="panel-title">{t('options.profiles')}</span>
        </div>
        <div className="panel-body">
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8}}>
            {profiles.map(p => (
              <div key={p.id} className="card" style={{border: p.id === (profileConfig?.active_profile_id ?? 2) ? '1px solid var(--accent)' : '1px solid var(--border-card)'}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <input
                    className="ts-input"
                    style={{flex:1, width:'auto', fontSize:13}}
                    value={p.name}
                    onChange={e => updateProfile({...p, name: e.target.value})}
                  />
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:3, fontSize:12, color:'var(--text-secondary)'}}>
                  <span>{t('main.epp')}: {p.speed_shift_epp ?? 'Auto'} | {t('options.turbo')}: {p.disable_turbo === true ? t('options.off') : p.disable_turbo === false ? t('options.on') : t('options.default')}</span>
                  <span>{t('options.cpu_range')}: {p.min_processor_state ?? 0}% – {p.max_processor_state ?? 100}%</span>
                  <span>{t('options.core_voltage')}: {p.undervolt_core_mv != null ? `${p.undervolt_core_mv}mV` : t('options.default')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Options */}
      <div className="panel" style={{marginBottom:6}}>
        <div className="panel-head">
          <span className="panel-title">{t('options.global_settings')}</span>
        </div>
        <div className="panel-body">
          <div className="options-grid">
            <div>
              <div className="toggle-row">
                <span className="toggle-label">{t('options.minimize_tray')}</span>
                <div className={`toggle ${minimizeToTray ? 'on' : ''}`} onClick={() => setMinimizeToTray(!minimizeToTray)} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">{t('options.start_with_windows')}</span>
                <div className={`toggle ${startWithWindows ? 'on' : ''}`} onClick={() => setStartWithWindows(!startWithWindows)} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">{t('options.auto_apply')}</span>
                <div className={`toggle ${autoApply ? 'on' : ''}`} onClick={() => setAutoApply(!autoApply)} />
              </div>
            </div>
            <div>
              <div className="data-row">
                <span className="data-label">{t('options.temp_alarm')}</span>
                <input className="ts-input ts-input-sm" type="number" min={50} max={105} value={alarmTemp ?? ''} onChange={e => setAlarmTemp(e.target.value ? +e.target.value : null)} />
              </div>
              <div className="data-row">
                <span className="data-label">{t('options.on_battery')}</span>
                <select value={batteryProfile ?? ''} onChange={e => setBatteryProfile(e.target.value ? +e.target.value : null)}>
                  <option value="">—</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <div className="data-row">
                <span className="data-label">{t('options.on_ac')}</span>
                <select value={acProfile ?? ''} onChange={e => setAcProfile(e.target.value ? +e.target.value : null)}>
                  <option value="">—</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" style={{marginTop:8}} onClick={handleSave}>{t('options.save')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="panel">
        <div className="panel-head"><span className="panel-title">{t('options.about')}</span></div>
        <div className="panel-body">
          <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.7}}>
            <div><b>{t('options.about_line1')}</b></div>
            <div>{t('options.about_line2')}</div>
            <div style={{marginTop:6}}>
              ⚠ {t('options.warning')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
