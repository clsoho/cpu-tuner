import { useEffect, useState } from 'react'
import * as api from '../../types'
import { useAppStore } from '../../stores/appStore'

const BUILTIN = ['a1841308-3541-4fab-bc81-f71556f20b4a', '381b4222-f694-41f0-9685-ff5bb260df2e', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c']

export default function PowerPlans() {
  const { showToast } = useAppStore()
  const [plans, setPlans] = useState<api.PowerPlan[]>([])
  const [details, setDetails] = useState<api.PowerSchemeDetails | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [baseGuid, setBaseGuid] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    const p = await api.getPowerPlans()
    setPlans(p)
    const a = p.find(x => x.is_active)
    if (a) { setSelected(a.guid); loadDetails(a.guid) }
  }

  const loadDetails = async (g: string) => { setDetails(await api.getPowerSchemeDetails(g)) }

  const handleSwitch = async (p: api.PowerPlan) => {
    await api.setActivePowerPlan(p.guid)
    load()
  }

  const handleCreate = async () => {
    if (!newName.trim() || !baseGuid) return
    await api.createPowerPlan(newName, baseGuid)
    setNewName('')
    load()
  }

  const handleDelete = async (p: api.PowerPlan) => {
    if (p.is_active || BUILTIN.includes(p.guid)) return
    await api.deletePowerPlan(p.guid)
    load()
  }

  return (
    <div>
      <h2 style={{margin:'0 0 8px', fontSize:15}}>电源计划</h2>
      <div className="pp-layout">
        <div className="card">
          <div className="card-head"><span className="card-title">所有计划</span></div>
          <div className="card-body">
            {plans.map(p => (
              <div key={p.guid} className={`plan-item ${p.is_active ? 'active' : ''} ${selected === p.guid ? 'selected' : ''}`} onClick={() => { setSelected(p.guid); loadDetails(p.guid) }}>
                <div style={{display:'flex', alignItems:'center', gap:6}}>
                  <span className="plan-name">{p.name}</span>
                  {p.is_active && <span className="badge-active">活跃</span>}
                </div>
                <div style={{display:'flex', gap:4}}>
                  {!p.is_active && <button className="btn btn-primary btn-sm" onClick={e => {e.stopPropagation(); handleSwitch(p)}}>切换</button>}
                  {!p.is_active && !BUILTIN.includes(p.guid) && <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={e => {e.stopPropagation(); handleDelete(p)}}>✕</button>}
                </div>
              </div>
            ))}
            {/* Create */}
            <div style={{marginTop:10, paddingTop:10, borderTop:'1px solid var(--border-subtle)'}}>
              <div style={{fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6}}>新建计划</div>
              <div style={{display:'flex', gap:4}}>
                <input style={{flex:1, padding:'5px 8px', background:'var(--bg-chip)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xs)', color:'var(--text-primary)', outline:'none', fontSize:12}} placeholder="名称" value={newName} onChange={e => setNewName(e.target.value)} />
                <select style={{flex:1, padding:'5px 6px', background:'var(--bg-chip)', border:'1px solid var(--border-card)', borderRadius:'var(--radius-xs)', color:'var(--text-primary)', fontSize:12}} value={baseGuid} onChange={e => setBaseGuid(e.target.value)}>
                  <option value="">选择模板</option>
                  {plans.map(p => <option key={p.guid} value={p.guid}>{p.name}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" disabled={!newName.trim() || !baseGuid} onClick={handleCreate}>创建</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="card-title">详情</span></div>
          <div className="card-body">
            {details ? (
              <div className="detail-grid">
                <DI label="GUID" v={details.scheme_guid.substring(0,8)+'…'} />
                <DI label="Min CPU" v={details.processor.min_processor_state != null ? `${details.processor.min_processor_state}%` : '—'} />
                <DI label="Max CPU" v={details.processor.max_processor_state != null ? `${details.processor.max_processor_state}%` : '—'} />
                <DI label="散热" v={details.processor.system_cooling_policy === 0 ? '被动' : details.processor.system_cooling_policy === 1 ? '主动' : '—'} />
                <DI label="Boost" v={details.processor.processor_boost_mode === 0 ? 'Disabled' : details.processor.processor_boost_mode === 1 ? 'Enabled' : details.processor.processor_boost_mode === 2 ? 'Efficient' : details.processor.processor_boost_mode === 3 ? 'Aggressive' : '—'} />
              </div>
            ) : <p style={{textAlign:'center', color:'var(--text-muted)'}}>选择计划查看详情</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
function DI({label, v}: {label:string; v:string}) { return <div className="detail-item"><span className="detail-lbl">{label}</span><span className="detail-val">{v}</span></div> }
