// Görev ayarları — iniş tarihi, görev süresi, direk yüksekliği (Orta, İleri).
// İleri moddaki ek parametreler (epsilon, S, eta, yönelim, ağırlıklar)
// Adım 10'da buraya eklenecek.

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { INIS_ADIM_SAAT, INIS_SAYISI } from '../core/sabitler.js'
import { DIREK_YUKSEKLIKLERI, GOREV_SURELERI, useDurum, useSeciliAlanVerisi } from '../durum/store.js'
import Secenekler from './Secenekler.jsx'
import { gunBicimle } from './ZamanKaydirici.jsx'

const SURE_SECENEKLERI = GOREV_SURELERI.map((d) => ({ deger: d, etiket: `${d} gün` }))
const DIREK_SECENEKLERI = DIREK_YUKSEKLIKLERI.map((h) => ({ deger: h, etiket: `${h} m` }))

function Satir({ etiket, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-metin-solgun">{etiket}</p>
      {children}
    </div>
  )
}

export default function ParametrePaneli({ className = '' }) {
  const { alan } = useSeciliAlanVerisi()
  const { tL, D, hm, inisSec, DAyarla, hmAyarla } = useDurum(
    useShallow((s) => ({
      tL: s.tL,
      D: s.D,
      hm: s.hm,
      inisSec: s.inisSec,
      DAyarla: s.DAyarla,
      hmAyarla: s.hmAyarla,
    })),
  )

  // Haftalık iniş tarihleri: t0'dan başlar, ozet.json'daki ızgarayla aynıdır
  const t0 = alan?.t0
  const dt = alan?.dt_hours ?? 1
  const tarihler = useMemo(() => {
    if (!t0) return []
    const t0ms = Date.parse(t0)
    return Array.from({ length: INIS_SAYISI }, (_, k) => ({
      tL: Math.round((k * INIS_ADIM_SAAT) / dt),
      etiket: gunBicimle(new Date(t0ms + k * INIS_ADIM_SAAT * 3600e3)),
    }))
  }, [t0, dt])

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Satir etiket="İniş tarihi">
        <select
          aria-label="İniş tarihi"
          value={tL}
          disabled={tarihler.length === 0}
          onChange={(e) => inisSec(Number(e.target.value))}
          style={{ colorScheme: 'dark' }}
          className="w-full rounded-lg border border-cizgi bg-zemin px-3 py-2 text-sm tabular-nums text-metin
            focus:border-iletisim/60 focus:outline-none disabled:opacity-50"
        >
          {tarihler.map((s) => (
            <option key={s.tL} value={s.tL}>
              {s.etiket}
            </option>
          ))}
        </select>
      </Satir>
      <Satir etiket="Görev süresi">
        <Secenekler secenekler={SURE_SECENEKLERI} deger={D} onSec={DAyarla} etiket="Görev süresi" esnek />
      </Satir>
      <Satir etiket="Direk yüksekliği">
        <Secenekler secenekler={DIREK_SECENEKLERI} deger={hm} onSec={hmAyarla} etiket="Direk yüksekliği" esnek />
      </Satir>
    </div>
  )
}
