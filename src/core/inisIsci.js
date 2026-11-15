// İniş başarı olasılığı işçisi (Web Worker). Paketin model.js'i (landingNodes,
// landingOdds) olduğu gibi kullanılır; rehber §6, §9.
//
// landingNodes 961 ızgara noktası × pencere saatini tarar (30 günde ~0.7 M adım);
// ana iş parçacığını kilitlemesin diye burada. Sonuç alan + pencere başına önbellekte.
// Mesajlar:
//   { tip: 'hesapla', istek, izgara, tL, D, hedef: { i, j }, ground }  → { istek, sonuc | hata }
//   { tip: 'hazirla', izgara, tL, D }                                 (yalnız düğümleri önceden hesaplar)

import Model from './planbModel.js'

const TABAN = `${(import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/')}veri/3b/`
/** Rehber §9 varsayılanları (Haworth örneği ile aynı). */
export const INIS_VARSAYILAN = { sigmaM: 100, slopeMax: 10, batteryH: 50, bufferH: 24 }

let efemerisSozu = null
const izgaralar = new Map()
const dugumler = new Map()

const efemeris = () =>
  (efemerisSozu ??= fetch(TABAN + 'efemeris_2027.json')
    .then((y) => {
      if (!y.ok) throw new Error(`efemeris_2027.json yüklenemedi (HTTP ${y.status})`)
      return y.json()
    })
    .then((j) => Model.loadEphem(j)))

function izgara(ad) {
  if (!izgaralar.has(ad)) {
    izgaralar.set(
      ad,
      Promise.all([fetch(TABAN + ad + '.json').then((y) => y.json()), fetch(TABAN + ad + '.bin').then((y) => y.arrayBuffer())]).then(
        ([G, b]) => ({ ...G, horizon_cdeg: new Int16Array(b) }),
      ),
    )
  }
  return izgaralar.get(ad)
}

/** landingNodes, pencere [tL, tL + D·24) saat (efemeris dilimi 2027-01-01'de başlar). */
function dugum(ad, tL, D) {
  const anahtar = `${ad}|${tL}|${D}`
  if (!dugumler.has(anahtar)) {
    dugumler.set(
      anahtar,
      Promise.all([efemeris(), izgara(ad)]).then(([eph, G]) => {
        const i1 = tL + D * 24
        if (tL < 0 || i1 > eph.n) throw new Error('Görev penceresi 2027 verisinin dışına taşıyor')
        return { G, nodes: Model.landingNodes(eph, G, tL, i1) }
      }),
    )
    // Önbellek küçük kalsın: aynı alan için yalnız son 3 pencere
    const ayni = [...dugumler.keys()].filter((k) => k.startsWith(ad + '|'))
    while (ayni.length > 3) dugumler.delete(ayni.shift())
  }
  return dugumler.get(anahtar)
}

self.onmessage = async ({ data: m }) => {
  if (m.tip === 'hazirla') {
    dugum(m.izgara, m.tL, m.D).catch(() => {})
    return
  }
  try {
    const { G, nodes } = await dugum(m.izgara, m.tL, m.D)
    const r = Model.landingOdds(G, nodes, { ...INIS_VARSAYILAN, target: m.hedef, best: 0, ground: m.ground ?? undefined })
    self.postMessage({
      istek: m.istek,
      sonuc: { pLow: r.pLow, outside: r.outside, reasons: r.reasons, groundUnknown: r.groundUnknown ?? 0 },
    })
  } catch (h) {
    self.postMessage({ istek: m.istek, hata: String(h?.message ?? h) })
  }
}
