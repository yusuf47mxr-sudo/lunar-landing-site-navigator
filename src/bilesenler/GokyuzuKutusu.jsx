// Depoya bağlı gökyüzü görünümü: seçili alan ve t için GokyuzuGorunumu'nu
// besler, son 48 saatin izlerini keser, yükleme/hata durumunu ve özel
// noktadaki tam uyarı cümlesini gösterir. Bütün sayfalar bunu kullanır.
// gecisli: üstte "Gökyüzü" başlığı ve Panorama / Kubbe / 3B düğmesi.
//
// 3B (uc/UcBoyut: Ay küresi + yerel sahne) React.lazy ile ayrı parçadır: 3B seçilmedikçe three.js
// indirilmez; inerken Iskelet görünür. WebGL yoksa ya da sahne hata verirse
// kutu kendiliğinden panoramaya döner ve küçük bir not gösterir.
// varsayilan: ilk görünüm ('3b' Temel, 'otomatik' Orta/İleri).

import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { OZEL_NOKTA_UYARISI } from '../core/ozelNokta.js'
import { useAnlikDurum, useBolgeler, useGorunurluk } from '../durum/store.js'
import GokyuzuGorunumu, { kubbeMi } from './GokyuzuGorunumu.jsx'
import Secenekler from './Secenekler.jsx'
import Iskelet from './uc/Iskelet.jsx'

const UcBoyut = lazy(() => import('./uc/UcBoyut.jsx'))

const GORUNUM_SECENEKLERI = [
  { deger: 'panorama', etiket: 'Panorama' },
  { deger: 'kubbe', etiket: 'Kubbe' },
  { deger: '3b', etiket: '3B' },
]

export const IZ_SAAT = 48

/** Son `saat` saatin [az, alt] çiftleri, eskiden yeniye (t dahil). */
export function izKes(azDizi, altDizi, t, saat, dt) {
  const bas = Math.max(0, t - Math.round(saat / dt))
  const iz = []
  for (let k = bas; k <= t; k++) iz.push([azDizi[k], altDizi[k]])
  return iz
}

/**
 * @param {'otomatik'|'panorama'|'kubbe'|'3b'} [props.varsayilan]  ilk görünüm
 * @param {boolean} [props.gecisli]  Panorama / Kubbe / 3B düğmesini göster
 * @param {string} [props.className]  çerçevenin yüksekliği (ör. 'h-[380px]')
 */
export default function GokyuzuKutusu({ varsayilan = 'otomatik', gecisli = false, className = 'h-[380px]' }) {
  const anlik = useAnlikDurum()
  const { alan } = anlik
  const { f, c } = useGorunurluk()
  const { bolgeler } = useBolgeler()

  // Görünüm kipi: varsayılan (Temel'de 3B; diğerlerinde otomatik: kutup → panorama,
  // değilse kubbe). Elle seçim, kutup ↔ kutup dışı geçişinde otomatiğe döner.
  const [secim, setSecim] = useState(null) // { kutup, gorunum } veya null
  const [ucBoyutHata, setUcBoyutHata] = useState(null)
  const istenen = secim && secim.kutup === anlik.kutup ? secim.gorunum : varsayilan
  const gorunum = istenen === '3b' && ucBoyutHata ? 'panorama' : istenen
  const ucBoyut = gorunum === '3b'

  const onHata = useCallback((hata) => setUcBoyutHata(hata ?? new Error('3B açılamadı')), [])

  const sunTrail = useMemo(
    () => (alan ? izKes(alan.sun_az, alan.sun_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )
  const earthTrail = useMemo(
    () => (alan ? izKes(alan.earth_az, alan.earth_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )

  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : undefined
  const aciklama = kayit?.aciklama
  const hazir = alan && anlik.horizon && f && c

  return (
    <>
      {gecisli && (
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-metin-solgun">Gökyüzü</h2>
          <Secenekler
            secenekler={GORUNUM_SECENEKLERI}
            deger={ucBoyut ? '3b' : kubbeMi(gorunum, anlik.kutup) ? 'kubbe' : 'panorama'}
            onSec={(g) => {
              if (g === '3b') setUcBoyutHata(null)
              setSecim({ kutup: anlik.kutup, gorunum: g })
            }}
            etiket="Gökyüzü görünümü"
            kucuk
          />
        </div>
      )}
      <div className={`grid overflow-hidden rounded-2xl border border-cizgi ${className}`}>
        {anlik.hata ? (
          <p className="p-6 text-uyari">Veri yüklenemedi: {String(anlik.hata.message ?? anlik.hata)}</p>
        ) : ucBoyut ? (
          // 3B, alan verisi yüklenirken de bağlı kalır (seviye ve kamera korunsun);
          // yerel sahne yükleme sırasında kendi iskeletini gösterir.
          <Suspense fallback={<Iskelet />}>
            <UcBoyut anlik={anlik} f={hazir ? f[anlik.t] : 0} c={hazir ? c[anlik.t] : 0} aciklama={aciklama} onHata={onHata} />
          </Suspense>
        ) : !hazir ? (
          <p className="self-center justify-self-center text-metin-solgun">Yükleniyor…</p>
        ) : (
          <GokyuzuGorunumu
            horizon={anlik.horizon}
            sunAlt={anlik.sunAlt}
            sunAz={anlik.sunAz}
            earthAlt={anlik.earthAlt}
            earthAz={anlik.earthAz}
            epsilon={anlik.epsilon}
            kutup={anlik.kutup}
            sunTrail={sunTrail}
            earthTrail={earthTrail}
            yaklasik={anlik.yaklasik}
            gorunum={gorunum}
            merkezAz={anlik.merkezAz}
          />
        )}
      </div>
      {istenen === '3b' && ucBoyutHata && (
        <p className="mt-2 text-xs text-metin-solgun" data-3b-not="">
          3B görünüm açılamadı ({ucBoyutHata.message}); panorama gösteriliyor.
        </p>
      )}
      {/* Kutup dışı alanlarda ufuk küresel DEM'e dayanır (SLDEM2015 ≈ 118 m; Chandrayaan-3 LOLA ≈ 237 m) */}
      {kayit?.arazi === 'terrain_global' && (
        <p className="mt-2 text-xs tracking-wide text-metin-solgun/80" data-arazi-notu="">
          Arazi ~{kayit.arazi_cozunurluk_m ?? 118} m çözünürlükte.
        </p>
      )}
      {anlik.yaklasik && <p className="mt-3 text-sm text-uyari">{OZEL_NOKTA_UYARISI}</p>}
    </>
  )
}
