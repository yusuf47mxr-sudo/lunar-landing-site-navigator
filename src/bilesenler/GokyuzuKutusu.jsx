// Depoya bağlı gökyüzü görünümü: seçili alan ve t için GokyuzuGorunumu'nu
// besler, son 48 saatin izlerini keser, yükleme/hata durumunu ve özel
// noktadaki tam uyarı cümlesini gösterir. Bütün sayfalar bunu kullanır.

import { useMemo } from 'react'
import { OZEL_NOKTA_UYARISI } from '../core/ozelNokta.js'
import { useAnlikDurum } from '../durum/store.js'
import GokyuzuGorunumu from './GokyuzuGorunumu.jsx'

const IZ_SAAT = 48

/** Son `saat` saatin [az, alt] çiftleri, eskiden yeniye (t dahil). */
function izKes(azDizi, altDizi, t, saat, dt) {
  const bas = Math.max(0, t - Math.round(saat / dt))
  const iz = []
  for (let k = bas; k <= t; k++) iz.push([azDizi[k], altDizi[k]])
  return iz
}

/**
 * @param {'otomatik'|'panorama'|'kubbe'} [props.gorunum]
 * @param {string} [props.className]  çerçevenin yüksekliği (ör. 'h-[380px]')
 */
export default function GokyuzuKutusu({ gorunum = 'otomatik', className = 'h-[380px]' }) {
  const anlik = useAnlikDurum()
  const { alan } = anlik

  const sunTrail = useMemo(
    () => (alan ? izKes(alan.sun_az, alan.sun_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )
  const earthTrail = useMemo(
    () => (alan ? izKes(alan.earth_az, alan.earth_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )

  return (
    <>
      <div className={`grid overflow-hidden rounded-2xl border border-cizgi ${className}`}>
        {anlik.hata ? (
          <p className="p-6 text-uyari">Veri yüklenemedi: {String(anlik.hata.message ?? anlik.hata)}</p>
        ) : alan && anlik.horizon ? (
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
        ) : (
          <p className="self-center justify-self-center text-metin-solgun">Yükleniyor…</p>
        )}
      </div>
      {anlik.yaklasik && <p className="mt-3 text-sm text-uyari">{OZEL_NOKTA_UYARISI}</p>}
    </>
  )
}
