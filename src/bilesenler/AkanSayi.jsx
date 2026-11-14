// Akan sayı — değer değişince zıplamaz, kısa sürede akar (elle atlamalarda).
// Oynatırken adımlar zaten saniyede 30 kez gelir; ara değer eklemek sayıyı
// gerçeğin gerisinde bırakır, bu yüzden doğrudan yazılır.

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useDurum } from '../durum/store.js'

/**
 * @param {number} props.deger
 * @param {(v: number) => string} props.bicim  sayı → metin. Modül düzeyinde
 *        tanımlı, sabit bir fonksiyon olmalı (her render'da yenisi verilmemeli).
 * @param {string} [props.renk]  verilirse metin rengi bu değere yumuşakça geçer (rgba)
 */
export default function AkanSayi({ deger, bicim, renk, className = 'tabular-nums' }) {
  const oynatiliyor = useDurum((s) => s.oynatiliyor)
  const akan = useMotionValue(deger)
  const metin = useTransform(akan, bicim)
  useEffect(() => {
    if (oynatiliyor) {
      akan.jump(deger)
      return
    }
    const kontrol = animate(akan, deger, { duration: 0.25, ease: 'easeOut' })
    return () => kontrol.stop()
  }, [deger, akan, oynatiliyor])
  return (
    <motion.span
      className={className}
      initial={false}
      animate={renk ? { color: renk } : undefined}
      transition={{ duration: 0.3 }}
    >
      {metin}
    </motion.span>
  )
}
