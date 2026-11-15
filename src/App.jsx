import { Suspense, lazy, useEffect, useMemo } from 'react'
import { useDil } from './dil/index.js'
import { alanParametresiniCoz, useBolgeler, useDurum } from './durum/store.js'

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
  const { t } = useDil()
  return (
    <div className="grid min-h-screen place-items-center bg-zemin text-sm tracking-wide text-metin-solgun" aria-busy="true">
      {t('uygulama.yukleniyor')}
    </div>
  )
}

export default function App() {
  const mod = useDurum((s) => s.mod)
  const anahtar = mod in YUKLEYICILER ? mod : 'temel'
  // Bileşen kimliği YALNIZ mod değişince seçilir. App başka nedenle (ör. dil)
  // yeniden çizildiğinde HAZIR'a yeni düşmüş sayfaya geçilirse React bunu farklı
  // bileşen sayar ve bütün sayfayı yeniden kurar (3B sahne, tam ekran sıfırlanır).
  const Sayfa = useMemo(() => HAZIR[anahtar] ?? SAYFALAR[anahtar], [anahtar])
  const { dil, t } = useDil()

  // ?alan=<ad> (ör. "haworth", "malapert_massif") → listedeki gerçek ad
  const { bolgeler } = useBolgeler()
  useEffect(() => {
    if (!bolgeler) return
    const { seciliAlan, alanSec } = useDurum.getState()
    const cozulen = alanParametresiniCoz(seciliAlan, bolgeler)
    if (cozulen !== seciliAlan) alanSec(cozulen)
  }, [bolgeler])

  // Sayfa başlığı ve <html lang> dile göre
  useEffect(() => {
    document.documentElement.lang = dil
    document.title = t('uygulama.baslik')
  }, [dil, t])

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
