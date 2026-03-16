export default function Header({
  title,
  children,
  className = '',
  variant = 'default',
  avatar,
  greetingLabel,
  greetingName,
}) {
  const isHome = variant === 'home'

  return (
    <header
      className={`
        sticky top-0 z-40 safe-top
        bg-bg/95 backdrop-blur-md
        border-b border-border
        shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06)]
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-3 min-h-[48px] px-4 py-2">
        {isHome ? (
          <>
            {/* Avatar (luego vendrá de BD) */}
            <div className="w-9 h-9 rounded-full border-2 border-primary bg-card overflow-hidden shrink-0 flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-text-secondary text-xl">person</span>
              )}
            </div>
            {/* Saludo centrado */}
            <div className="flex-1 min-w-0 flex flex-col items-start justify-center px-2">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {greetingLabel}
              </span>
              <span className="text-lg font-bold text-text truncate leading-tight">
                {greetingName}
              </span>
            </div>
            {/* Acción derecha (notificaciones, etc.) */}
            <div className="flex items-center gap-2 shrink-0">
              {children}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-text truncate min-w-0 flex-1">
              {title}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {children}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
