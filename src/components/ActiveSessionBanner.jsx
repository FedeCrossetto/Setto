import { useNavigate, useLocation } from 'react-router-dom'
import { useActiveSession } from '../contexts/ActiveSessionContext'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ActiveSessionBanner() {
  const { activeSession, elapsed } = useActiveSession()
  const navigate = useNavigate()
  const location = useLocation()

  if (!activeSession || location.pathname.startsWith('/workout/session')) return null

  return (
    <button
      onClick={() => navigate(`/workout/session/${activeSession.sessionId}`)}
      className="fixed top-2.5 left-3 z-50 flex items-center gap-2 pl-3 pr-3.5 py-2 bg-primary rounded-xl shadow-md shadow-primary/25 active:scale-[0.97] transition-transform"
      style={{ maxWidth: 'calc(100vw - 90px)' }}
    >
      <span className="material-symbols-outlined text-white text-base leading-none">fitness_center</span>
      <span className="font-mono font-bold text-white text-sm tabular-nums leading-none">
        {formatTime(elapsed)}
      </span>
      <span className="text-white/75 text-[11px] font-medium truncate leading-none hidden xs:block">
        {activeSession.routineName}
      </span>
    </button>
  )
}
