// Özel koordinat girişi — listede olmayan bir noktayı gösterir.
// Enlem −90…90; boylam hem 0…360 hem −180…180 kabul edilir ve depoya
// [0, 360) olarak yazılır. Sonuç yaklaşık veridir (CLAUDE.md bölüm 5.8).

import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDurum } from '../durum/store.js'

const sayiOku = (metin) => {
  const m = String(metin).trim().replace(',', '.').replace('−', '-')
  return m === '' ? NaN : Number(m)
}

/** Giriş metinlerini çözer. Geçerliyse lat/lon ([0, 360)), değilse hata metinleri. */
export function koordinatCoz(enlemMetin, boylamMetin) {
  const lat = sayiOku(enlemMetin)
  const hamLon = sayiOku(boylamMetin)
  const enlemHata = Number.isFinite(lat) && lat >= -90 && lat <= 90 ? null : 'Enlem −90 ile 90 arasında olmalı.'
  const boylamHata =
    Number.isFinite(hamLon) && hamLon >= -180 && hamLon <= 360
      ? null
      : 'Boylam 0…360 ya da −180…180 arasında olmalı.'
  // Sadece gerektiğinde sar: 23.473 olduğu gibi kalsın (kayan nokta artığı olmasın)
  const lon = boylamHata ? null : hamLon < 0 ? Math.round((hamLon + 360) * 1e6) / 1e6 : hamLon === 360 ? 0 : hamLon
  return { lat: enlemHata ? null : lat, lon, enlemHata, boylamHata }
}

function Giris({ etiket, deger, onDegis, hata, ipucu, kimlik }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block text-xs text-metin-solgun">{etiket}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
        placeholder={ipucu}
        aria-invalid={hata ? 'true' : undefined}
        aria-describedby={hata ? kimlik : undefined}
        className={`w-full rounded-lg border bg-zemin px-3 py-2 text-sm tabular-nums text-metin
          placeholder:text-metin-solgun/60 focus:outline-none
          ${hata ? 'border-uyari' : 'border-cizgi focus:border-iletisim/60'}`}
      />
    </label>
  )
}

export default function OzelKoordinat({ className = '' }) {
  const { ozelNokta, ozelNoktaSec } = useDurum(
    useShallow((s) => ({ ozelNokta: s.ozelNokta, ozelNoktaSec: s.ozelNoktaSec })),
  )
  const [enlem, setEnlem] = useState(ozelNokta ? String(ozelNokta.lat) : '')
  const [boylam, setBoylam] = useState(ozelNokta ? String(ozelNokta.lon) : '')
  const [hata, setHata] = useState({ enlem: null, boylam: null })

  // Özel nokta başka yerden (haritadan) seçilirse girişler onu göstersin.
  // Kullanıcının kendi yazdığı (ör. −156.5 → 203.5) yeniden yazılmaz.
  useEffect(() => {
    if (!ozelNokta) return
    const simdiki = koordinatCoz(enlem, boylam)
    if (simdiki.lat === ozelNokta.lat && simdiki.lon === ozelNokta.lon) return
    setEnlem(String(ozelNokta.lat))
    setBoylam(String(ozelNokta.lon))
    setHata({ enlem: null, boylam: null })
  }, [ozelNokta]) // eslint-disable-line react-hooks/exhaustive-deps

  const goster = (e) => {
    e.preventDefault()
    const c = koordinatCoz(enlem, boylam)
    setHata({ enlem: c.enlemHata, boylam: c.boylamHata })
    if (!c.enlemHata && !c.boylamHata) ozelNoktaSec({ lat: c.lat, lon: c.lon })
  }

  return (
    <form onSubmit={goster} noValidate className={className}>
      <div className="flex items-end gap-2">
        <Giris
          etiket="Enlem (°)"
          deger={enlem}
          onDegis={(v) => {
            setEnlem(v)
            setHata((h) => ({ ...h, enlem: null }))
          }}
          hata={hata.enlem}
          ipucu="−90 … 90"
          kimlik="ozel-enlem-hata"
        />
        <Giris
          etiket="Boylam (°)"
          deger={boylam}
          onDegis={(v) => {
            setBoylam(v)
            setHata((h) => ({ ...h, boylam: null }))
          }}
          hata={hata.boylam}
          ipucu="0 … 360"
          kimlik="ozel-boylam-hata"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-gunes/70 bg-gunes/10 px-4 py-2 text-sm tracking-wide text-gunes
            transition-colors hover:bg-gunes/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
        >
          Göster
        </button>
      </div>
      {hata.enlem && (
        <p id="ozel-enlem-hata" role="alert" className="mt-1.5 text-xs text-uyari">
          {hata.enlem}
        </p>
      )}
      {hata.boylam && (
        <p id="ozel-boylam-hata" role="alert" className="mt-1.5 text-xs text-uyari">
          {hata.boylam}
        </p>
      )}
      <p className="mt-2 text-xs text-metin-solgun">Arazi verisi yalnızca listedeki alanlar için var.</p>
    </form>
  )
}
