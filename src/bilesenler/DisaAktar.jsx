// CSV indirme (İleri). Seçili alanın zaman serisini, o anki parametrelerle
// hesaplanmış f, c ve P ile birlikte indirir. Kapsam: görev aralığı ya da tüm yıl.
// Metni core/disaAktar.js üretir; f ve c depodaki önbellekten gelir.
// t'ye abone değildir: oynatırken yeniden çizilmez.

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { csvDosyaAdi, csvUret, ozelDosyaAdi } from '../core/disaAktar.js'
import { guc } from '../core/hesap.js'
import { cDizisi, fDizisi, useBolgeler, useDurum, useSeciliAlanVerisi } from '../durum/store.js'
import Secenekler from './Secenekler.jsx'

const KAPSAMLAR = [
  { deger: 'gorev', etiket: 'Görev aralığı' },
  { deger: 'yil', etiket: 'Tüm yıl' },
]

/** Metni dosya olarak indirir. */
function indir(dosyaAdi, metin) {
  const url = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = dosyaAdi
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DisaAktar({ className = '' }) {
  const { alan } = useSeciliAlanVerisi()
  const { bolgeler } = useBolgeler()
  const p = useDurum(
    useShallow((s) => ({ tL: s.tL, D: s.D, hm: s.hm, epsilon: s.epsilon, S: s.S, eta: s.eta, yonelim: s.yonelim })),
  )
  const [kapsam, setKapsam] = useState('gorev')

  const dt = alan?.dt_hours ?? 1
  const adim = Math.round((p.D * 24) / dt)
  const tasiyor = !!alan && p.tL + adim > alan.n // görev yıl sonunu aşıyor
  const bas = kapsam === 'yil' ? 0 : p.tL
  const son = kapsam === 'yil' ? (alan?.n ?? 0) : p.tL + adim
  const kayit = alan && !alan.yaklasik ? bolgeler?.find((b) => b.site === alan.site) : null
  const kok = alan?.yaklasik ? ozelDosyaAdi(alan.lat, alan.lon) : kayit?.file
  const dosyaAdi = alan && kok ? csvDosyaAdi(kok, alan, p.tL, p.D, kapsam) : null
  const hazir = !!dosyaAdi && !(kapsam === 'gorev' && tasiyor)

  const csvIndir = () => {
    if (!hazir) return
    const horizon = alan.horizon[String(p.hm)]
    const f = fDizisi(alan, horizon)
    const c = cDizisi(alan, horizon, p.epsilon)
    const P = guc(f, alan.sun_alt, p.eta, p.S, p.yonelim)
    indir(dosyaAdi, csvUret(alan, f, c, P, bas, son))
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={csvIndir}
          disabled={!hazir}
          className="shrink-0 rounded-lg border border-gunes/70 bg-gunes/10 px-3 py-1.5 text-sm tracking-wide text-gunes
            transition-colors hover:bg-gunes/20 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
        >
          CSV indir
        </button>
        <Secenekler secenekler={KAPSAMLAR} deger={kapsam} onSec={setKapsam} etiket="CSV kapsamı" kucuk />
      </div>
      {kapsam === 'gorev' && tasiyor ? (
        <p className="mt-2 text-xs text-metin-solgun">Görev veri aralığının dışına taşıyor.</p>
      ) : (
        <p className="mt-2 text-xs tabular-nums text-metin-solgun">
          <span className="block break-all">{dosyaAdi ?? ' '}</span>
          {dosyaAdi && <span className="block text-metin-solgun/70">{son - bas} satır + başlık</span>}
        </p>
      )}
      {alan?.yaklasik && <p className="mt-1 text-xs text-uyari">Dosyanın ilk satırı: “# Arazi hesaba katılmadı”</p>}
    </div>
  )
}
