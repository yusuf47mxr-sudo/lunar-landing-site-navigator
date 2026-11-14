import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { useDurum } from './durum/store.js'

// Geliştirme kolaylığı: konsoldan / test betiklerinden depoya erişim
if (import.meta.env.DEV) window.__durum = useDurum

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
