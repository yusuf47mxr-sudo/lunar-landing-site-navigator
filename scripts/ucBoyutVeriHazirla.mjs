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
// v5 ML katmanı (10 alan): mlcraters_<id>.json → mlcraters_<file>, nac_<id>.png →
// nac_<file adı>.png; 3B arazi dosyasına "ml" bilgisi eklenir (yalnız seçili alanınki
// ve yalnız katman açılınca iner). ml_calibration.json olduğu gibi kopyalanır.
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

  // ML küçük krater taraması + NAC fotoğrafı (v5; yalnız taranan alanlar)
  let ml = null
  const mlDosya = path.join(paket, `mlcraters_${id}.json`)
  if (await varMi(mlDosya)) {
    const m = await okuJson(mlDosya)
    const kok = b.file.replace(/\.json$/, '')
    const krater = `mlcraters_${b.file}`
    const foto = `nac_${kok}.png`
    await writeFile(
      path.join(CIKTI, krater),
      JSON.stringify({
        site: b.site,
        source_id: id,
        model: m.model,
        conf: m.conf,
        d_min_used_m: m.d_min_used_m,
        foot_r_m: m.foot_r_m,
        source: m.source,
        frame: m.frame,
        dark_rule: m.dark_rule,
        ml_applied: m.ml_applied !== false,
        ml_note: m.ml_note ?? null,
        // Tespit isabet oranı (precision) / bulma oranı, D aralığına göre — kutup testi (GR1, eksiksiz etiket)
        accuracy: { polar_GR1_complete: m.accuracy?.polar_GR1_complete ?? null },
        // [doğu m, kuzey m, D m, güven] — ızgara merkezine göre
        craters: m.craters.map(([e, n, D, g]) => [Math.round(e * 10) / 10, Math.round(n * 10) / 10, Math.round(D * 10) / 10, g]),
        // 31×31, 100 m; k = j·31 + i (j güneyden kuzeye). haz_frac null = görüntü karanlık → bilinmiyor
        node: { n: 31, spacing_m: 100, haz_frac: m.node.haz_frac, dens_km2: m.node.dens_km2, observable: m.node.observable },
      }),
    )
    await copyFile(path.join(paket, m.texture.file), path.join(CIKTI, foto))
    // İniş olasılığı (model.js landingNodes/landingOdds) için 31×31 ızgara: konum, eğim, ufuk.
    // horizon_cdeg (961 × 180, ufuk × 100) Int16 ikili dosyada; geri kalanı JSON.
    const g = await okuJson(path.join(paket, `grid_${id}.json`))
    const izgara = `izgara_${kok}`
    const hc = Int16Array.from(g.horizon_cdeg)
    if (hc.some((v, k) => v !== g.horizon_cdeg[k])) throw new Error(`${id}: horizon_cdeg Int16'ya sığmıyor`)
    await writeFile(path.join(CIKTI, izgara + '.bin'), Buffer.from(hc.buffer))
    await writeFile(
      path.join(CIKTI, izgara + '.json'),
      JSON.stringify({ site_id: id, n: g.n, spacing_m: g.spacing_m, n_az: g.n_az, lat: g.lat, lon: g.lon, ground_m: g.ground_m, slope_deg: g.slope_deg }),
    )
    // uygulandi: false → ML bu görüntüye uygulanmadı (v7: Chang'e 3/4, görüntü 1.6 / 1.4 m/px;
    // model ≤ 1.3 m/px ile sınandı) — yalnız fotoğraf, krater ve tehlike kapalı
    ml = { kraterler: krater, foto, yari_m: m.texture.half_extent_m, m_px: m.texture.m_per_px, izgara, uygulandi: m.ml_applied !== false }
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
    ml,
  }
  const hedef = path.join(CIKTI, b.file)
  const metin = JSON.stringify(cikti)
  await writeFile(hedef, metin)
  toplam += metin.length
  yazilan++
  const nl = neverLit ? neverLit.values.reduce((a, v) => a + v, 0) : '-'
  console.log(
    `${b.file.padEnd(28)} ← ${id.padEnd(24)} (${yol}) ${(metin.length / 1024).toFixed(0).padStart(4)} kB  never_lit: ${nl}${ml ? '  + ML + NAC' : ''}`,
  )
}
console.log(`\n${yazilan}/${bolgeler.length} alan, toplam ${(toplam / 1024).toFixed(0)} kB → ${CIKTI}`)
if (atlanan.length) console.warn('ATLANAN:\n  ' + atlanan.join('\n  '))
const bos = paketSiteleri.map((s) => s.id).filter((id) => !kullanilan.has(id))
if (bos.length) console.log(`Pakette olup bolgeler.json'da karşılığı olmayan siteler: ${bos.join(', ')}`)

// --- bolgeler.json'da olmayan eski alan dosyalarını sil ---------------------
const KOPYA_ADLARI = new Set(['dem_south_400m.json', 'artemis_regions.geo.json', 'ml_calibration.json', 'efemeris_2027.json'])
const gecerli = new Set(bolgeler.flatMap((b) => [b.file, `mlcraters_${b.file}`, `izgara_${b.file}`]))
for (const ad of await readdir(CIKTI)) {
  if (!ad.endsWith('.json') || gecerli.has(ad) || KOPYA_ADLARI.has(ad)) continue
  await unlink(path.join(CIKTI, ad))
  console.log(`silindi: ${ad}`)
}

// --- Sonraki adımlar için olduğu gibi kopyalanan dosyalar -------------------
const KOPYALAR = ['dem_south_400m.bin', 'dem_south_400m.json', 'artemis_regions.geo.json', 'ml_calibration.json']
for (const ad of KOPYALAR) {
  await copyFile(path.join(paket, ad), path.join(CIKTI, ad))
  console.log(`kopyalandı: ${ad}`)
}
// --- İniş olasılığı için 2027 efemeris dilimi (paketin ham vektörleri, birebir) ---
{
  const e = await okuJson(path.join(paket, 'ephem_hourly.json'))
  const t0 = Date.parse(e.start_utc + 'Z')
  const bas = Math.round((Date.parse('2027-01-01T00:00:00Z') - t0) / (e.step_s * 1000))
  const n = 8760
  if (bas < 0 || bas + n > e.n) throw new Error('ephem_hourly 2027 yılını kapsamıyor')
  await writeFile(
    path.join(CIKTI, 'efemeris_2027.json'),
    JSON.stringify({
      start_utc: '2027-01-01T00:00:00',
      step_s: e.step_s,
      n,
      frame: e.frame,
      source: `ephem_hourly.json [${bas}, ${bas + n})`,
      sun_dir: e.sun_dir.slice(3 * bas, 3 * (bas + n)),
      earth_km: e.earth_km.slice(3 * bas, 3 * (bas + n)),
      sun_au: e.sun_au.slice(bas, bas + n),
    }),
  )
  console.log(`yazıldı: efemeris_2027.json (ephem indeksi ${bas}…${bas + n - 1})`)
}

await mkdir(path.join(CIKTI, 'moon'), { recursive: true })
for (const ad of await readdir(path.join(paket, 'moon'))) {
  await copyFile(path.join(paket, 'moon', ad), path.join(CIKTI, 'moon', ad))
  console.log(`kopyalandı: moon/${ad}`)
}
