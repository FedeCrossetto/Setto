import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'

const Home           = lazy(() => import('./pages/Home'))
const Workout        = lazy(() => import('./pages/Workout'))
const WorkoutSession = lazy(() => import('./pages/WorkoutSession'))
const Anthropometry  = lazy(() => import('./pages/Anthropometry'))
const Nutrition      = lazy(() => import('./pages/Nutrition'))
const Progress       = lazy(() => import('./pages/Progress'))
const Profile        = lazy(() => import('./pages/Profile'))
const Login          = lazy(() => import('./pages/Login'))

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

const Spinner = () => (
  <div className="min-h-screen bg-bg flex items-center justify-center">
    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/session/:id" element={<WorkoutSession />} />
        <Route path="/anthropometry" element={<Anthropometry />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
