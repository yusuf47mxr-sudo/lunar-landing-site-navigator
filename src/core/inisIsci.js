// İniş başarı olasılığı işçisi (Web Worker). Paketin model.js'i (landingOdds,
// hourly) olduğu gibi kullanılır; rehber §6, §9. Pencere hesabı inisPencere.js'te:
// düğümlerin bütün yılın saatlik aydınlık / Dünya bitleri bir kez hesaplanır,
// sonra her pencere (kart t ile kayar; öneri taraması ~350 pencere) milisaniyeler sürer.
//
// Mesajlar:
//   { tip: 'hesapla', istek, izgara, bas, gun, hedef: { i, j }, ground, batteryH } → { istek, sonuc | hata }
//   { tip: 'oneri',   istek, izgara, bas, hedef, ground, batteryH }               → { istek, sonuc: { t, pLow } | null }
//   { tip: 'hazirla', izgara }  bütün düğümleri arka planda, merkezden dışa doğru,
//                               küçük dilimlerle hesaplar (istekler araya girer)

import { hataOlustur } from './hata.js'
import Model from './planbModel.js'
import { dugumSaatlik, komsuDugumler, oneriBul, pencereOlasiligi } from './inisPencere.js'

const TABAN = `${(import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/')}veri/3b/`
/** Rehber §9 varsayılanları (Haworth örneği ile aynı); batarya kartta seçilir. */
export const INIS_VARSAYILAN = { sigmaM: 100, slopeMax: 10, batteryH: 50, bufferH: 24 }
const EN_COK_ALAN = 2 // önbellekte tutulan alan (alan başına ≤ 961 × 8760 × 2 bayt ≈ 17 MB)
const DILIM = 6 // arka plan hazırlığında bir adımdaki düğüm

let efemerisSozu = null
const efemeris = () =>
  (efemerisSozu ??= fetch(TABAN + 'efemeris_2027.json')
    .then((y) => {
      if (!y.ok) throw hataOlustur('hata.yuklenemedi', { dosya: 'efemeris_2027.json', durum: y.status }, `efemeris_2027.json could not be loaded (HTTP ${y.status})`)
      return y.json()
    })
    .then((j) => Model.loadEphem(j)))

/** izgara → { soz: Promise<{ eph, G }>, saatlik: Map<k, {lit, up}> } */
const alanlar = new Map()
function alan(ad) {
  if (!alanlar.has(ad)) {
    const soz = Promise.all([
      efemeris(),
      fetch(TABAN + ad + '.json').then((y) => y.json()),
      fetch(TABAN + ad + '.bin').then((y) => y.arrayBuffer()),
    ]).then(([eph, G, b]) => ({ eph, G: { ...G, horizon_cdeg: new Int16Array(b) } }))
    alanlar.set(ad, { soz, saatlik: new Map() })
    soz.catch(() => alanlar.delete(ad))
    while (alanlar.size > EN_COK_ALAN) alanlar.delete(alanlar.keys().next().value)
  }
  return alanlar.get(ad)
}

async function hazir(ad) {
  const a = alan(ad)
  const { eph, G } = await a.soz
  const saatlik = (k) => {
    let s = a.saatlik.get(k)
    if (!s) a.saatlik.set(k, (s = dugumSaatlik(Model, eph, G, k)))
    return s
  }
  return { eph, G, saatlik }
}

// Arka plan hazırlığı: tek alan, merkezden dışa
let hazirlik = null
async function hazirlikBaslat(ad) {
  if (hazirlik?.ad === ad) return
  const { G, saatlik } = await hazir(ad)
  const h = Math.floor(G.n / 2)
  const sira = Array.from({ length: G.n * G.n }, (_, k) => k).sort(
    (a, b) => Math.hypot((a % G.n) - h, Math.floor(a / G.n) - h) - Math.hypot((b % G.n) - h, Math.floor(b / G.n) - h),
  )
  const bu = (hazirlik = { ad, sira, konum: 0 })
  const adim = () => {
    if (hazirlik !== bu || !alanlar.has(ad)) return
    for (let q = 0; q < DILIM && bu.konum < sira.length; q++) saatlik(sira[bu.konum++])
    if (bu.konum < sira.length) setTimeout(adim, 0)
  }
  adim()
}

self.onmessage = async ({ data: m }) => {
  if (m.tip === 'hazirla') {
    hazirlikBaslat(m.izgara).catch(() => {})
    return
  }
  try {
    const { eph, G, saatlik } = await hazir(m.izgara)
    const ks = komsuDugumler(G, m.hedef)
    const opt = { ...INIS_VARSAYILAN, batteryH: m.batteryH ?? INIS_VARSAYILAN.batteryH, target: m.hedef, ground: m.ground ?? undefined }
    let sonuc
    if (m.tip === 'oneri') {
      sonuc = oneriBul(Model, eph, G, ks, saatlik, m.bas, opt)
    } else {
      const i1 = m.bas + m.gun * 24
      if (m.bas < 0 || i1 > eph.n) throw hataOlustur('hata.pencereTasiyor', {}, 'Window extends beyond the 2027 data')
      sonuc = pencereOlasiligi(Model, G, ks, saatlik, m.bas, i1, opt)
    }
    self.postMessage({ istek: m.istek, sonuc })
  } catch (h) {
    self.postMessage({ istek: m.istek, hata: { mesaj: String(h?.message ?? h), kod: h?.kod, params: h?.params } })
  }
}
