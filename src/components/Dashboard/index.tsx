import { useAppStore } from '../../stores/appStore';
import { Cpu, Thermometer, Gauge, MemoryStick } from 'lucide-react';

function MetricCard({
  title, value, unit, icon, color, sub,
}: {
  title: string; value: string; unit: string;
  icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="bg-surface-card rounded-2xl border border-edge p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-content-tertiary font-medium">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-3xl font-bold text-content-primary">{value}</span>
        <span className="text-sm text-content-tertiary">{unit}</span>
      </div>
      {sub && <span className="text-xs text-content-tertiary">{sub}</span>}
    </div>
  );
}

function UsageBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-content-secondary">
        <span>{label}</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { metrics, cpuInfo } = useAppStore();

  if (!metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-tuner-500/10 flex items-center justify-center mx-auto mb-3">
            <Cpu size={24} className="text-tuner-400 animate-pulse" />
          </div>
          <p className="text-sm text-content-tertiary">正在加载系统数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scroll-container pr-2 space-y-6">
      {/* CPU Info */}
      {cpuInfo && (
        <div className="bg-surface-card rounded-2xl border border-edge p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tuner-500/10 flex items-center justify-center">
              <Cpu size={22} className="text-tuner-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-content-primary">{cpuInfo.name}</h3>
              <p className="text-xs text-content-tertiary">
                {cpuInfo.vendor} · {cpuInfo.cores_physical} 核 {cpuInfo.cores_logical} 线程
                {cpuInfo.base_freq_mhz ? ` · 基础频率 ${(cpuInfo.base_freq_mhz / 1000).toFixed(2)} GHz` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU 使用率"
          value={metrics.cpu_usage_total.toFixed(1)}
          unit="%"
          icon={<Gauge size={16} className="text-white" />}
          color="bg-blue-500/20"
        />
        <MetricCard
          title="CPU 频率"
          value={metrics.cpu_freq_current_mhz.toFixed(0)}
          unit="MHz"
          icon={<Cpu size={16} className="text-white" />}
          color="bg-green-500/20"
          sub={metrics.cpu_freq_max_mhz > 0 ? `最大 ${metrics.cpu_freq_max_mhz.toFixed(0)} MHz` : undefined}
        />
        <MetricCard
          title="CPU 温度"
          value={metrics.cpu_temperature_c !== null ? metrics.cpu_temperature_c.toString() : 'N/A'}
          unit={metrics.cpu_temperature_c !== null ? '°C' : ''}
          icon={<Thermometer size={16} className="text-white" />}
          color={metrics.cpu_temperature_c !== null && metrics.cpu_temperature_c > 80 ? 'bg-red-500/20' : 'bg-amber-500/20'}
        />
        <MetricCard
          title="内存使用"
          value={metrics.memory_usage_percent.toFixed(1)}
          unit="%"
          icon={<MemoryStick size={16} className="text-white" />}
          color="bg-purple-500/20"
          sub={`${metrics.memory_used_mb} / ${metrics.memory_total_mb} MB`}
        />
      </div>

      {/* Core Usage */}
      {metrics.cpu_cores.length > 0 && (
        <div className="bg-surface-card rounded-2xl border border-edge p-5">
          <h3 className="text-sm font-semibold text-content-primary mb-4">核心使用率</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metrics.cpu_cores.map((core) => (
              <UsageBar
                key={core.core_id}
                label={`核心 ${core.core_id} · ${core.frequency_mhz.toFixed(0)} MHz`}
                percent={core.usage_percent}
                color={
                  core.usage_percent > 80
                    ? 'bg-red-500'
                    : core.usage_percent > 50
                    ? 'bg-amber-500'
                    : 'bg-tuner-500'
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Memory Bar */}
      <div className="bg-surface-card rounded-2xl border border-edge p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-4">内存</h3>
        <UsageBar
          label={`已用 ${metrics.memory_used_mb} MB / ${metrics.memory_total_mb} MB`}
          percent={metrics.memory_usage_percent}
          color={metrics.memory_usage_percent > 80 ? 'bg-red-500' : 'bg-purple-500'}
        />
      </div>
    </div>
  );
}
