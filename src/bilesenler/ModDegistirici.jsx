// Mod değiştirici — Temel | Orta | İleri. Sadece store.mod'u değiştirir;
// seçili alan, zaman ve parametreler depoda kaldığı için korunur.

import { useShallow } from 'zustand/react/shallow'
import { useDil } from '../dil/index.js'
import { useDurum } from '../durum/store.js'
import Secenekler from './Secenekler.jsx'

// Etiketler sözlükte: t(`mod.${deger}`)
const MODLAR = ['temel', 'orta', 'ileri']

export default function ModDegistirici({ className = '' }) {
  const { mod, modSec } = useDurum(useShallow((s) => ({ mod: s.mod, modSec: s.modSec })))
  const { t } = useDil()
  const secenekler = MODLAR.map((deger) => ({ deger, etiket: t(`mod.${deger}`) }))
  return (
    <Secenekler
      secenekler={secenekler}
      deger={mod}
      onSec={modSec}
      etiket={t('mod.etiket')}
      kucuk
      className={`shrink-0 ${className}`}
    />
  )
}
