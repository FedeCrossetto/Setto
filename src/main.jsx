import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ActiveSessionProvider } from './contexts/ActiveSessionContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActiveSessionProvider>
          <App />
        </ActiveSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
