import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { api, PowerPlan, isTauri } from '../../lib/tauri';
import { Zap, Check, Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import clsx from 'clsx';

export function PowerPlans() {
  const {
    powerPlans, setPowerPlans,
    activePlanGuid, setActivePlanGuid,
    currentSettings, setCurrentSettings,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [showSettings, setShowSettings] = useState<string | null>(null);

  // Settings form state
  const [minState, setMinState] = useState(5);
  const [maxState, setMaxState] = useState(100);
  const [coolingPolicy, setCoolingPolicy] = useState(1);
  const [boostMode, setBoostMode] = useState(2);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!isTauri()) return;
    setLoading(true);
    try {
      const plans = await api.getPowerPlans();
      setPowerPlans(plans);
      const active = plans.find(p => p.is_active);
      if (active) setActivePlanGuid(active.guid);
    } catch (e) {
      console.error('获取电源计划失败:', e);
    } finally {
      setLoading(false);
    }
  }, [setPowerPlans, setActivePlanGuid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSwitch = async (guid: string) => {
    setSwitching(guid);
    try {
      await api.setActivePowerPlan(guid);
      setActivePlanGuid(guid);
      await fetchData();
    } catch (e) {
      console.error('切换失败:', e);
    } finally {
      setSwitching(null);
    }
  };

  const handleCreate = async () => {
    if (!newPlanName.trim() || !activePlanGuid) return;
    try {
      await api.createPowerPlan(newPlanName.trim(), activePlanGuid);
      setNewPlanName('');
      setShowCreate(false);
      await fetchData();
    } catch (e) {
      console.error('创建失败:', e);
    }
  };

  const handleDelete = async (guid: string) => {
    if (!confirm('确定要删除此电源计划吗？')) return;
    try {
      await api.deletePowerPlan(guid);
      await fetchData();
    } catch (e) {
      console.error('删除失败:', e);
      alert('删除失败: ' + String(e));
    }
  };

  const handleOpenSettings = async (schemeGuid: string) => {
    setShowSettings(schemeGuid);
    try {
      const settings = await api.getProcessorPowerSettings(schemeGuid);
      setCurrentSettings(settings);
      setMinState(settings.min_processor_state ?? 5);
      setMaxState(settings.max_processor_state ?? 100);
      setCoolingPolicy(settings.system_cooling_policy ?? 1);
      setBoostMode(settings.processor_boost_mode ?? 2);
    } catch (e) {
      console.error('获取设置失败:', e);
    }
  };

  const handleSaveSettings = async () => {
    if (!showSettings) return;
    setSaving(true);
    try {
      await api.setProcessorPowerSettings(showSettings, {
        min_processor_state: minState,
        max_processor_state: maxState,
        system_cooling_policy: coolingPolicy,
        processor_boost_mode: boostMode,
      });
      setShowSettings(null);
    } catch (e) {
      console.error('保存失败:', e);
      alert('保存失败: ' + String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2 space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-content-primary">电源计划</h2>
          <p className="text-xs text-content-tertiary mt-1">管理 Windows 电源方案，控制 CPU 性能模式</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData}
            className="p-2 rounded-lg hover:bg-surface-card border border-edge text-content-secondary hover:text-content-primary transition">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-tuner-500 hover:bg-tuner-600 text-white text-sm font-medium transition">
            <Plus size={14} /> 新建计划
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-card rounded-2xl border border-edge p-5 space-y-4">
          <h3 className="text-sm font-semibold text-content-primary">新建电源计划</h3>
          <input
            type="text"
            placeholder="计划名称 (例如: 游戏模式)"
            value={newPlanName}
            onChange={e => setNewPlanName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-input border border-edge text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-tuner-500"
          />
          <p className="text-xs text-content-tertiary">将基于当前活动计划创建副本</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg text-sm text-content-secondary hover:bg-surface-card border border-edge transition">取消</button>
            <button onClick={handleCreate} disabled={!newPlanName.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-tuner-500 hover:bg-tuner-600 text-white transition disabled:opacity-50">创建</button>
          </div>
        </motion.div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface-card rounded-2xl border border-tuner-500/30 p-5 space-y-5">
          <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <Settings size={16} /> 处理器电源设置
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Min State */}
            <div className="space-y-2">
              <label className="flex justify-between text-xs text-content-secondary">
                <span>最小处理器状态</span>
                <span className="text-tuner-400 font-mono">{minState}%</span>
              </label>
              <input type="range" min={0} max={100} value={minState}
                onChange={e => setMinState(Number(e.target.value))}
                className="w-full" />
            </div>

            {/* Max State */}
            <div className="space-y-2">
              <label className="flex justify-between text-xs text-content-secondary">
                <span>最大处理器状态</span>
                <span className="text-tuner-400 font-mono">{maxState}%</span>
              </label>
              <input type="range" min={0} max={100} value={maxState}
                onChange={e => setMaxState(Number(e.target.value))}
                className="w-full" />
              <p className="text-[10px] text-content-tertiary">限制最大状态可降低 CPU 最高频率（如设为 99% 禁用 Turbo）</p>
            </div>

            {/* Cooling Policy */}
            <div className="space-y-2">
              <label className="text-xs text-content-secondary">系统散热策略</label>
              <div className="flex gap-2">
                {[{ v: 0, l: '被动' }, { v: 1, l: '主动' }].map(opt => (
                  <button key={opt.v}
                    onClick={() => setCoolingPolicy(opt.v)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                      coolingPolicy === opt.v
                        ? 'bg-tuner-500/10 border-tuner-500 text-tuner-400'
                        : 'border-edge text-content-secondary hover:border-content-tertiary'
                    )}>{opt.l}</button>
                ))}
              </div>
            </div>

            {/* Boost Mode */}
            <div className="space-y-2">
              <label className="text-xs text-content-secondary">处理器性能提升模式</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 0, l: '禁用' }, { v: 1, l: '启用' }, { v: 2, l: '主动' }, { v: 4, l: '高效' },
                ].map(opt => (
                  <button key={opt.v}
                    onClick={() => setBoostMode(opt.v)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                      boostMode === opt.v
                        ? 'bg-tuner-500/10 border-tuner-500 text-tuner-400'
                        : 'border-edge text-content-secondary hover:border-content-tertiary'
                    )}>{opt.l}</button>
                ))}
              </div>
              <p className="text-[10px] text-content-tertiary">控制 CPU Turbo Boost / Precision Boost 行为</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowSettings(null)}
              className="px-3 py-1.5 rounded-lg text-sm text-content-secondary hover:bg-surface-card border border-edge transition">取消</button>
            <button onClick={handleSaveSettings} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-tuner-500 hover:bg-tuner-600 text-white transition disabled:opacity-50">
              {saving ? '保存中...' : '应用设置'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Power Plans List */}
      <div className="space-y-3">
        {powerPlans.map((plan) => (
          <motion.div
            key={plan.guid}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'bg-surface-card rounded-2xl border p-5 flex items-center justify-between transition-all',
              plan.is_active ? 'border-tuner-500/40 shadow-[0_0_20px_rgba(59,130,246,0.06)]' : 'border-edge hover:border-edge-secondary'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                plan.is_active ? 'bg-tuner-500/20' : 'bg-surface-elevated'
              )}>
                <Zap size={20} className={plan.is_active ? 'text-tuner-400' : 'text-content-tertiary'} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-content-primary">{plan.name}</h3>
                  {plan.is_active && (
                    <span className="px-2 py-0.5 rounded-full bg-tuner-500/10 text-tuner-400 text-[10px] font-medium">
                      <Check size={10} className="inline mr-0.5" /> 活动
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-content-tertiary font-mono mt-0.5">{plan.guid}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleOpenSettings(plan.guid)}
                className="p-2 rounded-lg hover:bg-surface-elevated text-content-tertiary hover:text-content-primary transition"
                title="参数设置">
                <Settings size={16} />
              </button>
              {!plan.is_active && (
                <>
                  <button onClick={() => handleSwitch(plan.guid)} disabled={switching === plan.guid}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-tuner-500 hover:bg-tuner-600 text-white transition disabled:opacity-50">
                    {switching === plan.guid ? '切换中...' : '切换'}
                  </button>
                  <button onClick={() => handleDelete(plan.guid)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-content-tertiary hover:text-accent-red transition"
                    title="删除">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <h3 className="text-xs font-semibold text-content-secondary mb-3">💡 使用提示</h3>
        <ul className="space-y-2 text-xs text-content-tertiary">
          <li>• <strong>最大处理器状态 ≤ 99%</strong> 可禁用 Intel Turbo Boost / AMD Precision Boost</li>
          <li>• <strong>被动散热</strong> 优先降频，<strong>主动散热</strong> 优先加速风扇</li>
          <li>• 建议创建"省电"、"平衡"、"性能"三种模式以便快速切换</li>
          <li>• 参数修改后会自动激活当前方案使其生效</li>
        </ul>
      </div>
    </div>
  );
}
