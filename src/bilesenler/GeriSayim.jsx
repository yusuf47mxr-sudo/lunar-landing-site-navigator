// Geri sayım — gün batımı/doğumu ve Dünya batışı/doğuşu.
// Challenge bunu "kritik operasyonel bilgi" olarak vurgular: büyük ve net.

import { AnimatePresence, motion } from 'framer-motion'
import { useDil } from '../dil/index.js'
import { useGeriSayim } from '../durum/store.js'
import AkanSayi from './AkanSayi.jsx'

const KRITIK_SAAT = 24
const NORMAL = 'rgba(230, 237, 247, 1)'
// 24 saatin altında: batışlar uyarı, doğuşlar kendi vurgu rengiyle
const YAKIN_RENK = {
  gunBatimi: 'rgba(239, 68, 68, 1)', // --uyari
  dunyaBatisi: 'rgba(239, 68, 68, 1)', // --uyari
  gunDogumu: 'rgba(245, 165, 36, 1)', // --gunes
  dunyaDogusu: 'rgba(34, 211, 238, 1)', // --iletisim
}

/**
 * Akan süre metni ("3 g 7 sa" / "3 d 7 h"); 24 saatin altında türüne göre renklenir.
 * Sayısal özet tablosu da bunu kullanır.
 */
export function AkanSure({ saat, tur }) {
  const { b } = useDil()
  return (
    <AkanSayi
      deger={saat}
      bicim={(v) => b.sure(Math.max(0, Math.round(v)))}
      renk={saat < KRITIK_SAAT ? YAKIN_RENK[tur] : NORMAL}
      className="tabular-nums font-normal"
    />
  )
}

/**
 * geriSayim() sonucundan iki satırın içeriği: [güneş, dünya].
 * onEk ("Gün batımına" / "Sunset in"), yoksa ("Bu dönemde batmıyor" / "Does not set in this period").
 * @param {(anahtar: string) => string} t  dil/ ceviri fonksiyonu (useDil().t)
 */
export function geriSayimSatirlari(g, t) {
  const satir = (tur, saat, batis) => ({ tur, onEk: t(`geriSayim.${tur}`), saat, yoksa: t(batis ? 'geriSayim.batmiyor' : 'geriSayim.dogmuyor') })
  const gunes = g.gunesGorunuyor ? satir('gunBatimi', g.gunBatimi, true) : satir('gunDogumu', g.gunDogumu, false)
  const dunya = g.dunyaGorunuyor ? satir('dunyaBatisi', g.dunyaBatisi, true) : satir('dunyaDogusu', g.dunyaDogusu, false)
  return [gunes, dunya]
}

/**
 * Bir satır: simge + ifade + süre. tur değişince (ör. batım → doğum)
 * satır yumuşakça yenisiyle yer değiştirir; aynı tür içinde sadece sayı akar.
 */
function Satir({ simge, simgeEtiket, tur, onEk, saat, yoksa }) {
  return (
    <div className="min-h-[2.75rem] flex items-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${tur}:${saat === null}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.1 }}
          className="text-2xl sm:text-[28px] font-light tracking-wide text-metin"
        >
          <span role="img" aria-label={simgeEtiket} className="mr-2">
            {simge}
          </span>
          {saat === null ? (
            <span className="text-metin-solgun">{yoksa}</span>
          ) : (
            <>
              {onEk} <AkanSure saat={saat} tur={tur} />
            </>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export default function GeriSayim({ className = '' }) {
  const g = useGeriSayim()
  const { t } = useDil()
  if (!g) return <div className={`min-h-[5.5rem] ${className}`} aria-busy="true" />
  const [gunes, dunya] = geriSayimSatirlari(g, t)

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 ${className}`} aria-live="polite">
      <Satir simge="☀" simgeEtiket={t('ortak.gunes')} {...gunes} />
      <Satir simge="📡" simgeEtiket={t('geriSayim.dunyaIletisim')} {...dunya} />
    </div>
  )
}
