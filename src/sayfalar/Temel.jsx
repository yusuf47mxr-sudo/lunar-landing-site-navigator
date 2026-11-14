// GEÇİCİ TEST SAYFASI — Gökyüzü görünümünü denemek için.
// Adım 5'te asıl Temel sayfaya dönüşecek; silmeyin.
//
// Kolay ekran görüntüsü için URL parametreleri:
//   ?alan=Apollo%2011&t=704&oynat=1      ozel=-60,10 → özel koordinat

import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import GokyuzuGorunumu from '../bilesenler/GokyuzuGorunumu.jsx'
import { useAnlikDurum, useDurum } from '../durum/store.js'

const ADIM_SANIYEDE = 30 // oynatırken saniyede kaç zaman adımı (1 adım = 1 saat)
const IZ_SAAT = 48

const TEST_ALANLARI = ['Malapert Massif', 'Apollo 11']

/** Son `saat` saatin [az, alt] çiftleri, eskiden yeniye (t dahil). */
function izKes(azDizi, altDizi, t, saat, dt) {
  const bas = Math.max(0, t - Math.round(saat / dt))
  const iz = []
  for (let k = bas; k <= t; k++) iz.push([azDizi[k], altDizi[k]])
  return iz
}

/** URL'deki test parametrelerini bir kez depoya uygular. */
function useUrlParametreleri() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const s = useDurum.getState()
    if (q.get('alan')) s.alanSec(q.get('alan'))
    if (q.get('ozel')) {
      const [lat, lon] = q.get('ozel').split(',').map(Number)
      if (Number.isFinite(lat) && Number.isFinite(lon)) s.ozelNoktaSec({ lat, lon })
    }
    if (q.get('t')) s.tAyarla(Number(q.get('t')) || 0)
    if (q.get('oynat') === '1' && !s.oynatiliyor) s.oynatDegistir()
  }, [])
}

/** Oynatılırken t'yi saniyede ADIM_SANIYEDE × hiz adım ilerletir. */
function useOynatma(n) {
  const { oynatiliyor, hiz } = useDurum(useShallow((s) => ({ oynatiliyor: s.oynatiliyor, hiz: s.hiz })))
  useEffect(() => {
    if (!oynatiliyor || !n) return
    let kare = 0
    let onceki = performance.now()
    let birikim = 0
    const dongu = (simdi) => {
      birikim += ((simdi - onceki) / 1000) * ADIM_SANIYEDE * hiz
      onceki = simdi
      const adim = Math.floor(birikim)
      if (adim > 0) {
        birikim -= adim
        const s = useDurum.getState()
        const yeni = s.t + adim
        if (yeni >= n - 1) {
          s.tAyarla(n - 1)
          s.oynatDegistir()
          return
        }
        s.tAyarla(yeni)
      }
      kare = requestAnimationFrame(dongu)
    }
    kare = requestAnimationFrame(dongu)
    return () => cancelAnimationFrame(kare)
  }, [oynatiliyor, hiz, n])
}

const zamanBicim = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const derece = (v) => (v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}°`)

export default function Temel() {
  useUrlParametreleri()
  const anlik = useAnlikDurum()
  const { alan } = anlik
  const { seciliAlan, ozelNokta, oynatiliyor, alanSec, ozelNoktaSec, tAyarla, oynatDegistir } = useDurum(
    useShallow((s) => ({
      seciliAlan: s.seciliAlan,
      ozelNokta: s.ozelNokta,
      oynatiliyor: s.oynatiliyor,
      alanSec: s.alanSec,
      ozelNoktaSec: s.ozelNoktaSec,
      tAyarla: s.tAyarla,
      oynatDegistir: s.oynatDegistir,
    })),
  )
  useOynatma(alan?.n ?? 0)

  const sunTrail = useMemo(
    () => (alan ? izKes(alan.sun_az, alan.sun_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )
  const earthTrail = useMemo(
    () => (alan ? izKes(alan.earth_az, alan.earth_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )

  const dugme = (etkin) =>
    `px-3 py-1.5 rounded-md text-sm border transition-colors ${
      etkin ? 'border-metin-solgun bg-yuzey-acik text-metin' : 'border-cizgi text-metin-solgun hover:bg-yuzey'
    }`

  return (
    <main className="min-h-screen bg-zemin text-metin flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-light tracking-wide text-xl mr-4">
          Gökyüzü görünümü <span className="text-metin-solgun text-sm">— geçici test</span>
        </h1>
        {TEST_ALANLARI.map((ad) => (
          <button key={ad} className={dugme(!ozelNokta && seciliAlan === ad)} onClick={() => alanSec(ad)}>
            {ad}
          </button>
        ))}
        <button className={dugme(!!ozelNokta)} onClick={() => ozelNoktaSec({ lat: -60, lon: 10 })}>
          Özel (−60°, 10°)
        </button>
      </header>

      {anlik.yaklasik && (
        <p className="text-sm text-uyari">
          Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler farklı olabilir.
        </p>
      )}

      <section className="grid flex-1 min-h-[360px] rounded-lg border border-cizgi overflow-hidden">
        {anlik.hata ? (
          <p className="p-4 text-uyari">{String(anlik.hata.message ?? anlik.hata)}</p>
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
          />
        ) : (
          <p className="p-4 text-metin-solgun">Yükleniyor…</p>
        )}
      </section>

      <footer className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            className={dugme(oynatiliyor) + ' w-24'}
            onClick={oynatDegistir}
            disabled={!alan}
            aria-label={oynatiliyor ? 'Duraklat' : 'Oynat'}
          >
            {oynatiliyor ? '❚❚ Durdur' : '▶ Oynat'}
          </button>
          <input
            type="range"
            className="flex-1 accent-[#F5A524]"
            min={0}
            max={alan ? alan.n - 1 : 0}
            step={1}
            value={anlik.t}
            onChange={(e) => tAyarla(Number(e.target.value))}
            disabled={!alan}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-metin-solgun">
          <span>
            t = <span className="text-metin">{anlik.t}</span>
          </span>
          <span className="text-metin">{anlik.zaman ? `${zamanBicim.format(anlik.zaman)} UTC` : '—'}</span>
          <span>
            Güneş <span className="text-gunes">{derece(anlik.sunAlt)}</span> yük., az{' '}
            <span className="text-gunes">{anlik.sunAz?.toFixed(1) ?? '—'}°</span>
          </span>
          <span>
            Dünya <span className="text-iletisim">{derece(anlik.earthAlt)}</span> yük., az{' '}
            <span className="text-iletisim">{anlik.earthAz?.toFixed(1) ?? '—'}°</span>
          </span>
          <span>{alan ? `${alan.site} (${alan.lat}°, ${alan.lon}°)` : ''}</span>
        </div>
      </footer>
    </main>
  )
}
