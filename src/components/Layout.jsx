import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Chatbot from './Chatbot'

export default function Layout() {
  return (
    <div className="flex flex-col h-full max-w-lg mx-auto relative bg-bg">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <Chatbot />
    </div>
  )
}
