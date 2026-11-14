// Sahte veri uyarısı — CLAUDE.md bölüm 11 "Yaklaşık veri işaretlenir".
// VERI_KAYNAGI 'sahte' iken sayfa başlığının altında küçük, tek satırlık not.
// Gerçek veri gelince sabitler.js'te VERI_KAYNAGI = 'gercek' yapılır; bu
// bileşen hiçbir şey çizmez, sayfalara dokunmak gerekmez.

import { VERI_KAYNAGI } from '../core/sabitler.js'

export const SAHTE_VERI_METNI = 'Gösterim verisi: fiziksel olarak tutarlı ama gerçek arazi değil.'

export default function VeriUyarisi({ className = '' }) {
  if (VERI_KAYNAGI !== 'sahte') return null
  return (
    <p
      role="note"
      data-veri-uyarisi=""
      className={`inline-block max-w-full rounded-md border border-uyari/60 px-2 py-0.5 text-xs tracking-wide text-uyari ${className}`}
    >
      {SAHTE_VERI_METNI}
    </p>
  )
}
