// 3B arazi verisini veri paketinden public/veri/3b/ altına çıkarır.
//
// Kullanım: npm run veri:3b [-- <paket>/web/data]   (varsayılan veri_kaynak/planb/web/data)
//
// Girdi (paket, docs/VERI_SOZLESMESI.md):
//   terrain_<id>.json  { site_id, n: 201, spacing_m: 50, dem, z0_m, dz_m[n*n] }
//   grid_<id>.json     { n: 31, spacing_m: 100, never_lit_18y[n*n], ... }   (yalnız kutup alanları)
// Sıra her ikisinde k = j·n + i; j güneyden kuzeye, i batıdan doğuya.
//
// Çıktı: public/veri/3b/<bolgeler.json "file">  — alan dosyasıyla aynı ad.
//   { site, source_id, dem, n, spacing_m, z0_m, dz_m[n*n],
//     never_lit: { n, spacing_m, values[n*n], note } | null }
// Yalnız seçili alanınki yüklenir (uc/veri.js).
//
// Alan → paket kimliği eşlemesi, sırayla:
//   1. bolgeler.json kaydındaki "id" (paketin sites.json kimliği; gercekVeriDonustur yazar)
//   2. paketteki sites.json'da koordinatı KOORDINAT_TOLERANS içindeki site
// bolgeler.json'da karşılığı olmayan eski 3B alan dosyaları silinir.
// Eşlenemeyen alan atlanır ve listelenir; kullanılmayan paket siteleri de yazılır.
//
// Ayrıca sonraki adımlar için olduğu gibi kopyalanır (public/veri/3b/):
//   moon/ (renk ve yükseklik dokuları), dem_south_400m.bin/.json, artemis_regions.geo.json

import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const CIKTI = path.join(KOK, 'public', 'veri', '3b')


const paket = path.resolve(process.argv[2] ?? path.join(KOK, 'veri_kaynak', 'planb', 'web', 'data'))

const okuJson = async (dosya) => JSON.parse(await readFile(dosya, 'utf8'))
const varMi = (dosya) => readFile(dosya).then(() => true, () => false)

const KOORDINAT_TOLERANS = 0.05 // derece (enlem ve boylam farkı)
const boylamFarki = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180)

await mkdir(CIKTI, { recursive: true })
const bolgeler = await okuJson(path.join(KOK, 'public', 'veri', 'bolgeler.json'))
const paketSiteleri = (await varMi(path.join(paket, 'sites.json')))
  ? (await okuJson(path.join(paket, 'sites.json'))).sites
  : []

/** bolgeler.json kaydı → paket site_id (ya da null) ve eşleme yolu */
function kimlikBul(b) {
  if (b.id && paketSiteleri.some((s) => s.id === b.id)) return { id: b.id, yol: 'id' }
  if (b.id) return { id: b.id, yol: 'id' } // sites.json yoksa yine de dene
  const yakin = paketSiteleri.find(
    (s) => Math.abs(s.lat - b.lat) <= KOORDINAT_TOLERANS && boylamFarki(s.lon, b.lon) <= KOORDINAT_TOLERANS,
  )
  return yakin ? { id: yakin.id, yol: 'koordinat' } : { id: null, yol: null }
}

let toplam = 0
let yazilan = 0
const kullanilan = new Set()
const atlanan = []

for (const b of bolgeler) {
  const { id, yol } = kimlikBul(b)
  if (!id) {
    atlanan.push(`${b.site} (${b.file}): eşleme yok`)
    continue
  }
  const araziDosya = path.join(paket, `terrain_${id}.json`)
  if (!(await varMi(araziDosya))) {
    atlanan.push(`${b.site} (${b.file}): terrain_${id}.json yok`)
    continue
  }
  kullanilan.add(id)
  const arazi = await okuJson(araziDosya)
  if (arazi.dz_m.length !== arazi.n * arazi.n) throw new Error(`${id}: dz_m uzunluğu n² değil`)

  let neverLit = null
  const izgaraDosya = path.join(paket, `grid_${id}.json`)
  if (await varMi(izgaraDosya)) {
    const g = await okuJson(izgaraDosya)
    if (g.never_lit_18y) {
      neverLit = {
        n: g.n,
        spacing_m: g.spacing_m,
        values: g.never_lit_18y.map((v) => (v ? 1 : 0)),
        note: g.stats_18y_note ?? null,
      }
    }
  }

  const cikti = {
    site: b.site,
    source_id: id,
    dem: arazi.dem,
    n: arazi.n,
    spacing_m: arazi.spacing_m,
    z0_m: arazi.z0_m,
    dz_m: arazi.dz_m.map((v) => Math.round(v)),
    never_lit: neverLit,
  }
  const hedef = path.join(CIKTI, b.file)
  const metin = JSON.stringify(cikti)
  await writeFile(hedef, metin)
  toplam += metin.length
  yazilan++
  const nl = neverLit ? neverLit.values.reduce((a, v) => a + v, 0) : '-'
  console.log(
    `${b.file.padEnd(28)} ← ${id.padEnd(24)} (${yol}) ${(metin.length / 1024).toFixed(0).padStart(4)} kB  never_lit: ${nl}`,
  )
}
console.log(`\n${yazilan}/${bolgeler.length} alan, toplam ${(toplam / 1024).toFixed(0)} kB → ${CIKTI}`)
if (atlanan.length) console.warn('ATLANAN:\n  ' + atlanan.join('\n  '))
const bos = paketSiteleri.map((s) => s.id).filter((id) => !kullanilan.has(id))
if (bos.length) console.log(`Pakette olup bolgeler.json'da karşılığı olmayan siteler: ${bos.join(', ')}`)

// --- bolgeler.json'da olmayan eski alan dosyalarını sil ---------------------
const KOPYA_ADLARI = new Set(['dem_south_400m.json', 'artemis_regions.geo.json'])
const gecerli = new Set(bolgeler.map((b) => b.file))
for (const ad of await readdir(CIKTI)) {
  if (!ad.endsWith('.json') || gecerli.has(ad) || KOPYA_ADLARI.has(ad)) continue
  await unlink(path.join(CIKTI, ad))
  console.log(`silindi: ${ad}`)
}

// --- Sonraki adımlar için olduğu gibi kopyalanan dosyalar -------------------
const KOPYALAR = ['dem_south_400m.bin', 'dem_south_400m.json', 'artemis_regions.geo.json']
for (const ad of KOPYALAR) {
  await copyFile(path.join(paket, ad), path.join(CIKTI, ad))
  console.log(`kopyalandı: ${ad}`)
}
await mkdir(path.join(CIKTI, 'moon'), { recursive: true })
for (const ad of await readdir(path.join(paket, 'moon'))) {
  await copyFile(path.join(paket, 'moon', ad), path.join(CIKTI, 'moon', ad))
  console.log(`kopyalandı: moon/${ad}`)
}
