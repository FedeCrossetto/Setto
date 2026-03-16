import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ActiveSessionBanner from './ActiveSessionBanner'

export default function Layout() {
  return (
    <div className="flex flex-col h-full max-w-lg mx-auto relative bg-bg">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
      {/* Fixed overlay — renders on top of everything */}
      <ActiveSessionBanner />
    </div>
  )
}
