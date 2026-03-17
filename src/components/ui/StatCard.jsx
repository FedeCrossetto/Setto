import Card from './Card'

export default function StatCard({ icon, label, value, unit, trend, color = 'text-primary' }) {
  return (
    <Card>
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`material-symbols-outlined text-sm ${color} opacity-60`}>{icon}</span>
        <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest leading-none">{label}</p>
      </div>
      <p className={`text-2xl font-black tabular-nums leading-none ${color}`}>
        {value}
        {unit && <span className="text-sm font-medium text-text-secondary ml-1">{unit}</span>}
      </p>
      {trend && (
        <p className={`text-xs font-medium mt-1.5 ${trend > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </p>
      )}
    </Card>
  )
}
