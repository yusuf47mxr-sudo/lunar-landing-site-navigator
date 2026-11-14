// Durum göstergesi — Güneş ve iletişim için iki büyük rozet.
// kip='sozel'  : sadece durum cümlesi (Temel)
// kip='sayisal': altında yükseklik açısı da yazar (Orta, İleri)

import { AnimatePresence, motion } from 'framer-motion'
import { useAnlikDurum, useGorunurluk } from '../durum/store.js'

// Framer Motion renkleri ara değerleyebilsin diye hepsi rgba
const GRI = { zemin: 'rgba(22, 32, 58, 0.55)', kenar: 'rgba(31, 43, 69, 1)', metin: 'rgba(138, 151, 172, 1)', nokta: 'rgba(138, 151, 172, 0.5)' }
const STIL = {
  gunesGorunur: { zemin: 'rgba(245, 165, 36, 0.13)', kenar: 'rgba(245, 165, 36, 0.9)', metin: 'rgba(245, 165, 36, 1)', nokta: 'rgba(245, 165, 36, 1)' },
  gunesKismen: { zemin: 'rgba(107, 74, 18, 0.28)', kenar: 'rgba(107, 74, 18, 1)', metin: 'rgba(245, 165, 36, 0.62)', nokta: 'rgba(245, 165, 36, 0.5)' },
  golgede: GRI,
  baglanti: { zemin: 'rgba(34, 211, 238, 0.11)', kenar: 'rgba(34, 211, 238, 0.9)', metin: 'rgba(34, 211, 238, 1)', nokta: 'rgba(34, 211, 238, 1)' },
  baglantiYok: GRI,
}

const GECIS = { duration: 0.45, ease: 'easeOut' }

const derece = (v) => {
  if (v == null || !Number.isFinite(v)) return '—'
  const y = Math.round(v * 10) / 10
  return `${y > 0 ? '+' : y < 0 ? '−' : ''}${Math.abs(y).toFixed(1)}°`
}

function Rozet({ etiket, durum, metin, ek }) {
  const s = STIL[durum]
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={false}
      animate={{ backgroundColor: s.zemin, borderColor: s.kenar }}
      transition={GECIS}
      className="min-h-[100px] rounded-2xl border px-5 py-4 flex flex-col justify-center gap-1.5"
    >
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-metin-solgun">
        <motion.span
          className="inline-block h-2 w-2 rounded-full"
          initial={false}
          animate={{ backgroundColor: s.nokta }}
          transition={GECIS}
        />
        {etiket}
      </span>
      <motion.span
        className="relative block text-[20px] font-light tracking-wide"
        initial={false}
        animate={{ color: s.metin }}
        transition={GECIS}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={metin}
            className="block"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
          >
            {metin}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      {ek && <span className="text-sm text-metin-solgun tabular-nums">{ek}</span>}
    </motion.div>
  )
}

export default function DurumGostergesi({ kip = 'sozel', className = '' }) {
  const anlik = useAnlikDurum()
  const { f, c } = useGorunurluk()
  if (!f || !c || !anlik.alan) return <div className={`min-h-[100px] ${className}`} aria-busy="true" />

  const fT = f[anlik.t]
  const cT = c[anlik.t]
  const gunes = fT > 0.5
    ? { durum: 'gunesGorunur', metin: 'Güneş görünür' }
    : fT > 0
      ? { durum: 'gunesKismen', metin: 'Güneş kısmen görünür' }
      : { durum: 'golgede', metin: 'Gölgede' }
  const iletisim = cT === 1
    ? { durum: 'baglanti', metin: 'Dünya ile bağlantı var' }
    : { durum: 'baglantiYok', metin: 'Bağlantı yok' }
  const sayisal = kip === 'sayisal'

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <Rozet
        etiket="Güneş"
        {...gunes}
        ek={sayisal ? `Yükseklik ${derece(anlik.sunAlt)}` : null}
      />
      <Rozet etiket="İletişim" {...iletisim} ek={sayisal ? `Dünya yüksekliği ${derece(anlik.earthAlt)}` : null} />
    </div>
  )
}
