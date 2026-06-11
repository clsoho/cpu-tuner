import { useAppStore } from '../../stores/appStore'
import { useI18n } from '../../stores/i18n'
import { useState } from 'react'
import * as api from '../../types'

export default function MainPanel() {
  const {
    cpuInfo, metrics, profileConfig, applyProfile, updateProfile,
  } = useAppStore()
  const { t } = useI18n()
  const [setMult, setSetMult] = useState<number | null>(null)
  const [clkMod, setClkMod] = useState(100)

  if (!cpuInfo) return <div className="app-loading"><div className="spinner" /><p>{t('main.detect_cpu')}</p></div>

  const profiles = Object.values(profileConfig?.profiles ?? {}).sort((a, b) => a.id - b.id)
  const activeId = profileConfig?.active_profile_id ?? 2
  const activeProfile = profileConfig?.profiles[activeId]

  const handleProfileClick = (id: number) => {
    applyProfile(id)
  }

  const handleToggle = (field: keyof api.Profile, value: boolean | null) => {
    if (!activeProfile) return
    const updated = { ...activeProfile, [field]: value }
    updateProfile(updated)
  }

  const handleClkMod = (val: number) => {
    setClkMod(val)
    if (activeProfile) {
      updateProfile({ ...activeProfile, clock_modulation_duty: val })
    }
    api.setClockModulation(val).catch(() => {})
  }

  const handleSetMult = (val: number | null) => {
    setSetMult(val)
    if (activeProfile) {
      updateProfile({ ...activeProfile, set_multiplier: val })
    }
  }

  const tempColor = (t: number) => t > 85 ? 'var(--red)' : t > 60 ? 'var(--amber)' : 'var(--green)'
  const usageColor = (u: number) => u > 80 ? 'var(--red)' : u > 50 ? 'var(--amber)' : 'var(--green)'

  return (
    <>
      {/* Profile Row */}
      <div className="profile-row">
        <div className="profile-radio-group">
          {profiles.map(p => (
            <button
              key={p.id}
              className={`profile-radio ${activeId === p.id ? 'active' : ''}`}
              onClick={() => handleProfileClick(p.id)}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
        <span className="cpu-name-badge">{cpuInfo.name.replace(/®/g,'').replace(/™/g,'').trim()}</span>
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left: Per-Core Monitoring Table */}
        <div className="panel" style={{overflow:'auto'}}>
          <div className="panel-head">
            <span className="panel-title">{t('main.cpu_monitoring')}</span>
            {metrics && (
              <span className="text-xs text-muted">
                {metrics.cpu_usage_total.toFixed(1)}% | {(metrics.cpu_freq_current_mhz / 1000).toFixed(2)} GHz
                {metrics.cpu_temp_c != null && ` | ${metrics.cpu_temp_c.toFixed(0)}°C`}
              </span>
            )}
          </div>
          <div className="panel-body" style={{padding:0}}>
            <table className="mon-table">
              <thead>
                <tr>
                  <th>{t('main.thread')}</th>
                  <th className="th-num">{t('main.c0')}</th>
                  <th className="th-num">{t('main.temp')}</th>
                  <th className="th-num">{t('main.mhz')}</th>
                  <th className="th-num">{t('main.mult')}</th>
                  <th className="th-num">{t('main.vid')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {metrics && metrics.cores.length > 0 ? (
                  metrics.cores.map(c => (
                    <tr key={c.thread_id}>
                      <td style={{color:'var(--accent)'}}>T{c.thread_id}</td>
                      <td className="td-num" style={{color: usageColor(c.c0_percent)}}>
                        {c.c0_percent.toFixed(1)}
                      </td>
                      <td className="td-num" style={{color: c.temperature_c != null ? tempColor(c.temperature_c) : 'var(--text-muted)'}}>
                        {c.temperature_c != null ? c.temperature_c.toFixed(0) : '—'}
                      </td>
                      <td className="td-num">{c.frequency_mhz > 0 ? (c.frequency_mhz / 1000).toFixed(2) : '—'}</td>
                      <td className="td-num">{c.multiplier > 0 ? `x${c.multiplier.toFixed(0)}` : '—'}</td>
                      <td className="td-num" style={{color: 'var(--cyan)'}}>
                        {c.vid > 0 ? c.vid.toFixed(4) : '—'}
                      </td>
                      <td>
                        <div className="mini-bar">
                          <div className="mini-bar-fill" style={{width:`${Math.min(c.c0_percent,100)}%`, backgroundColor: usageColor(c.c0_percent)}} />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} style={{textAlign:'center', color:'var(--text-muted)', padding:12}}>
                    {metrics ? t('main.waiting_data') : t('main.waiting_conn')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="controls-panel">
          {/* Set Multiplier */}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">{t('main.set_multiplier')}</span></div>
            <div className="panel-body" style={{display:'flex', alignItems:'center', gap:8}}>
              <input
                className="ts-input ts-input-lg"
                type="number"
                min={8} max={80}
                value={setMult ?? ''}
                onChange={e => handleSetMult(e.target.value ? +e.target.value : null)}
                placeholder="Auto"
              />
              <span style={{color:'var(--text-muted)', fontSize:12}}>{t('main.set_multiplier')}</span>
            </div>
          </div>

          {/* Clock Modulation */}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">{t('main.clock_modulation')}</span></div>
            <div className="panel-body">
              <div className="slider-group">
                <div className="slider-row">
                  <input
                    type="range" min={0} max={100} step={6.25}
                    value={clkMod}
                    onChange={e => handleClkMod(+e.target.value)}
                  />
                  <span className="slider-val" style={{color: clkMod < 100 ? 'var(--amber)' : 'var(--text-secondary)'}}>
                    {clkMod.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">{t('main.options')}</span></div>
            <div className="panel-body">
              <CheckItem
                label={t('main.speedstep')}
                checked={activeProfile?.speed_step ?? null}
                onChange={v => handleToggle('speed_step', v)}
              />
              <CheckItem
                label={t('main.speed_shift')}
                checked={activeProfile?.speed_shift ?? null}
                onChange={v => handleToggle('speed_shift', v)}
              />
              <CheckItem
                label={t('main.c1e')}
                checked={activeProfile?.c1e ?? null}
                onChange={v => handleToggle('c1e', v)}
              />
              <div className="ts-sep" />
              <CheckItem
                label={t('main.bd_prochot')}
                checked={activeProfile?.disable_bd_prochot === true ? false : activeProfile?.disable_bd_prochot === false ? true : null}
                onChange={v => handleToggle('disable_bd_prochot', v ? true : false)}
              />
              <CheckItem
                label={t('main.turbo')}
                checked={activeProfile?.disable_turbo === true ? false : activeProfile?.disable_turbo === false ? true : null}
                onChange={v => handleToggle('disable_turbo', v ? false : true)}
              />
            </div>
          </div>

          {/* Speed Shift EPP */}
          <div className="panel">
            <div className="panel-head"><span className="panel-title">{t('main.speed_shift')}</span></div>
            <div className="panel-body">
              <div className="ctrl-row">
                <span className="ctrl-label">{t('main.epp')}</span>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <input
                    className="ts-input ts-input-sm"
                    type="number" min={0} max={255}
                    value={activeProfile?.speed_shift_epp ?? ''}
                    onChange={e => {
                      const val = e.target.value ? +e.target.value : null;
                      if (activeProfile) updateProfile({ ...activeProfile, speed_shift_epp: val });
                    }}
                  />
                  <span className="text-xs text-muted">(0-255)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active profile indicator */}
          <div style={{padding:'4px 6px', fontSize:12, color:'var(--text-muted)', textAlign:'center'}}>
            {t('main.active')}: {profileConfig && `${profileConfig.profiles[activeId]?.icon ?? ''} ${profileConfig.profiles[activeId]?.name ?? ''}`}
          </div>
        </div>
      </div>
    </>
  )
}

function CheckItem({label, checked, onChange}: {label:string; checked:boolean|null; onChange:(v:boolean|null)=>void}) {
  const isOn = checked === true
  const isOff = checked === false
  return (
    <div className="ts-checkbox" onClick={() => onChange(isOn ? null : isOn ? false : true)}>
      <div className={`ts-checkbox-box ${isOn ? 'on' : ''}`}>
        {isOn && <svg width="10" height="10" viewBox="0 0 8 8" fill="none"><path d="M1 4L3 6L7 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {isOff && <svg width="10" height="10" viewBox="0 0 8 8" fill="none"><path d="M2 2L6 6M6 2L2 6" stroke="#888" strokeWidth="1.2" strokeLinecap="round"/></svg>}
      </div>
      <span className="ts-checkbox-label" style={{opacity: checked === null ? 0.5 : 1}}>{label}</span>
    </div>
  )
}
