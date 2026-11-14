// public/veri/ altından JSON yükleme ve bellekte önbellekleme.
//
// KURAL: Alan dosyasının adı ASLA alan adından türetilmez; her zaman
// bolgeler.json'daki "file" alanı kullanılır. Gerçek veri geldiğinde
// dosya adları farklı olabilir.
//
// Varsayılan yükleyici tarayıcıda fetch kullanır. Node betikleri
// `yukleyiciAyarla` ile dosya sisteminden okuyan bir yükleyici verir.

const ZAMAN_ALANLARI = ['sun_alt', 'sun_az', 'earth_alt', 'earth_az']
const EFEMERIS_ALANLARI = ['sun_sub_lat', 'sun_sub_lon', 'earth_sub_lat', 'earth_sub_lon']

const tabanYol = () => {
  const taban = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return `${taban.replace(/\/?$/, '/')}veri/`
}

async function fetchIleOku(dosya) {
  const yanit = await fetch(tabanYol() + dosya)
  if (!yanit.ok) throw new Error(`${dosya} yüklenemedi (HTTP ${yanit.status})`)
  return yanit.json()
}

let jsonOku = fetchIleOku

/** Yükleyiciyi değiştirir (ör. Node'da fs). Önbelleği temizler. */
export function yukleyiciAyarla(fn) {
  jsonOku = fn
  onbellegiTemizle()
}

// --- Önbellek -------------------------------------------------------------
// Söz (promise) saklanır: aynı dosya için eş zamanlı istekler tek indirmeye iner.
// Çözülen nesneler ayrıca `hazir` içinde tutulur; senkron erişim için.

const sozler = new Map()
const hazir = new Map()

function onbellekli(anahtar, uret) {
  if (!sozler.has(anahtar)) {
    const soz = uret().then(
      (deger) => {
        hazir.set(anahtar, deger)
        return deger
      },
      (hata) => {
        sozler.delete(anahtar) // başarısız yükleme önbellekte kalmasın
        throw hata
      },
    )
    sozler.set(anahtar, soz)
  }
  return sozler.get(anahtar)
}

export function onbellegiTemizle() {
  sozler.clear()
  hazir.clear()
}

// --- Dönüştürme -----------------------------------------------------------

/** Alan dosyasındaki sayı dizilerini Float32Array'e çevirir (bölüm 5.9). */
export function alanHazirla(ham) {
  const alan = { ...ham, horizon: {} }
  for (const [hm, dizi] of Object.entries(ham.horizon)) {
    alan.horizon[hm] = Float32Array.from(dizi)
  }
  for (const k of ZAMAN_ALANLARI) alan[k] = Float32Array.from(ham[k])
  return alan
}

function efemerisHazirla(ham) {
  const e = { ...ham }
  for (const k of EFEMERIS_ALANLARI) e[k] = Float32Array.from(ham[k])
  return e
}

// --- Yükleyiciler ---------------------------------------------------------

/** bolgeler.json: [{ site, kategori, aciklama, lat, lon, file }] */
export function bolgeleriYukle() {
  return onbellekli('bolgeler', () => jsonOku('bolgeler.json'))
}

/** Alan adından, bolgeler.json'daki "file" alanını kullanarak alan verisini yükler. */
export function alanYukle(site) {
  return onbellekli(`alan:${site}`, async () => {
    const bolgeler = await bolgeleriYukle()
    const kayit = bolgeler.find((b) => b.site === site)
    if (!kayit) throw new Error(`Bilinmeyen alan: ${site}`)
    if (!kayit.file) throw new Error(`bolgeler.json'da "${site}" için "file" yok`)
    return alanHazirla(await jsonOku(kayit.file))
  })
}

export function efemerisYukle() {
  return onbellekli('efemeris', async () => efemerisHazirla(await jsonOku('efemeris.json')))
}

export function ozetYukle() {
  return onbellekli('ozet', () => jsonOku('ozet.json'))
}

/** Önbellekte hazırsa alan verisini senkron döndürür, değilse undefined. */
export function alanOnbellekte(site) {
  return hazir.get(`alan:${site}`)
}

export function bolgelerOnbellekte() {
  return hazir.get('bolgeler')
}

export function ozetOnbellekte() {
  return hazir.get('ozet')
}

export function efemerisOnbellekte() {
  return hazir.get('efemeris')
}
