import { useEffect, useState } from 'react'
import * as api from '../../types'
import { useAppStore } from '../../stores/appStore'

export default function PowerPlansPage() {
  const { showToast } = useAppStore()
  const [plans, setPlans] = useState<api.PowerPlan[]>([])
  const [details, setDetails] = useState<api.PowerSchemeDetails | null>(null)
  const [selectedGuid, setSelectedGuid] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [baseGuid, setBaseGuid] = useState('')

  useEffect(() => { loadPlans() }, [])

  const loadPlans = async () => {
    const p = await api.getPowerPlans()
    setPlans(p)
    const active = p.find(x => x.is_active)
    if (active) {
      setSelectedGuid(active.guid)
      loadDetails(active.guid)
    }
  }

  const loadDetails = async (guid: string) => {
    const d = await api.getPowerSchemeDetails(guid)
    setDetails(d)
  }

  const handleSwitch = async (plan: api.PowerPlan) => {
    await api.setActivePowerPlan(plan.guid)
    showToast(`已切换到: ${plan.name}`)
    loadPlans()
  }

  const handleCreate = async () => {
    if (!newName.trim() || !baseGuid) return
    await api.createPowerPlan(newName, baseGuid)
    setNewName('')
    showToast('电源计划已创建')
    loadPlans()
  }

  const handleDelete = async (plan: api.PowerPlan) => {
    if (!confirm(`确认删除 "${plan.name}"？`)) return
    await api.deletePowerPlan(plan.guid)
    showToast(`已删除: ${plan.name}`)
    loadPlans()
  }

  const handleSelect = (guid: string) => {
    setSelectedGuid(guid)
    loadDetails(guid)
  }

  return (
    <div className="power-plans-page">
      <h2>电源计划管理</h2>

      <div className="power-content">
        {/* Plans List */}
        <div className="plans-list">
          <h3>所有计划</h3>
          {plans.map(plan => (
            <div
              key={plan.guid}
              className={`plan-item ${plan.is_active ? 'active' : ''} ${selectedGuid === plan.guid ? 'selected' : ''}`}
              onClick={() => handleSelect(plan.guid)}
            >
              <div className="plan-item-info">
                <span className="plan-name">{plan.name}</span>
                {plan.is_active && <span className="plan-badge">激活</span>}
              </div>
              <div className="plan-item-actions">
                {!plan.is_active && (
                  <button className="btn-small" onClick={e => { e.stopPropagation(); handleSwitch(plan) }}>
                    切换
                  </button>
                )}
                {!(plan.is_active || ['a1841308-3541-4fab-bc81-f71556f20b4a', '381b4222-f694-41f0-9685-ff5bb260df2e', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'].includes(plan.guid)) && (
                  <button className="btn-small btn-danger" onClick={e => { e.stopPropagation(); handleDelete(plan) }}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Create New */}
          <div className="create-plan-form">
            <h3>创建新计划</h3>
            <input
              placeholder="新计划名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select value={baseGuid} onChange={e => setBaseGuid(e.target.value)}>
              <option value="">选择基础模板</option>
              {plans.map(p => (
                <option key={p.guid} value={p.guid}>{p.name}</option>
              ))}
            </select>
            <button
              className="btn-primary"
              disabled={!newName.trim() || !baseGuid}
              onClick={handleCreate}
            >
              创建
            </button>
          </div>
        </div>

        {/* Plan Details */}
        <div className="plan-details">
          <h3>计划详情</h3>
          {details ? (
            <div className="detail-grid">
              <DetailItem label="GUID" value={details.scheme_guid.substring(0, 8) + '...'} />
              <DetailItem label="Min CPU" value={details.processor.min_processor_state != null ? `${details.processor.min_processor_state}%` : '—'} />
              <DetailItem label="Max CPU" value={details.processor.max_processor_state != null ? `${details.processor.max_processor_state}%` : '—'} />
              <DetailItem
                label="散热策略"
                value={
                  details.processor.system_cooling_policy === 0 ? '被动' :
                    details.processor.system_cooling_policy === 1 ? '主动' : '—'
                }
              />
              <DetailItem
                label="Boost 模式"
                value={
                  details.processor.processor_boost_mode === 0 ? 'Disabled' :
                    details.processor.processor_boost_mode === 1 ? 'Enabled' :
                      details.processor.processor_boost_mode === 2 ? 'Efficient' :
                        details.processor.processor_boost_mode === 3 ? 'Aggressive' : '—'
                }
              />
            </div>
          ) : (
            <p className="no-data">选择一个电源计划查看详细信息</p>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
