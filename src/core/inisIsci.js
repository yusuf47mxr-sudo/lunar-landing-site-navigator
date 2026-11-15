// İniş başarı olasılığı işçisi (Web Worker): inisHesap.js'in ince sarmalayıcısı.
// Vite'ın önerdiği biçimde oluşturulur:
//   new Worker(new URL('../../core/inisIsci.js', import.meta.url), { type: 'module' })
//
// Mesajlar:
//   { tip: 'hesapla', istek, izgara, bas, gun, hedef: { i, j }, ground, batteryH } → { istek, sonuc | hata }
//   { tip: 'oneri',   istek, izgara, bas, hedef, ground, batteryH }               → { istek, sonuc: { t, pLow } | null }
//   { tip: 'hazirla', izgara }  bütün düğümleri arka planda, merkezden dışa doğru,
//                               küçük dilimlerle hesaplar (istekler araya girer)
// hata: { mesaj, kod?, params? } — kod varsa kullanıcıya gösterilebilir (sözlükte),
// yoksa iç hata (çağıran ana iş parçacığına düşer).

import { hazirlikBaslat, inisIstegi } from './inisHesap.js'

self.onmessage = async ({ data: m }) => {
  if (m.tip === 'hazirla') {
    hazirlikBaslat(m.izgara).catch(() => {})
    return
  }
  try {
    self.postMessage({ istek: m.istek, sonuc: await inisIstegi(m) })
  } catch (h) {
    self.postMessage({ istek: m.istek, hata: { mesaj: String(h?.message ?? h), kod: h?.kod, params: h?.params } })
  }
}
