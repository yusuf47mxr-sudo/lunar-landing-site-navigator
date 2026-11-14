// 3B arazi verisini veri paketinden public/veri/3b/ altına çıkarır.
//
// Kullanım: node scripts/ucBoyutVeriHazirla.mjs <paket>/web/data
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

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const CIKTI = path.join(KOK, 'public', 'veri', '3b')

/** bolgeler.json dosya adı (uzantısız) → paketteki site_id */
const ESLEME = {
  peak_near_cabeus_b: 'a3_peak_near_cabeus_b',
  haworth: 'a3_haworth',
  malapert_massif: 'a3_malapert_massif',
  mons_mouton: 'a3_mons_mouton',
  mons_mouton_plateau: 'a3_mons_mouton_plateau',
  nobile_rim_1: 'a3_nobile_rim_1',
  nobile_rim_2: 'a3_nobile_rim_2',
  de_gerlache_rim_2: 'a3_de_gerlache_rim_2',
  slater_plain: 'a3_slater_plain',
  apollo_11: 'apollo11',
  apollo_12: 'apollo12',
  apollo_14: 'apollo14',
  apollo_15: 'apollo15',
  apollo_16: 'apollo16',
  apollo_17: 'apollo17',
  im_1_odysseus: 'im1_odysseus',
  im_2_athena: 'im2_actual',
  blue_ghost_1: 'blueghost1',
  change_3: 'change3',
  change_4: 'change4',
  change_5: 'change5',
  change_6: 'change6',
  chandrayaan_3: 'chandrayaan3',
  slim: 'slim',
}

const paket = process.argv[2]
if (!paket) {
  console.error('Kullanım: node scripts/ucBoyutVeriHazirla.mjs <paket>/web/data')
  process.exit(1)
}

const okuJson = async (dosya) => JSON.parse(await readFile(dosya, 'utf8'))
const varMi = (dosya) => readFile(dosya).then(() => true, () => false)

await mkdir(CIKTI, { recursive: true })
const bolgeler = await okuJson(path.join(KOK, 'public', 'veri', 'bolgeler.json'))
let toplam = 0

for (const b of bolgeler) {
  const kok = b.file.replace(/\.json$/, '')
  const id = ESLEME[kok]
  if (!id) {
    console.warn(`atlandı: ${b.file} için eşleme yok`)
    continue
  }
  const araziDosya = path.join(paket, `terrain_${id}.json`)
  if (!(await varMi(araziDosya))) {
    console.warn(`atlandı: ${araziDosya} yok`)
    continue
  }
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
  const nl = neverLit ? neverLit.values.reduce((a, v) => a + v, 0) : '-'
  console.log(`${b.file.padEnd(28)} ${(metin.length / 1024).toFixed(0).padStart(4)} kB  never_lit: ${nl}`)
}
console.log(`toplam ${(toplam / 1024).toFixed(0)} kB → ${CIKTI}`)
