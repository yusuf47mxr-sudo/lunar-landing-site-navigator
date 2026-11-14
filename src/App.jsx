import Temel from './sayfalar/Temel.jsx'
import TestZaman from './sayfalar/TestZaman.jsx'

// Şimdilik doğrudan Temel sayfa. Giriş ekranı ve mod geçişi Adım 12'de.
// GEÇİCİ: ?test=zaman → zaman çizelgesi test sayfası
const testSayfasi = new URLSearchParams(window.location.search).get('test')

export default function App() {
  if (testSayfasi === 'zaman') return <TestZaman />
  return <Temel />
}
