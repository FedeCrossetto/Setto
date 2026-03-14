export default function Header({ title, children, className = '' }) {
  return (
    <header className={`sticky top-0 z-40 bg-bg/80 backdrop-blur-md px-8 pt-8 pb-6 safe-top ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">{title}</h1>
        {children}
      </div>
    </header>
  )
}
