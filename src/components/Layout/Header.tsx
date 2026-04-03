import { useAppStore, PageType } from '../../stores/appStore';
import { useAppStore as _store } from '../../stores/appStore';

const pageTitles: Record<PageType, string> = {
  dashboard: '仪表盘',
  power: '电源计划管理',
  monitor: '性能监控',
  settings: 'CPU 设置',
};

export function Header() {
  const { currentPage, metrics } = useAppStore();

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-edge" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      <h2 className="text-base font-semibold text-content-primary">{pageTitles[currentPage]}</h2>
      <div className="flex items-center gap-4 text-xs text-content-tertiary">
        {metrics && (
          <>
            <span>CPU {metrics.cpu_usage_total.toFixed(1)}%</span>
            <span>{metrics.cpu_freq_current_mhz.toFixed(0)} MHz</span>
            {metrics.cpu_temperature_c !== null && (
              <span className={metrics.cpu_temperature_c > 80 ? 'text-accent-red' : ''}>
                {metrics.cpu_temperature_c}°C
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
