// İniş olasılığı: işçiyi (core/inisIsci.js) yönetir. Bir yerel sahne için tek
// işçi; sahne kapanınca sonlandırılır.
//
// Yedek yol: işçi oluşturulamazsa, başlarken / çalışırken hata verirse ('error',
// 'messageerror'), kodsuz bir iç hata döndürürse ya da ZAMAN_ASIMI içinde yanıt
// vermezse hesap SESSİZCE ana iş parçacığında yapılır (core/inisHesap.js, işçiyle
// aynı kod ve aynı model.js yükleme yolu). Kullanıcı hata metni görmez; gerçek
// hata yalnız konsola yazılır. Sözlükte kodu olan hatalar (ör. pencere 2027'nin
// dışına taşıyor) olduğu gibi gösterilir. Bir kez bozulan işçi oturum boyunca
// yeniden denenmez.

import { useEffect, useMemo, useRef } from 'react'

export { INIS_VARSAYILAN } from '../../core/inisPencere.js'

const ZAMAN_ASIMI = 60000 // ms; ilk istek düğüm bitlerini hesaplar (yazılımsal ortamda birkaç sn)

let isciBozuk = false // oturum boyunca: bir kez bozulduysa doğrudan ana iş parçacığı
let anaYolSozu = null
const anaYol = () => (anaYolSozu ??= import('../../core/inisHesap.js'))

/** Ana iş parçacığında aynı hesap (yedek). */
async function anaIstek(tip, girdi) {
  const { inisIstegi } = await anaYol()
  return inisIstegi({ tip, ...girdi })
}

const kodlu = (h) => Object.assign(new Error(h.mesaj), { kod: h.kod, params: h.params })

export function useInisOlasiligi() {
  const isci = useRef(null)
  const bekleyen = useRef(new Map()) // istek → { coz, red, tip, girdi, zaman }
  const sira = useRef(0)
  useEffect(
    () => () => {
      isci.current?.terminate()
      isci.current = null
      for (const b of bekleyen.current.values()) clearTimeout(b.zaman)
      bekleyen.current.clear()
    },
    [],
  )
  return useMemo(() => {
    /** Bekleyen bir isteği ana iş parçacığına aktarır. */
    const anayaAktar = (istek) => {
      const b = bekleyen.current.get(istek)
      if (!b) return
      bekleyen.current.delete(istek)
      clearTimeout(b.zaman)
      anaIstek(b.tip, b.girdi).then(b.coz, b.red)
    }
    /** İşçiyi bozuk say, sonlandır, bekleyen her isteği ana iş parçacığına aktar. */
    const bozuldu = (neden) => {
      if (!isciBozuk) console.error('[landing odds] worker unavailable; computing on the main thread instead:', neden)
      isciBozuk = true
      isci.current?.terminate()
      isci.current = null
      for (const istek of [...bekleyen.current.keys()]) anayaAktar(istek)
    }
    const al = () => {
      if (isciBozuk) return null
      if (!isci.current) {
        try {
          const w = new Worker(new URL('../../core/inisIsci.js', import.meta.url), { type: 'module' })
          w.onmessage = ({ data }) => {
            const b = bekleyen.current.get(data.istek)
            if (!b) return
            if (data.hata && !data.hata.kod) {
              // İç hata (ör. model yüklenemedi): bu isteği de ana iş parçacığına
              bozuldu(data.hata.mesaj)
              return
            }
            bekleyen.current.delete(data.istek)
            clearTimeout(b.zaman)
            data.hata ? b.red(kodlu(data.hata)) : b.coz(data.sonuc)
          }
          w.onerror = (e) => {
            e.preventDefault?.()
            bozuldu(e.message || e.error || 'worker error event')
          }
          w.onmessageerror = () => bozuldu('messageerror')
          isci.current = w
        } catch (h) {
          bozuldu(h)
          return null
        }
      }
      return isci.current
    }
    const iste = (tip, girdi) =>
      new Promise((coz, red) => {
        const w = al()
        if (!w) {
          anaIstek(tip, girdi).then(coz, red)
          return
        }
        const istek = ++sira.current
        const zaman = setTimeout(() => bozuldu(`no reply in ${ZAMAN_ASIMI} ms`), ZAMAN_ASIMI)
        bekleyen.current.set(istek, { coz, red, tip, girdi, zaman })
        w.postMessage({ tip, istek, ...girdi })
      }).catch((h) => {
        // Ana iş parçacığında da kodsuz hata: konsola yaz, kullanıcıya genel kodlu hata
        if (h?.kod) throw h
        console.error('[landing odds] computation failed:', h)
        throw Object.assign(new Error('landing odds unavailable'), { kod: 'hata.inisHesaplanamadi', params: {} })
      })
    return {
      /** Bütün düğümleri arka planda hazırla (kraterler açılınca; tıklama hızlı olsun). Yalnız işçide. */
      hazirla: (izgara) => al()?.postMessage({ tip: 'hazirla', izgara }),
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
