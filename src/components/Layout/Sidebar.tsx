import { useAppStore, PageType } from '../../stores/appStore';
import { LayoutDashboard, Zap, Activity, Settings } from 'lucide-react';
import clsx from 'clsx';

const navItems: { id: PageType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard size={20} /> },
  { id: 'power', label: '电源计划', icon: <Zap size={20} /> },
  { id: 'monitor', label: '性能监控', icon: <Activity size={20} /> },
  { id: 'settings', label: 'CPU 设置', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <aside className="w-60 flex flex-col border-r border-edge" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-edge">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tuner-500 to-tuner-700 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-content-primary">CPU Tuner</h1>
          <p className="text-[10px] text-content-tertiary">性能调优工具</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              currentPage === item.id
                ? 'bg-tuner-500/10 text-tuner-400'
                : 'text-content-secondary hover:text-content-primary hover:bg-surface-card'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-edge">
        <p className="text-[10px] text-content-tertiary text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
