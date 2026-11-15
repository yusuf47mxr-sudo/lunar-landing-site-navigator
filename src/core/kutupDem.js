// Güney kutbu 400 m DEM'i (paketin dem_south_400m.bin/.json; LOLA LDEM_80S_80MPP_ADJ,
// 5×5 blok ortalaması, kutup stereografik). Hem özel koordinatın kaba ufku
// (ozelNokta.js) hem 3B (küre kutup yaması, özel noktanın kaba arazisi) kullanır;
// bir kez indirilir. Biçim model.js demSample/horizonFromDem'in beklediği:
// { width, height, pixel_m, x0, y0, z: Int16Array (m) }.

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/3b/`
}

/** DEM'in kapsadığı en kuzey enlem (°): x0 = −304 km → kutuptan ≈ 10°. */
export const KUTUP_DEM_ENLEM = -80

let soz = null
let hazir = null

export function kutupDemYukle() {
  if (!soz) {
    soz = Promise.all([
      fetch(tabanYol() + 'dem_south_400m.json').then((y) => {
        if (!y.ok) throw new Error(`Kutup DEM bilgisi yüklenemedi (HTTP ${y.status})`)
        return y.json()
      }),
      fetch(tabanYol() + 'dem_south_400m.bin').then((y) => {
        if (!y.ok) throw new Error(`Kutup DEM'i yüklenemedi (HTTP ${y.status})`)
        return y.arrayBuffer()
      }),
    ])
      .then(([bilgi, tampon]) => (hazir = { ...bilgi, z: new Int16Array(tampon) }))
      .catch((h) => {
        soz = null
        throw h
      })
  }
  return soz
}

/** Önbellekte hazırsa DEM, değilse undefined. */
export const kutupDemOnbellekte = () => hazir ?? undefined

// Özel koordinatın kaba ufku için DEM + paketin model.js'i birlikte; model.js
// dinamik içe aktarılır (ana pakete girmez, yalnız 80°G içi özel noktada iner).
let araclarSozu = null
let araclar = null
export function kabaUfukAraclariYukle() {
  if (!araclarSozu) {
    araclarSozu = Promise.all([kutupDemYukle(), import('./planbModel.js')])
      .then(([dem, modul]) => (araclar = { dem, Model: modul.default }))
      .catch((h) => {
        araclarSozu = null
        throw h
      })
  }
  return araclarSozu
}
export const kabaUfukAraclariOnbellekte = () => araclar ?? undefined
