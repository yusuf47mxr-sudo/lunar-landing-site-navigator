// Mod değiştirici — Temel | Orta | İleri. Sadece store.mod'u değiştirir;
// seçili alan, zaman ve parametreler depoda kaldığı için korunur.

import { useShallow } from 'zustand/react/shallow'
import { useDurum } from '../durum/store.js'
import Secenekler from './Secenekler.jsx'

const MOD_SECENEKLERI = [
  { deger: 'temel', etiket: 'Temel' },
  { deger: 'orta', etiket: 'Orta' },
  { deger: 'ileri', etiket: 'İleri' },
]

export default function ModDegistirici({ className = '' }) {
  const { mod, modSec } = useDurum(useShallow((s) => ({ mod: s.mod, modSec: s.modSec })))
  return (
    <Secenekler
      secenekler={MOD_SECENEKLERI}
      deger={mod}
      onSec={modSec}
      etiket="Mod"
      kucuk
      className={`shrink-0 ${className}`}
    />
  )
}
