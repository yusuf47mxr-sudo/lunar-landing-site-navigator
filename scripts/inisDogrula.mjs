// Krater kartının hızlı pencere hesabını (src/core/inisPencere.js) paketin
// landingNodes + landingOdds'u ile karşılaştırır ve rehber örneğini denetler:
//   Haworth, 2027-10-11, 14 gün, merkez hücre → fizik %92.6, ML ile %66.9.
// Kullanım: npm run veri:inis

import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { komsuDugumler, dugumSaatlik, oneriBul, pencereOlasiligi } from '../src/core/inisPencere.js'

const KOK = new URL('../', import.meta.url)
const VERI = new URL('public/veri/3b/', KOK)
const MODEL_JS = new URL('src/vendor/planb/model.js', KOK)

const kapsam = { console }
kapsam.globalThis = kapsam
vm.runInNewContext(await readFile(MODEL_JS, 'utf8'), kapsam, { filename: MODEL_JS.pathname })
const Model = kapsam.Model

const eph = Model.loadEphem(JSON.parse(await readFile(new URL('efemeris_2027.json', VERI), 'utf8')))
async function izgara(ad) {
  const G = JSON.parse(await readFile(new URL(ad + '.json', VERI), 'utf8'))
  const b = await readFile(new URL(ad + '.bin', VERI))
  return { ...G, horizon_cdeg: new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2) }
}
const OPT = { sigmaM: 100, slopeMax: 10, batteryH: 50, bufferH: 24 }
const saatIndeksi = (iso) => Math.round((Date.parse(iso) - Date.UTC(2027, 0, 1)) / 3600e3)

let hata = 0
const denetle = (ad, kosul) => {
  console.log(`${kosul ? 'TAMAM' : 'HATA '}  ${ad}`)
  if (!kosul) hata++
}

for (const [ad, mlAd] of [
  ['izgara_a3_haworth', 'mlcraters_a3_haworth'],
  ['izgara_a3_malapert_massif', 'mlcraters_a3_malapert_massif'],
]) {
  const G = await izgara(ad)
  const ml = JSON.parse(await readFile(new URL(mlAd + '.json', VERI), 'utf8'))
  const ground = ml.node.haz_frac
  const onbellek = new Map()
  const saatlik = (k) => (onbellek.has(k) || onbellek.set(k, dugumSaatlik(Model, eph, G, k)), onbellek.get(k))
  const h = Math.floor(G.n / 2)

  const pencereler = [
    [saatIndeksi('2027-10-11T00:00:00Z'), 14],
    [610, 14],
    [0, 30],
    [4000, 14],
  ]
  const hedefler = [{ i: h, j: h }, { i: 3, j: 27 }, { i: 0, j: 30 }, { i: 20, j: 9 }]
  let enBuyukFark = 0
  for (const [i0, D] of pencereler) {
    const nodes = Model.landingNodes(eph, G, i0, i0 + D * 24)
    for (const hedef of hedefler) {
      const ks = komsuDugumler(G, hedef)
      for (const gr of [undefined, ground]) {
        const tam = Model.landingOdds(G, nodes, { ...OPT, target: hedef, best: 0, ground: gr })
        const hizli = pencereOlasiligi(Model, G, ks, saatlik, i0, i0 + D * 24, { ...OPT, target: hedef, ground: gr })
        const fark = Math.max(
          Math.abs(tam.pLow - hizli.pLow),
          ...Object.keys(tam.reasons).map((r) => Math.abs(tam.reasons[r] - hizli.reasons[r])),
        )
        enBuyukFark = Math.max(enBuyukFark, fark)
      }
    }
  }
  denetle(`${ad}: hızlı yol = landingNodes (en büyük fark ${enBuyukFark.toExponential(1)})`, enBuyukFark < 1e-6)

  if (ad === 'izgara_a3_haworth') {
    const t = saatIndeksi('2027-10-11T00:00:00Z')
    const ks = komsuDugumler(G, { i: h, j: h })
    const fizik = pencereOlasiligi(Model, G, ks, saatlik, t, t + 336, { ...OPT, target: { i: h, j: h } })
    const mlli = pencereOlasiligi(Model, G, ks, saatlik, t, t + 336, { ...OPT, target: { i: h, j: h }, ground })
    console.log(`       Haworth 2027-10-11, 14 gün, merkez: fizik %${(100 * fizik.pLow).toFixed(1)}, ML ile %${(100 * mlli.pLow).toFixed(1)}`)
    denetle('rehber örneği %92.6 / %66.9', (100 * fizik.pLow).toFixed(1) === '92.6' && (100 * mlli.pLow).toFixed(1) === '66.9')
  }

  const ks = komsuDugumler(G, { i: h, j: h })
  const bas = 610
  const r = pencereOlasiligi(Model, G, ks, saatlik, bas, bas + 336, { ...OPT, target: { i: h, j: h }, ground })
  const t0 = performance.now()
  const oneri = oneriBul(Model, eph, G, ks, saatlik, bas, { ...OPT, target: { i: h, j: h }, ground })
  const tarih = (t) => new Date(Date.UTC(2027, 0, 1) + t * 3600e3).toISOString().slice(0, 10)
  console.log(
    `       t=610, 14 gün, merkez: %${(100 * r.pLow).toFixed(1)}; öneri: ${oneri ? `${tarih(oneri.t)} %${(100 * oneri.pLow).toFixed(1)}` : 'yok'} (${(performance.now() - t0).toFixed(0)} ms)`,
  )
}

process.exit(hata ? 1 : 0)
