import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', icon: 'home', label: 'Inicio' },
  { to: '/workout', icon: 'fitness_center', label: 'Entreno' },
  { to: '/anthropometry', icon: 'monitoring', label: 'Antropo' },
  { to: '/nutrition', icon: 'restaurant', label: 'Nutrición' },
  { to: '/progress', icon: 'photo_camera', label: 'Progreso' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-4 safe-bottom z-50 flex justify-center">
      <div className="flex items-center justify-between h-12 rounded-full bg-surface text-white shadow-xl px-3 min-w-[220px] max-w-xs gap-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                isActive ? 'bg-primary text-black shadow-md' : 'text-gray-400'
              }`
            }
            aria-label={tab.label}
          >
            <span className="material-symbols-outlined text-[22px]">
              {tab.icon}
            </span>
            <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              {tab.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
