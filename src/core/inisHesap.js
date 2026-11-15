// İniş başarı olasılığı hesabı: paketin model.js'i (landingOdds, hourly) olduğu
// gibi; rehber §6, §9. Pencere hesabı inisPencere.js'te: düğümlerin bütün yılın
// saatlik aydınlık / Dünya bitleri bir kez hesaplanır, sonra her pencere (kart t
// ile kayar; öneri taraması ~350 pencere) milisaniyeler sürer.
//
// Normalde Web Worker'da çalışır (inisIsci.js ince sarmalayıcıdır). İşçi
// başlamaz ya da hata verirse aynı modül ana iş parçacığında yüklenir
// (uc/inisOlasiligi.js yedek yolu); iki yol da model.js'i planbModel.js'ten alır.

import { hataOlustur } from './hata.js'
import Model from './planbModel.js'
import { dugumSaatlik, INIS_VARSAYILAN, komsuDugumler, oneriBul, pencereOlasiligi } from './inisPencere.js'

const TABAN = `${(import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/')}veri/3b/`
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
export async function hazirlikBaslat(ad) {
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

/**
 * Tek istek (işçide ya da yedek yolda ana iş parçacığında aynı kod).
 * @param {{ tip: 'hesapla'|'oneri', izgara, bas, gun?, hedef, ground, batteryH }} m
 */
export async function inisIstegi(m) {
  const { eph, G, saatlik } = await hazir(m.izgara)
  const ks = komsuDugumler(G, m.hedef)
  const opt = { ...INIS_VARSAYILAN, batteryH: m.batteryH ?? INIS_VARSAYILAN.batteryH, target: m.hedef, ground: m.ground ?? undefined }
  if (m.tip === 'oneri') return oneriBul(Model, eph, G, ks, saatlik, m.bas, opt)
  const i1 = m.bas + m.gun * 24
  if (m.bas < 0 || i1 > eph.n) throw hataOlustur('hata.pencereTasiyor', {}, 'Window extends beyond the 2027 data')
  return pencereOlasiligi(Model, G, ks, saatlik, m.bas, i1, opt)
}
