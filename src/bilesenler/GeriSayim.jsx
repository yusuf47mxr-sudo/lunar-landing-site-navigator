// Geri sayım — gün batımı/doğumu ve Dünya batışı/doğuşu.
// Challenge bunu "kritik operasyonel bilgi" olarak vurgular: büyük ve net.

import { useEffect } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { saatBicimle } from '../core/hesap.js'
import { useDurum, useGeriSayim } from '../durum/store.js'

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
 * Süre değişince sayı zıplamaz, kısa sürede akar (elle atlamalarda).
 * Oynatırken adımlar zaten saniyede 30 kez gelir; ara değer eklemek sayıyı
 * gerçeğin gerisinde bırakır, bu yüzden doğrudan yazılır.
 */
function AkanSure({ saat, tur }) {
  const oynatiliyor = useDurum((s) => s.oynatiliyor)
  const deger = useMotionValue(saat)
  const metin = useTransform(deger, (v) => saatBicimle(Math.max(0, Math.round(v))))
  useEffect(() => {
    if (oynatiliyor) {
      deger.jump(saat)
      return
    }
    const kontrol = animate(deger, saat, { duration: 0.25, ease: 'easeOut' })
    return () => kontrol.stop()
  }, [saat, deger, oynatiliyor])
  return (
    <motion.span
      className="tabular-nums font-normal"
      initial={false}
      animate={{ color: saat < KRITIK_SAAT ? YAKIN_RENK[tur] : NORMAL }}
      transition={{ duration: 0.3 }}
    >
      {metin}
    </motion.span>
  )
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
  if (!g) return <div className={`min-h-[5.5rem] ${className}`} aria-busy="true" />

  const gunes = g.gunesGorunuyor
    ? { tur: 'gunBatimi', onEk: 'Gün batımına', saat: g.gunBatimi, yoksa: 'Bu dönemde batmıyor' }
    : { tur: 'gunDogumu', onEk: 'Gün doğumuna', saat: g.gunDogumu, yoksa: 'Bu dönemde doğmuyor' }
  const dunya = g.dunyaGorunuyor
    ? { tur: 'dunyaBatisi', onEk: 'Dünya batışına', saat: g.dunyaBatisi, yoksa: 'Bu dönemde batmıyor' }
    : { tur: 'dunyaDogusu', onEk: 'Dünya doğuşuna', saat: g.dunyaDogusu, yoksa: 'Bu dönemde doğmuyor' }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 ${className}`} aria-live="polite">
      <Satir simge="☀" simgeEtiket="Güneş" {...gunes} />
      <Satir simge="📡" simgeEtiket="Dünya ile iletişim" {...dunya} />
    </div>
  )
}
