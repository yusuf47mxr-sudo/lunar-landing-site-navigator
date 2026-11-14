// CSV dışa aktarma (İleri mod). Saf fonksiyonlar: tarayıcıya dokunmaz,
// Node'da da çalışır. İndirme işini DisaAktar.jsx yapar.

export const CSV_SUTUNLARI = ['tarih_utc', 'sun_alt', 'sun_az', 'earth_alt', 'earth_az', 'f', 'c', 'P_W']
export const YAKLASIK_YORUMU = '# Arazi hesaba katılmadı'

/** Zaman adımının UTC damgası: "2027-01-01T00:00:00Z" */
const tarihUtc = (t0ms, k, dt) => new Date(t0ms + k * dt * 3600e3).toISOString().replace('.000Z', 'Z')

/**
 * [bas, son) aralığını CSV metnine çevirir. Her zaman adımı bir satır.
 * Açılar 2, f 3, P 2 ondalık; c 0 ya da 1.
 * alan.yaklasik ise ilk satır yorumdur ("# Arazi hesaba katılmadı").
 * @param {object} alan  bölüm 4.1 yapısında alan nesnesi
 * @param {Float32Array} f
 * @param {Float32Array} c
 * @param {Float32Array} P  anlık güç (W)
 * @param {number} bas  ilk indeks (dahil)
 * @param {number} son  son indeks (hariç)
 */
export function csvUret(alan, f, c, P, bas, son) {
  const t0ms = Date.parse(alan.t0)
  const satirlar = []
  if (alan.yaklasik) satirlar.push(YAKLASIK_YORUMU)
  satirlar.push(CSV_SUTUNLARI.join(','))
  const b = Math.max(0, bas)
  const s = Math.min(alan.n, son)
  for (let k = b; k < s; k++) {
    satirlar.push(
      [
        tarihUtc(t0ms, k, alan.dt_hours),
        alan.sun_alt[k].toFixed(2),
        alan.sun_az[k].toFixed(2),
        alan.earth_alt[k].toFixed(2),
        alan.earth_az[k].toFixed(2),
        f[k].toFixed(3),
        c[k] > 0 ? 1 : 0,
        P[k].toFixed(2),
      ].join(','),
    )
  }
  return satirlar.join('\n') + '\n'
}

/** İniş gününün ISO tarihi: "2027-01-01" */
export function inisGunu(alan, tL) {
  return new Date(Date.parse(alan.t0) + tL * alan.dt_hours * 3600e3).toISOString().slice(0, 10)
}

/**
 * İndirilecek dosyanın adı.
 *   Görev aralığı: <dosya_adi>_<iniş tarihi>_<D>g.csv   → malapert_massif_2027-01-01_30g.csv
 *   Tüm yıl      : <dosya_adi>_<yıl>_tum_yil.csv        → malapert_massif_2027_tum_yil.csv
 * @param {string} dosyaAdi  bolgeler.json'daki "file" (uzantılı ya da uzantısız) veya özel nokta adı
 */
export function csvDosyaAdi(dosyaAdi, alan, tL, D, kapsam) {
  const kok = dosyaAdi.replace(/\.json$/i, '')
  if (kapsam === 'yil') return `${kok}_${alan.t0.slice(0, 4)}_tum_yil.csv`
  return `${kok}_${inisGunu(alan, tL)}_${D}g.csv`
}

/** Özel nokta için dosya adı kökü: "ozel_-45.00_120.50" */
export const ozelDosyaAdi = (lat, lon) => `ozel_${lat.toFixed(2)}_${lon.toFixed(2)}`
