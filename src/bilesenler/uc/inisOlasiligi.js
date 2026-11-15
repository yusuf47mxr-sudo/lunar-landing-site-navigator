// İniş olasılığı: işçiyi (core/inisIsci.js) yönetir. Bir yerel sahne için tek
// işçi; sahne kapanınca sonlandırılır.

import { useEffect, useMemo, useRef } from 'react'

export { INIS_VARSAYILAN } from '../../core/inisIsci.js'

export function useInisOlasiligi() {
  const isci = useRef(null)
  const bekleyen = useRef(new Map())
  const sira = useRef(0)
  useEffect(
    () => () => {
      isci.current?.terminate()
      isci.current = null
      bekleyen.current.clear()
    },
    [],
  )
  return useMemo(() => {
    const al = () => {
      if (!isci.current) {
        isci.current = new Worker(new URL('../../core/inisIsci.js', import.meta.url), { type: 'module' })
        isci.current.onmessage = ({ data }) => {
          const b = bekleyen.current.get(data.istek)
          if (!b) return
          bekleyen.current.delete(data.istek)
          data.hata ? b.red(Object.assign(new Error(data.hata.mesaj), { kod: data.hata.kod, params: data.hata.params })) : b.coz(data.sonuc)
        }
      }
      return isci.current
    }
    const iste = (tip, girdi) =>
      new Promise((coz, red) => {
        const istek = ++sira.current
        bekleyen.current.set(istek, { coz, red })
        al().postMessage({ tip, istek, ...girdi })
      })
    return {
      /** Bütün düğümleri arka planda hazırla (kraterler açılınca; tıklama hızlı olsun). */
      hazirla: (izgara) => al().postMessage({ tip: 'hazirla', izgara }),
      /**
       * @param {{ izgara, bas, gun, hedef: {i, j}, ground, batteryH }} girdi
       * @returns {Promise<{ pLow, outside, reasons, groundUnknown }>}
       */
      hesapla: (girdi) => iste('hesapla', girdi),
      /**
       * Bas'tan sonraki ilk ≥ %50 başarılı 14 günlük başlangıç (günlük tarama, ≤ 1 yıl).
       * @returns {Promise<{ t, pLow } | null>}
       */
      oneri: (girdi) => iste('oneri', girdi),
    }
  }, [])
}
