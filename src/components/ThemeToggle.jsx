import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const [theme, toggleTheme] = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? (
        <span className="material-symbols-outlined text-lg">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-lg">dark_mode</span>
      )}
    </button>
  )
}
