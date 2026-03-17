import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function SettoLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 160 100" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#22c55e" />
          <stop offset="35%"  stopColor="#4ade80" stopOpacity="0.95" />
          <stop offset="60%"  stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        {/* Segundo trazo superpuesto para efecto de profundidad */}
        <linearGradient id="logoGrad2" x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.5" />
          <stop offset="50%"  stopColor="#15803d" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Trazo principal — forma de M/pulso */}
      <polyline
        points="12,82 42,18 68,58 92,10 118,54 148,36"
        stroke="url(#logoGrad)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Overlay sutil para profundidad donde los trazos se cruzan */}
      <polyline
        points="12,82 42,18 68,58 92,10 118,54 148,36"
        stroke="url(#logoGrad2)"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      {/* Logo + nombre */}
      <div className="flex flex-col items-center mb-10">
        <div className="mb-4 p-4 rounded-2xl bg-card border border-border">
          <SettoLogo className="w-20 h-14" />
        </div>
        <h1 className="text-3xl font-black text-text tracking-tight">Setto</h1>
        <p className="text-sm text-text-secondary mt-1">Tu compañero de entrenamiento</p>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-sm border border-border p-6">
        <h2 className="text-lg font-bold text-text mb-1">Iniciá sesión</h2>
        <p className="text-xs text-text-secondary mb-6">
          Ingresá con las credenciales que te asignaron
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                person
              </span>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">
                lock
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-bg border border-border rounded-xl text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
              <span className="material-symbols-outlined text-red-500 text-base">error</span>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full py-3.5 bg-primary text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                Ingresando…
              </span>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-text-secondary mt-8 text-center">
        Setto · Seguimiento fitness personalizado
      </p>
    </div>
  )
}
