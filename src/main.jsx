import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { useDurum } from './durum/store.js'
import { TEST_KANCALARI } from './core/testKancalari.js'

// Geliştirme kolaylığı: konsoldan / test betiklerinden depoya erişim (derlemede yalnız ?test)
if (TEST_KANCALARI) window.__durum = useDurum

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
