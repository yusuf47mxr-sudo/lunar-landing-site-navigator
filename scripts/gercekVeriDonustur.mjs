// Gerçek veri paketini (Plan B v4) bizim veri sözleşmemize (CLAUDE.md §4) çevirir.
//
// Kullanım: npm run veri:donustur [-- <paket>/web/data]   (varsayılan veri_kaynak/planb/web/data)
//
// Kaynak: paketin web/js/model.js'i — formül kopyalanmaz; dosya vm içinde olduğu
// gibi çalıştırılır ve basis / azel / loadEphem kullanılır (model_check.js ile
// Python'a birebir doğrulanmış kütüphane).
//
// Çıktı (public/veri/):
//   <id>.json      alan dosyası: 2027-01-01T00:00:00Z'den 8760 saat (ephem indeksi 1464)
//                  sun_alt/az, earth_alt/az (Dünya paralaksı dahil), sun_au,
//                  horizon "0"/"2"/"10" (720 yön, 0.5° — paketle aynı)
//   bolgeler.json  26 alan; kısa ad, kategori, Türkçe açıklama, kaynak, arazi türü
//                  (ad ve açıklama aşağıdaki AD / ACIKLAMA tablolarından; eşleme paket kimliğiyle)
//   efemeris.json  saatlik alt-noktalar (özel koordinat için) + sun_au + earth_dist_km
// Eski alan dosyaları (bolgeler.json'da olmayan *.json) silinir.

import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAKET = path.resolve(process.argv[2] ?? path.join(KOK, 'veri_kaynak', 'planb', 'web', 'data'))
const MODEL_JS = path.join(PAKET, '..', 'js', 'model.js')
const CIKTI = path.join(KOK, 'public', 'veri')

const BASLANGIC_UTC = '2027-01-01T00:00:00Z'
const SAAT = 8760
const DIREKLER = [0, 2, 10]
const KORUNAN = new Set(['bolgeler.json', 'efemeris.json', 'ozet.json'])

// --- model.js (paketin hesap kütüphanesi) ----------------------------------
const kapsam = { module: { exports: {} } }
vm.runInNewContext(await readFile(MODEL_JS, 'utf8'), kapsam, { filename: MODEL_JS })
const M = kapsam.module.exports
if (typeof M.azel !== 'function' || typeof M.basis !== 'function') throw new Error('model.js beklenen API’yi vermedi')
const R_AY_KM = 1737.4 // model.js siteVec ile aynı (siteVec dışa aktarılmıyor; yalnız bu sabit)

const okuJson = async (ad) => JSON.parse(await readFile(path.join(PAKET, ad), 'utf8'))
const yuvarla = (x, b) => {
  const k = 10 ** b
  const r = Math.round(x * k) / k
  return r === 0 ? 0 : r
}
const boylam360 = (l) => ((l % 360) + 360) % 360
const boylam180 = (l) => ((((l + 180) % 360) + 360) % 360) - 180

// --- Kategori ve Türkçe açıklama ------------------------------------------
function kategori(s) {
  if (s.group === 'Artemis III candidate regions') return 'artemis'
  if (s.group === 'South pole missions') return 'clps'
  if (s.group === 'Apollo') return 'apollo'
  if (s.group === 'Other missions') return s.id === 'blueghost1' ? 'clps' : 'uluslararasi'
  throw new Error(`Bilinmeyen grup: ${s.group} (${s.id})`)
}
/**
 * Arayüzdeki kısa ad (CLAUDE.md §10). Paketin adı ("Malapert Massif (best point)")
 * dosyada `name_package` olarak kalır. Ad değişirse ozet.json yeniden üretilmeli
 * (anahtarlar addır); dosya adı ve 3B eşleşmesi paket kimliğine (`id`) bağlıdır.
 */
const AD = {
  a3_peak_near_cabeus_b: 'Peak near Cabeus B',
  a3_haworth: 'Haworth',
  a3_malapert_massif: 'Malapert Massif',
  a3_mons_mouton: 'Mons Mouton',
  a3_mons_mouton_plateau: 'Mons Mouton Plateau',
  a3_nobile_rim_1: 'Nobile Rim 1',
  a3_nobile_rim_2: 'Nobile Rim 2',
  a3_de_gerlache_rim_2: 'de Gerlache Rim 2',
  a3_slater_plain: 'Slater Plain',
  apollo11: 'Apollo 11',
  apollo12: 'Apollo 12',
  apollo14: 'Apollo 14',
  apollo15: 'Apollo 15',
  apollo16: 'Apollo 16',
  apollo17: 'Apollo 17',
  im1_odysseus: 'IM-1 Odysseus',
  im2_target: 'IM-2 Athena (hedef)',
  im2_actual: 'IM-2 Athena (iniş)',
  cp22_prospect: 'CP-22',
  blueghost1: 'Blue Ghost 1',
  change3: "Chang'e 3",
  change4: "Chang'e 4",
  change5: "Chang'e 5",
  change6: "Chang'e 6",
  chandrayaan3: 'Chandrayaan-3',
  slim: 'SLIM',
}
const ARTEMIS_ACIKLAMA = 'Artemis III aday bölgesi · bölgedeki en iyi nokta'
const ACIKLAMA = {
  apollo11: 'İlk insanlı iniş, 1969',
  apollo12: 'Oceanus Procellarum, 1969',
  apollo14: 'Fra Mauro, 1971',
  apollo15: 'Hadley-Apennine, 1971',
  apollo16: 'Descartes, 1972',
  apollo17: 'Taurus-Littrow, 1972',
  im1_odysseus: 'Malapert A yakını, 2024',
  im2_target: 'Mons Mouton, 2025 · hedeflenen nokta',
  im2_actual: 'Mons Mouton, 2025 · gerçek iniş noktası',
  cp22_prospect: 'Mons Mouton platosu, CLPS aday noktası',
  blueghost1: 'Mare Crisium, 2025',
  change3: 'Mare Imbrium, Çin, 2013',
  change4: 'Uzak yüz, Çin, 2019',
  change5: 'Mons Rümker yakını, Çin, 2020',
  change6: 'Uzak yüz, Çin, 2024',
  chandrayaan3: 'Güney kutbu yakını, Hindistan, 2023',
  slim: 'Shioli krateri, Japonya, 2024',
}
const tablodan = (tablo, s, ne) => {
  if (!(s.id in tablo)) throw new Error(`${s.id}: ${ne} tanımlı değil (gercekVeriDonustur.mjs)`)
  return tablo[s.id]
}
const ad = (s) => tablodan(AD, s, 'kısa ad')
const aciklama = (s) => (s.id.startsWith('a3_') ? ARTEMIS_ACIKLAMA : tablodan(ACIKLAMA, s, 'açıklama'))
/**
 * terrain_global alanlarda ufkun dayandığı DEM çözünürlüğü (m) — VERI_SOZLESMESI.md:
 * SLDEM2015 256 ppd ≈ 118 m; Chandrayaan-3 (60°G dışı) LOLA 128 ppd ≈ 237 m.
 */
const araziCozunurluk = (s) => (s.horizon !== 'terrain_global' ? null : s.id === 'chandrayaan3' ? 237 : 118)
const KATEGORI_SIRASI = ['artemis', 'apollo', 'clps', 'uluslararasi']

// --- Efemeris ---------------------------------------------------------------
const ham = await okuJson('ephem_hourly.json')
const eph = M.loadEphem(ham)
const i0 = M.indexOf(eph, Date.parse(BASLANGIC_UTC))
if (eph.t0 + i0 * eph.stepMs !== Date.parse(BASLANGIC_UTC)) throw new Error('2027-01-01 efemeris ızgarasında değil')
if (i0 + SAAT > eph.n) throw new Error('Efemeris 2027 sonuna yetmiyor')
console.log(`efemeris: ${ham.start_utc} + ${i0} sa = ${BASLANGIC_UTC}; ${SAAT} saat; çerçeve ${ham.frame}`)

const sunAu = []
for (let k = 0; k < SAAT; k++) sunAu.push(yuvarla(eph.au[i0 + k], 6))

// --- Alanlar ----------------------------------------------------------------
const { sites } = await okuJson('sites.json')
const bolgeler = []
let enBuyukParalaksFarki = 0 // Dünya yüksekliğinde direkler arası en büyük fark (°)

for (const s of sites) {
  const b = M.basis(s.lat, s.lon)
  // siteVec model.js'te dışa aktarılmıyor; aynı tanım: r = R + (zemin + direk)/1000, yön b.u
  const siteVec = (direk) => {
    const r = R_AY_KM + (s.ground_m + direk) / 1000
    return [r * b.u[0], r * b.u[1], r * b.u[2]]
  }
  const sv = Object.fromEntries(DIREKLER.map((d) => [d, siteVec(d)]))
  const diziler = { sun_alt: [], sun_az: [], earth_alt: [], earth_az: [] }
  for (let k = 0; k < SAAT; k++) {
    const i = i0 + k
    const [sa, se] = M.azel(eph.sun[3 * i], eph.sun[3 * i + 1], eph.sun[3 * i + 2], b)
    const dunya = {}
    for (const d of DIREKLER) {
      const v = sv[d]
      dunya[d] = M.azel(eph.earth[3 * i] - v[0], eph.earth[3 * i + 1] - v[1], eph.earth[3 * i + 2] - v[2], b)
    }
    for (const d of DIREKLER) enBuyukParalaksFarki = Math.max(enBuyukParalaksFarki, Math.abs(dunya[d][1] - dunya[2][1]))
    diziler.sun_alt.push(yuvarla(se, 4))
    diziler.sun_az.push(yuvarla(sa, 4))
    diziler.earth_alt.push(yuvarla(dunya[2][1], 4))
    diziler.earth_az.push(yuvarla(dunya[2][0], 4))
  }

  // Ufuk: paketin 720 yönü (0.5°) olduğu gibi
  const kaynakUfuk = {
    0: s.horizon_by_mast?.['0']?.horizon_deg,
    2: s.horizon_deg,
    10: s.horizon_by_mast?.['10']?.horizon_deg,
  }
  const horizon = {}
  for (const d of DIREKLER) {
    const h = kaynakUfuk[d]
    if (!h || h.length !== 720) throw new Error(`${s.id}: ${d} m ufku yok ya da 720 değil`)
    horizon[String(d)] = Array.from(h, (v) => yuvarla(v, 3))
  }

  const dosya = `${s.id}.json`
  const alan = {
    site: ad(s),
    name_package: s.name,
    id: s.id,
    lat: s.lat,
    lon: yuvarla(boylam360(s.lon), 6),
    ground_m: s.ground_m,
    mast_heights_m: DIREKLER,
    horizon,
    t0: BASLANGIC_UTC,
    dt_hours: 1,
    n: SAAT,
    ...diziler,
    sun_au: sunAu,
  }
  await writeFile(path.join(CIKTI, dosya), JSON.stringify(alan))
  bolgeler.push({
    site: ad(s),
    kategori: kategori(s),
    aciklama: aciklama(s),
    lat: s.lat,
    lon: yuvarla(boylam360(s.lon), 6),
    file: dosya,
    id: s.id,
    kaynak: s.source,
    arazi: s.horizon,
    arazi_cozunurluk_m: araziCozunurluk(s),
  })
  console.log(`${dosya.padEnd(30)} ${kategori(s).padEnd(13)} ${s.horizon.padEnd(15)} ${ad(s).padEnd(22)} ${aciklama(s)}`)
}

if (new Set(bolgeler.map((b) => b.site)).size !== bolgeler.length) throw new Error('Kısa adlar benzersiz değil')
bolgeler.sort((a, b) => KATEGORI_SIRASI.indexOf(a.kategori) - KATEGORI_SIRASI.indexOf(b.kategori))
await writeFile(path.join(CIKTI, 'bolgeler.json'), JSON.stringify(bolgeler, null, 2) + '\n')

// --- efemeris.json: alt-noktalar (özel koordinat) ---------------------------
const ef = { t0: BASLANGIC_UTC, dt_hours: 1, n: SAAT, sun_sub_lat: [], sun_sub_lon: [], earth_sub_lat: [], earth_sub_lon: [], sun_au: sunAu, earth_dist_km: [] }
const D = 180 / Math.PI
for (let k = 0; k < SAAT; k++) {
  const i = i0 + k
  const [sx, sy, sz] = [eph.sun[3 * i], eph.sun[3 * i + 1], eph.sun[3 * i + 2]]
  const [ex, ey, ez] = [eph.earth[3 * i], eph.earth[3 * i + 1], eph.earth[3 * i + 2]]
  ef.sun_sub_lat.push(yuvarla(Math.atan2(sz, Math.hypot(sx, sy)) * D, 4))
  ef.sun_sub_lon.push(yuvarla(boylam360(Math.atan2(sy, sx) * D), 4))
  ef.earth_sub_lat.push(yuvarla(Math.atan2(ez, Math.hypot(ex, ey)) * D, 4))
  ef.earth_sub_lon.push(yuvarla(boylam180(Math.atan2(ey, ex) * D), 4))
  ef.earth_dist_km.push(yuvarla(Math.hypot(ex, ey, ez), 1)) // Ay merkezinden Dünya merkezine
}
await writeFile(path.join(CIKTI, 'efemeris.json'), JSON.stringify(ef))

// --- Eski alan dosyalarını sil ---------------------------------------------
const yeni = new Set(bolgeler.map((b) => b.file))
for (const ad of await readdir(CIKTI)) {
  if (!ad.endsWith('.json') || KORUNAN.has(ad) || yeni.has(ad)) continue
  await unlink(path.join(CIKTI, ad))
  console.log(`silindi: ${ad}`)
}

console.log(`\n${bolgeler.length} alan → ${CIKTI}`)
console.log(`Dünya yüksekliği, direkler (0/2/10 m) arası en büyük fark: ${enBuyukParalaksFarki.toExponential(2)}°`)
