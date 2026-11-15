// 16 bit gri PNG çözücü (renk türü 0, bit derinliği 16, taramasız).
// Tarayıcı <img>/canvas ile PNG'yi 8 bite indirir; Ay yükseklik haritasında
// (≈ 19 km aralık) 8 bit ≈ 76 m basamak demektir ve normal haritasında
// denizlerde kontur çizgileri oluşur. Bu yüzden ham örnekler okunur.
// Açma: DecompressionStream('deflate') — PNG IDAT verisi zlib akışıdır.

import { hataOlustur } from '../../core/hata.js'

const IMZA = [137, 80, 78, 71, 13, 10, 26, 10]

async function zlibAc(veri) {
  const akis = new Blob([veri]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(akis).arrayBuffer())
}

/** Paeth öngörücüsü (PNG belirtimi). */
function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

/**
 * @param {ArrayBuffer} tampon PNG dosyası
 * @returns {Promise<{ genislik: number, yukseklik: number, veri: Uint16Array }>} satır satır, üst satır ilk
 */
export async function png16Coz(tampon) {
  const b = new Uint8Array(tampon)
  for (let i = 0; i < 8; i++) if (b[i] !== IMZA[i]) throw hataOlustur('kure.hata.pngDegil', {}, 'Not a PNG')
  const dv = new DataView(tampon)
  let genislik = 0
  let yukseklik = 0
  const parcalar = []
  let toplam = 0
  for (let i = 8; i < b.length; ) {
    const uzunluk = dv.getUint32(i)
    const tur = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7])
    const bas = i + 8
    if (tur === 'IHDR') {
      genislik = dv.getUint32(bas)
      yukseklik = dv.getUint32(bas + 4)
      const [derinlik, renk, , , tarama] = [b[bas + 8], b[bas + 9], b[bas + 10], b[bas + 11], b[bas + 12]]
      if (derinlik !== 16 || renk !== 0 || tarama !== 0) throw hataOlustur('kure.hata.pngBicim', {}, 'Only 16-bit grayscale, non-interlaced PNG is supported')
    } else if (tur === 'IDAT') {
      parcalar.push(b.subarray(bas, bas + uzunluk))
      toplam += uzunluk
    } else if (tur === 'IEND') break
    i = bas + uzunluk + 4 // + CRC
  }
  const birlesik = new Uint8Array(toplam)
  let o = 0
  for (const p of parcalar) {
    birlesik.set(p, o)
    o += p.length
  }
  const ham = await zlibAc(birlesik)

  const bpp = 2 // piksel başına bayt
  const satir = genislik * bpp
  if (ham.length < (satir + 1) * yukseklik) throw hataOlustur('kure.hata.pngEksik', {}, 'PNG data incomplete')
  const cikti = new Uint8Array(satir * yukseklik)
  for (let y = 0; y < yukseklik; y++) {
    const filtre = ham[y * (satir + 1)]
    const kaynak = y * (satir + 1) + 1
    const hedef = y * satir
    const onceki = hedef - satir
    for (let x = 0; x < satir; x++) {
      const r = ham[kaynak + x]
      const a = x >= bpp ? cikti[hedef + x - bpp] : 0
      const u = y > 0 ? cikti[onceki + x] : 0
      const c = x >= bpp && y > 0 ? cikti[onceki + x - bpp] : 0
      let v
      switch (filtre) {
        case 0: v = r; break
        case 1: v = r + a; break
        case 2: v = r + u; break
        case 3: v = r + ((a + u) >> 1); break
        case 4: v = r + paeth(a, u, c); break
        default: throw hataOlustur('kure.hata.pngFiltre', { filtre }, `Unknown PNG filter ${filtre}`)
      }
      cikti[hedef + x] = v & 255
    }
  }
  const veri = new Uint16Array(genislik * yukseklik)
  for (let k = 0; k < veri.length; k++) veri[k] = (cikti[2 * k] << 8) | cikti[2 * k + 1] // büyük uçlu
  return { genislik, yukseklik, veri }
}
