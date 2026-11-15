// Dil seçici — TR | EN. Yalnız store.dil'i değiştirir (localStorage'a da yazar);
// seçili alan, zaman, mod ve 3B sahne depoda olduğu için korunur.

import { useShallow } from 'zustand/react/shallow'
import { useDil } from '../dil/index.js'
import { useDurum } from '../durum/store.js'
import Secenekler from './Secenekler.jsx'

const SECENEKLER = [
  { deger: 'tr', etiket: 'TR' },
  { deger: 'en', etiket: 'EN' },
]

export default function DilSecici({ className = '' }) {
  const { dil, dilSec } = useDurum(useShallow((s) => ({ dil: s.dil, dilSec: s.dilSec })))
  const { t } = useDil()
  return <Secenekler secenekler={SECENEKLER} deger={dil} onSec={dilSec} etiket={t('dil.etiket')} kucuk className={`shrink-0 ${className}`} />
}
