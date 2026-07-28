import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import AppErrorBoundary from './components/common/AppErrorBoundary'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider><AppErrorBoundary><App /></AppErrorBoundary><Toaster richColors position="top-right" /></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
