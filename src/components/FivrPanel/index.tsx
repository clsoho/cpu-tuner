import { useState, useEffect } from 'react'
import { useI18n } from '../../stores/i18n'
import * as api from '../../types'

interface OffsetSliderProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
}

function OffsetSlider({ label, value, onChange, min = -250, max = 250 }: OffsetSliderProps) {
  const val = value ?? 0
  return (
    <div className="fivr-row">
      <label>{label}</label>
      <input
        type="range"
        min={min} max={max}
        value={val}
        onChange={e => onChange(+e.target.value === 0 ? null : +e.target.value)}
      />
      <span className="fivr-val" style={{color: val < 0 ? 'var(--green)' : val > 0 ? 'var(--red)' : 'var(--text-secondary)'}}>
        {val > 0 ? '+' : ''}{val} mV
      </span>
    </div>
  )
}

export default function FivrPanel() {
  const { t } = useI18n()
  const [coreOffset, setCoreOffset] = useState<number | null>(null)
  const [cacheOffset, setCacheOffset] = useState<number | null>(null)
  const [gpuOffset, setGpuOffset] = useState<number | null>(null)
  const [saOffset, setSaOffset] = useState<number | null>(null)
  const [coreVolt, setCoreVolt] = useState<number | null>(null)
  const [cacheVolt, setCacheVolt] = useState<number | null>(null)

  useEffect(() => {
    api.getFivrData().then(d => {
      setCoreOffset(d.core_offset_mv)
      setCacheOffset(d.cache_offset_mv)
      setGpuOffset(d.gpu_offset_mv)
      setSaOffset(d.system_agent_offset_mv)
      setCoreVolt(d.core_voltage_mv)
      setCacheVolt(d.cache_voltage_mv)
    }).catch(() => {})
  }, [])

  const handleApply = async (target: string, offset: number | null) => {
    if (offset == null) return
    try { await api.setFivrOffset(target, offset) } catch {}
  }

  return (
    <div>
      <div className="panel" style={{marginBottom:6}}>
        <div className="panel-head">
          <span className="panel-title">{t('fivr.title')}</span>
          <span className="text-xs text-muted">{t('fivr.subtitle')}</span>
        </div>
        <div className="panel-body">
          <div className="fivr-layout">
            {/* Left: Offset sliders */}
            <div className="fivr-section">
              <div className="section-title">{t('fivr.offset')}</div>
              <div className="fivr-slider-group">
                <OffsetSlider label={t('fivr.core')} value={coreOffset} onChange={v => { setCoreOffset(v); handleApply('core', v) }} />
                <OffsetSlider label={t('fivr.cache')} value={cacheOffset} onChange={v => { setCacheOffset(v); handleApply('cache', v) }} />
                <OffsetSlider label={t('fivr.gpu')} value={gpuOffset} onChange={v => { setGpuOffset(v); handleApply('gpu', v) }} />
                <OffsetSlider label={t('fivr.system_agent')} value={saOffset} onChange={v => { setSaOffset(v); handleApply('system_agent', v) }} />
              </div>
              <div className="ts-sep" />
              <div className="section-title">{t('fivr.warnings')}</div>
              <ul style={{margin:0, padding:'0 0 0 16px', fontSize:12, color:'var(--text-muted)'}}>
                <li>{t('fivr.warn1')}</li>
                <li>{t('fivr.warn2')}</li>
                <li>{t('fivr.warn3')}</li>
              </ul>
            </div>

            {/* Right: Read-only monitoring */}
            <div className="fivr-section">
              <div className="section-title">{t('fivr.current_voltage')}</div>
              <div className="fivr-readonly">
                <div className="fivr-ro-item"><span className="fivr-ro-label">{t('fivr.core')}</span><span className="fivr-ro-val">{coreVolt != null ? `${coreVolt} mV` : '—'}</span></div>
                <div className="fivr-ro-item"><span className="fivr-ro-label">{t('fivr.cache')}</span><span className="fivr-ro-val">{cacheVolt != null ? `${cacheVolt} mV` : '—'}</span></div>
              </div>
              <div className="ts-sep" />
              <div className="section-title">{t('fivr.quick_presets')}</div>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {[-150, -100, -80, -50, 0].map(v => (
                  <button key={v} className="btn btn-ghost btn-sm" onClick={() => {
                    setCoreOffset(v); setCacheOffset(v); handleApply('core', v); handleApply('cache', v)
                  }}>
                    {v > 0 ? '+' : ''}{v} mV
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
