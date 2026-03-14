import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Workout from './pages/Workout'
import WorkoutSession from './pages/WorkoutSession'
import Anthropometry from './pages/Anthropometry'
import Nutrition from './pages/Nutrition'
import Progress from './pages/Progress'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/session/:id" element={<WorkoutSession />} />
        <Route path="/anthropometry" element={<Anthropometry />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/progress" element={<Progress />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
