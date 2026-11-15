// Depoya bağlı zaman çizelgesi: seçili alanın f ve c dizilerini, görev
// aralığını ve en uzun karanlık/kesintiyi ZamanCizelgesi'ne verir.
// Orta ve İleri sayfalar bunu kullanır.

import { useShallow } from 'zustand/react/shallow'
import { useDil } from '../dil/index.js'
import { useDurum, useEnUzunAraliklar, useGorunurluk } from '../durum/store.js'
import ZamanCizelgesi from './ZamanCizelgesi.jsx'

export default function ZamanCizelgesiKutusu() {
  const { alan, f, c } = useGorunurluk()
  const araliklar = useEnUzunAraliklar()
  const { t, tL, D, tAyarla } = useDurum(useShallow((s) => ({ t: s.t, tL: s.tL, D: s.D, tAyarla: s.tAyarla })))
  const { t: ceviri } = useDil() // t burada zaman adımı

  if (!alan || !f || !c) return <p className="text-sm text-metin-solgun">{ceviri('uygulama.yukleniyor')}</p>
  return (
    <ZamanCizelgesi
      f={f}
      c={c}
      t0={alan.t0}
      dtHours={alan.dt_hours}
      tSecili={t}
      tL={tL}
      D={D}
      araliklar={araliklar}
      onZamanSec={tAyarla}
    />
  )
}
