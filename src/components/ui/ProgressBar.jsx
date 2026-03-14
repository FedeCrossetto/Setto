export default function ProgressBar({ value, max, color = 'bg-primary', label, showValue = true, className = '' }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs mb-1">
          {label && <span className="text-text-secondary font-medium">{label}</span>}
          {showValue && <span className="text-text-secondary">{value} / {max}</span>}
        </div>
      )}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
