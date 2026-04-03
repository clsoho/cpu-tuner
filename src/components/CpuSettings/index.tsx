import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { api, isTauri } from '../../lib/tauri';
import { Sliders, Zap, Cpu, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export function Settings() {
  const { cpuInfo } = useAppStore();
  const [activeGuid, setActiveGuid] = useState<string | null>(null);

  const [minState, setMinState] = useState(5);
  const [maxState, setMaxState] = useState(100);
  const [coolingPolicy, setCoolingPolicy] = useState(1);
  const [boostMode, setBoostMode] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!isTauri()) return;
    setLoading(true);
    try {
      const active = await api.getActivePowerPlan();
      setActiveGuid(active.guid);
      const s = await api.getProcessorPowerSettings(active.guid);
      setMinState(s.min_processor_state ?? 5);
      setMaxState(s.max_processor_state ?? 100);
      setCoolingPolicy(s.system_cooling_policy ?? 1);
      setBoostMode(s.processor_boost_mode ?? 2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!activeGuid) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.setProcessorPowerSettings(activeGuid, {
        min_processor_state: minState,
        max_processor_state: maxState,
        system_cooling_policy: coolingPolicy,
        processor_boost_mode: boostMode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('保存失败: ' + String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw size={24} className="text-tuner-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-content-primary">CPU 参数调整</h2>
        <p className="text-xs text-content-tertiary mt-1">
          调整当前活动电源计划的处理器参数
          {cpuInfo && <span> · {cpuInfo.name}</span>}
        </p>
      </div>

      {/* Settings Card */}
      <div className="bg-surface-card rounded-2xl border border-edge p-6 space-y-6">
        {/* Min Processor State */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-content-primary">最小处理器状态</h3>
              <p className="text-xs text-content-tertiary mt-0.5">
                处理器空闲时的最低频率百分比。设为 5% 可让 CPU 降到最低节能频率。
              </p>
            </div>
            <span className="text-lg font-bold text-tuner-400 font-mono min-w-[3.5rem] text-right">{minState}%</span>
          </div>
          <input type="range" min={0} max={100} value={minState}
            onChange={e => setMinState(Number(e.target.value))} className="w-full" />
          <div className="flex gap-2">
            {[5, 10, 25, 50].map(v => (
              <button key={v} onClick={() => setMinState(v)}
                className={clsx('px-2 py-1 rounded text-[11px] font-mono border transition',
                  minState === v ? 'bg-tuner-500/10 border-tuner-500 text-tuner-400' : 'border-edge text-content-tertiary hover:border-content-tertiary'
                )}>{v}%</button>
            ))}
          </div>
        </div>

        <div className="border-t border-edge" />

        {/* Max Processor State */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-content-primary">最大处理器状态</h3>
              <p className="text-xs text-content-tertiary mt-0.5">
                限制 CPU 最高频率。<strong>设为 99% 可禁用 Turbo Boost</strong>，避免频率飙升发热。
              </p>
            </div>
            <span className="text-lg font-bold text-green-400 font-mono min-w-[3.5rem] text-right">{maxState}%</span>
          </div>
          <input type="range" min={0} max={100} value={maxState}
            onChange={e => setMaxState(Number(e.target.value))} className="w-full" />
          <div className="flex gap-2">
            {[
              { v: 50, l: '节能' }, { v: 75, l: '保守' }, { v: 99, l: '禁 Turbo' }, { v: 100, l: '满血' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setMaxState(opt.v)}
                className={clsx('px-2 py-1 rounded text-[11px] border transition',
                  maxState === opt.v ? 'bg-green-500/10 border-green-500 text-green-400' : 'border-edge text-content-tertiary hover:border-content-tertiary'
                )}>{opt.l} ({opt.v}%)</button>
            ))}
          </div>
        </div>

        <div className="border-t border-edge" />

        {/* Cooling Policy */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-content-primary">系统散热策略</h3>
            <p className="text-xs text-content-tertiary mt-0.5">
              温度过高时的处理方式。
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { v: 0, l: '被动', desc: '先降频再加速风扇' },
              { v: 1, l: '主动', desc: '先加速风扇再降频' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setCoolingPolicy(opt.v)}
                className={clsx('flex-1 p-3 rounded-xl border text-left transition',
                  coolingPolicy === opt.v
                    ? 'bg-tuner-500/10 border-tuner-500'
                    : 'border-edge hover:border-content-tertiary'
                )}>
                <div className="text-sm font-medium text-content-primary">{opt.l}</div>
                <div className="text-[11px] text-content-tertiary mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-edge" />

        {/* Boost Mode */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-content-primary">处理器性能提升模式</h3>
            <p className="text-xs text-content-tertiary mt-0.5">
              控制 Intel Turbo Boost / AMD Precision Boost 行为
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { v: 0, l: '禁用', desc: '锁定基础频率', color: 'blue' },
              { v: 1, l: '启用', desc: '标准 Turbo 行为', color: 'green' },
              { v: 2, l: '主动', desc: '积极加速', color: 'amber' },
              { v: 4, l: '高效启用', desc: '平衡性能与功耗', color: 'purple' },
            ].map(opt => (
              <button key={opt.v} onClick={() => setBoostMode(opt.v)}
                className={clsx('p-3 rounded-xl border text-center transition',
                  boostMode === opt.v
                    ? `bg-${opt.color}-500/10 border-${opt.color}-500`
                    : 'border-edge hover:border-content-tertiary'
                )}>
                <div className="text-sm font-medium text-content-primary">{opt.l}</div>
                <div className="text-[11px] text-content-tertiary mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <button onClick={fetchSettings}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-content-secondary hover:bg-surface-card border border-edge transition">
          <RefreshCw size={14} /> 重置
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-400">✓ 已保存并生效</span>}
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-tuner-500 hover:bg-tuner-600 text-white transition disabled:opacity-50">
            {saving ? '保存中...' : '应用设置'}
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <h3 className="text-xs font-semibold text-content-secondary mb-3">⚡ 快捷预设</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: '节能模式', desc: '低噪音长续航', icon: '🔋', min: 5, max: 50, cooling: 0, boost: 0 },
            { name: '平衡模式', desc: '日常使用推荐', icon: '⚖️', min: 5, max: 100, cooling: 1, boost: 1 },
            { name: '极致性能', desc: '全核最高频率', icon: '🚀', min: 100, max: 100, cooling: 1, boost: 2 },
          ].map(preset => (
            <button key={preset.name} onClick={() => {
              setMinState(preset.min);
              setMaxState(preset.max);
              setCoolingPolicy(preset.cooling);
              setBoostMode(preset.boost);
            }}
              className="p-3 rounded-xl border border-edge hover:border-tuner-500/30 hover:bg-surface-card-hover text-left transition">
              <div className="flex items-center gap-2">
                <span className="text-lg">{preset.icon}</span>
                <div>
                  <div className="text-sm font-medium text-content-primary">{preset.name}</div>
                  <div className="text-[11px] text-content-tertiary">{preset.desc}</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-content-tertiary font-mono">
                最小 {preset.min}% · 最大 {preset.max}% · Boost {preset.boost === 0 ? '关' : preset.boost === 2 ? '激进' : '开'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
