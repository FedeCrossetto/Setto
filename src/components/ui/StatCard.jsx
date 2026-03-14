import Card from './Card'

export default function StatCard({ icon, label, value, unit, trend, color = 'text-primary' }) {
  return (
    <Card className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 ${color}`}>
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary font-medium">{label}</p>
        <p className="text-lg font-bold leading-tight">
          {value}
          {unit && <span className="text-sm font-medium text-text-secondary ml-0.5">{unit}</span>}
        </p>
        {trend && (
          <p className={`text-xs font-medium ${trend > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </p>
        )}
      </div>
    </Card>
  )
}
