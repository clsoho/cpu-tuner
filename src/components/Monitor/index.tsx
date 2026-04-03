import { useAppStore } from '../../stores/appStore';
import { Activity } from 'lucide-react';

function MiniChart({ data, color, max }: { data: number[]; color: string; max?: number }) {
  if (data.length < 2) return null;
  const h = 60;
  const w = 240;
  const yMax = max ?? Math.max(...data, 1);

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / yMax) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
      {/* Grid lines */}
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--border-primary)" strokeWidth="0.5" strokeDasharray="4" />
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
      {/* Gradient area */}
      <polygon
        fill={`${color}15`}
        points={`0,${h} ${points} ${w},${h}`}
      />
    </svg>
  );
}

export function Monitor() {
  const { metrics, metricsHistory } = useAppStore();

  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity size={32} className="text-tuner-400 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-content-tertiary">正在加载监控数据...</p>
        </div>
      </div>
    );
  }

  const cpuHistory = metricsHistory.map(m => m.cpu_usage_total);
  const freqHistory = metricsHistory.map(m => m.cpu_freq_current_mhz);
  const tempHistory = metricsHistory.map(m => m.cpu_temperature_c ?? 0);
  const memHistory = metricsHistory.map(m => m.memory_usage_percent);

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2 space-y-6">
      {/* CPU Usage Chart */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">CPU 使用率</h3>
            <p className="text-xs text-content-tertiary mt-0.5">{metrics.cpu_usage_total.toFixed(1)}% 当前</p>
          </div>
          <span className="text-2xl font-bold text-tuner-400">{metrics.cpu_usage_total.toFixed(0)}%</span>
        </div>
        <MiniChart data={cpuHistory} color="#3b82f6" max={100} />
      </div>

      {/* CPU Frequency Chart */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">CPU 频率</h3>
            <p className="text-xs text-content-tertiary mt-0.5">
              {metrics.cpu_freq_current_mhz.toFixed(0)} MHz
              {metrics.cpu_freq_max_mhz > 0 && ` / ${metrics.cpu_freq_max_mhz.toFixed(0)} MHz 最大`}
            </p>
          </div>
          <span className="text-2xl font-bold text-green-400">{(metrics.cpu_freq_current_mhz / 1000).toFixed(2)} GHz</span>
        </div>
        <MiniChart data={freqHistory} color="#4ade80" max={metrics.cpu_freq_max_mhz || undefined} />
      </div>

      {/* Temperature Chart */}
      {metrics.cpu_temperature_c !== null && (
        <div className="bg-surface-card rounded-2xl border border-edge p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-content-primary">CPU 温度</h3>
              <p className="text-xs text-content-tertiary mt-0.5">
                {metrics.cpu_temperature_c > 80 ? '⚠️ 温度较高' : metrics.cpu_temperature_c > 60 ? '正常负载' : '温度良好'}
              </p>
            </div>
            <span className={`text-2xl font-bold ${metrics.cpu_temperature_c > 80 ? 'text-red-400' : 'text-amber-400'}`}>
              {metrics.cpu_temperature_c}°C
            </span>
          </div>
          <MiniChart data={tempHistory} color={metrics.cpu_temperature_c > 80 ? '#f87171' : '#fbbf24'} max={100} />
        </div>
      )}

      {/* Memory Chart */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">内存使用</h3>
            <p className="text-xs text-content-tertiary mt-0.5">
              {metrics.memory_used_mb} MB / {metrics.memory_total_mb} MB
            </p>
          </div>
          <span className="text-2xl font-bold text-purple-400">{metrics.memory_usage_percent.toFixed(1)}%</span>
        </div>
        <MiniChart data={memHistory} color="#a78bfa" max={100} />
      </div>

      {/* Per-Core Detail Table */}
      {metrics.cpu_cores.length > 0 && (
        <div className="bg-surface-card rounded-2xl border border-edge p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">核心详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-content-tertiary border-b border-edge">
                  <th className="text-left py-2 px-3">核心</th>
                  <th className="text-right py-2 px-3">频率</th>
                  <th className="text-right py-2 px-3">使用率</th>
                  <th className="text-right py-2 px-3 w-32">负载</th>
                </tr>
              </thead>
              <tbody>
                {metrics.cpu_cores.map((core) => (
                  <tr key={core.core_id} className="border-b border-edge/50 hover:bg-surface-card-hover">
                    <td className="py-2 px-3 text-content-primary font-mono">Core {core.core_id}</td>
                    <td className="py-2 px-3 text-right text-content-secondary font-mono">
                      {core.frequency_mhz.toFixed(0)} MHz
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-content-primary">
                      {core.usage_percent.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3">
                      <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            core.usage_percent > 80 ? 'bg-red-500' : core.usage_percent > 50 ? 'bg-amber-500' : 'bg-tuner-500'
                          }`}
                          style={{ width: `${Math.min(core.usage_percent, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Points Counter */}
      <p className="text-[10px] text-content-tertiary text-center">
        已采集 {metricsHistory.length} 个数据点 · 每 2 秒刷新
      </p>
    </div>
  );
}
