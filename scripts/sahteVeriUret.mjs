// Sahte veri üreteci: CLAUDE.md bölüm 10'daki 9 bölge için
// public/veri/<dosya>.json ve public/veri/bolgeler.json yazar.
// Kullanım: npm run veri:uret

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SAHTE_BOLGELER, bolgeVerisiUret, dosyaAdi } from '../src/core/sahteVeri.js'

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hedef = path.join(kok, 'public', 'veri')
await mkdir(hedef, { recursive: true })

const liste = []
for (const bolge of SAHTE_BOLGELER) {
  const file = dosyaAdi(bolge.site)
  const veri = bolgeVerisiUret(bolge)
  await writeFile(path.join(hedef, file), JSON.stringify(veri))
  liste.push({ site: bolge.site, lat: bolge.lat, lon: bolge.lon, file })
  console.log(`✓ ${file}`)
}

await writeFile(path.join(hedef, 'bolgeler.json'), JSON.stringify(liste, null, 2) + '\n')
console.log(`✓ bolgeler.json (${liste.length} bölge)`)
