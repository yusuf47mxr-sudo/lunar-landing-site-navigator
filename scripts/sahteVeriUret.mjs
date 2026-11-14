// Sahte veri üreteci: CLAUDE.md bölüm 10'daki bütün alanlar için
// public/veri/<dosya>.json, bolgeler.json ve efemeris.json yazar.
// Kullanım: npm run veri:uret

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  SAHTE_BOLGELER,
  altNoktalarUret,
  bolgeVerisiUret,
  dosyaAdi,
  efemerisVerisiUret,
} from '../src/core/sahteVeri.js'

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hedef = path.join(kok, 'public', 'veri')
await mkdir(hedef, { recursive: true })

const altNoktalar = altNoktalarUret()

await writeFile(path.join(hedef, 'efemeris.json'), JSON.stringify(efemerisVerisiUret(altNoktalar)))
console.log('✓ efemeris.json')

const liste = []
for (const bolge of SAHTE_BOLGELER) {
  const file = dosyaAdi(bolge.site)
  await writeFile(path.join(hedef, file), JSON.stringify(bolgeVerisiUret(bolge, altNoktalar)))
  const { site, kategori, aciklama, lat, lon } = bolge
  liste.push({ site, kategori, aciklama, lat, lon, file })
  console.log(`✓ ${file}`)
}

await writeFile(path.join(hedef, 'bolgeler.json'), JSON.stringify(liste, null, 2) + '\n')
console.log(`✓ bolgeler.json (${liste.length} alan)`)
