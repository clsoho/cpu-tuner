import { useState, useEffect } from 'react'
import { useI18n } from '../../stores/i18n'
import * as api from '../../types'

export default function TplPanel() {
  const { t } = useI18n()
  const [pl1, setPl1] = useState<number | null>(null)
  const [pl2, setPl2] = useState<number | null>(null)
  const [timeWindow, setTimeWindow] = useState<number | null>(null)
  const [mmioLock, setMmioLock] = useState(false)
  const [syncMmio, setSyncMmio] = useState(false)

  useEffect(() => {
    api.getTplSettings().then(s => {
      setPl1(s.power_limit_long_w)
      setPl2(s.power_limit_short_w)
      setTimeWindow(s.turbo_time_window_s)
      setMmioLock(s.mmio_lock)
      setSyncMmio(s.sync_mmio)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await api.setTplSettings({
        power_limit_long_w: pl1,
        power_limit_short_w: pl2,
        turbo_time_window_s: timeWindow,
        mmio_lock: mmioLock,
        sync_mmio: syncMmio,
      })
    } catch {}
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{t('tpl.title')}</span>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>{t('tpl.apply')}</button>
      </div>
      <div className="panel-body">
        <div className="tpl-grid">
          {/* PL1 */}
          <div>
            <div className="section-title">{t('tpl.pl1')}</div>
            <div className="ctrl-row">
              <span className="ctrl-label">{t('tpl.pl1_w')}</span>
              <input
                className="ts-input"
                type="number" min={0} max={500}
                value={pl1 ?? ''}
                onChange={e => setPl1(e.target.value ? +e.target.value : null)}
              />
            </div>
            <div className="ctrl-row">
              <span className="ctrl-label">{t('tpl.time_window')}</span>
              <input
                className="ts-input"
                type="number" min={0} max={256}
                value={timeWindow ?? ''}
                onChange={e => setTimeWindow(e.target.value ? +e.target.value : null)}
              />
            </div>
          </div>

          {/* PL2 */}
          <div>
            <div className="section-title">{t('tpl.pl2')}</div>
            <div className="ctrl-row">
              <span className="ctrl-label">{t('tpl.pl2_w')}</span>
              <input
                className="ts-input"
                type="number" min={0} max={500}
                value={pl2 ?? ''}
                onChange={e => setPl2(e.target.value ? +e.target.value : null)}
              />
            </div>
          </div>
        </div>

        <div className="ts-sep" />

        {/* MMIO / Sync */}
        <div style={{display:'flex', gap:20}}>
          <div className="ts-checkbox" onClick={() => setMmioLock(!mmioLock)}>
            <div className={`ts-checkbox-box ${mmioLock ? 'on' : ''}`}>
              {mmioLock && <svg width="10" height="10" viewBox="0 0 8 8" fill="none"><path d="M1 4L3 6L7 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span className="ts-checkbox-label">{t('tpl.mmio_lock')}</span>
          </div>
          <div className="ts-checkbox" onClick={() => setSyncMmio(!syncMmio)}>
            <div className={`ts-checkbox-box ${syncMmio ? 'on' : ''}`}>
              {syncMmio && <svg width="10" height="10" viewBox="0 0 8 8" fill="none"><path d="M1 4L3 6L7 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            </div>
            <span className="ts-checkbox-label">{t('tpl.sync_mmio')}</span>
          </div>
        </div>

        <div className="ts-sep" />

        {/* Quick presets */}
        <div className="section-title">{t('tpl.quick_presets')}</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {[
            {key:'tpl.preset_laptop', pl1:35, pl2:45},
            {key:'tpl.preset_balanced', pl1:65, pl2:85},
            {key:'tpl.preset_performance', pl1:95, pl2:125},
            {key:'tpl.preset_unlimited', pl1:999, pl2:999},
          ].map(p => (
            <button key={p.key} className="btn btn-ghost btn-sm" onClick={() => { setPl1(p.pl1); setPl2(p.pl2) }}>
              {t('tpl.preset_btn', {name: t(p.key), pl1: p.pl1})}
            </button>
          ))}
        </div>

        <div style={{marginTop:10, padding:8, background:'var(--bg-chip)', borderRadius:'var(--radius-xs)', fontSize:12, color:'var(--text-muted)'}}>
          {t('tpl.info')}
        </div>
      </div>
    </div>
  )
}
