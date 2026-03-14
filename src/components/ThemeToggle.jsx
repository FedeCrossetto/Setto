import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const [theme, , toggleTheme] = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-full text-primary shrink-0 hover:opacity-80 active:scale-95 transition-all"
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'light' ? (
        <span className="material-symbols-outlined text-xl">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-xl">dark_mode</span>
      )}
    </button>
  )
}
