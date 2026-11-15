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
          data.hata ? b.red(new Error(data.hata)) : b.coz(data.sonuc)
        }
      }
      return isci.current
    }
    return {
      /** Düğümleri önceden hesapla (katman açılınca; ilk tıklama hızlı olsun). */
      hazirla: (izgara, tL, D) => al().postMessage({ tip: 'hazirla', izgara, tL, D }),
      /** @returns {Promise<{ pLow, outside, reasons, groundUnknown }>} */
      hesapla: (izgara, tL, D, hedef, ground) =>
        new Promise((coz, red) => {
          const istek = ++sira.current
          bekleyen.current.set(istek, { coz, red })
          al().postMessage({ tip: 'hesapla', istek, izgara, tL, D, hedef, ground })
        }),
    }
  }, [])
}
