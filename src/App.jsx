import { Suspense, lazy, useEffect } from 'react'
import { useDurum } from './durum/store.js'

// Sayfa store.mod'a göre seçilir; mod ModDegistirici ile değişir.
// Seçili alan, zaman ve parametreler depoda durduğu için mod değişince korunur.
// Giriş ekranı Adım 12'de.
//
// Her sayfa ayrı parça (chunk) olarak yüklenir: açılışta yalnızca seçili mod
// indirilir. Diğer sayfalar ilk çizimden sonra tarayıcı boştayken önceden
// yüklenir ve bileşen doğrudan saklanır: React.lazy modül hazır olsa bile ilk
// çizimde bir kez askıya alır, önceden yüklenmiş sayfada bu yüzden lazy
// sarmalayıcı yerine hazır bileşen kullanılır; mod değiştirince "Yükleniyor…"
// ekranı görünmez.
const YUKLEYICILER = {
  temel: () => import('./sayfalar/Temel.jsx'),
  orta: () => import('./sayfalar/Orta.jsx'),
  ileri: () => import('./sayfalar/Ileri.jsx'),
}
const SAYFALAR = Object.fromEntries(Object.entries(YUKLEYICILER).map(([mod, yukle]) => [mod, lazy(yukle)]))
const HAZIR = {} // mod → önceden yüklenmiş sayfa bileşeni

const bostayken = (fn) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500)

function Yukleniyor() {
  return (
    <div className="grid min-h-screen place-items-center bg-zemin text-sm tracking-wide text-metin-solgun" aria-busy="true">
      Yükleniyor…
    </div>
  )
}

export default function App() {
  const mod = useDurum((s) => s.mod)
  const anahtar = mod in YUKLEYICILER ? mod : 'temel'
  const Sayfa = HAZIR[anahtar] ?? SAYFALAR[anahtar]

  useEffect(() => {
    bostayken(() =>
      Object.entries(YUKLEYICILER).forEach(([m, yukle]) =>
        yukle().then(
          (modul) => (HAZIR[m] = modul.default),
          () => {}, // ağ hatası: o mod seçilince lazy yeniden dener
        ),
      ),
    )
  }, [])

  return (
    <Suspense fallback={<Yukleniyor />}>
      <Sayfa />
    </Suspense>
  )
}
