import { useDurum } from './durum/store.js'
import Ileri from './sayfalar/Ileri.jsx'
import Orta from './sayfalar/Orta.jsx'
import Temel from './sayfalar/Temel.jsx'

// Sayfa store.mod'a göre seçilir; mod ModDegistirici ile değişir.
// Seçili alan, zaman ve parametreler depoda durduğu için mod değişince korunur.
// Giriş ekranı Adım 12'de.
const SAYFALAR = { temel: Temel, orta: Orta, ileri: Ileri }

export default function App() {
  const mod = useDurum((s) => s.mod)
  const Sayfa = SAYFALAR[mod] ?? Temel
  return <Sayfa />
}
