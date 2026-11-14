// public/veri/ozet.json üretir (CLAUDE.md bölüm 4.4).
// Formüller kopyalanmaz: hesap.js'deki fonksiyonlar kullanılır.
// Alan dosyaları veri.js ile, bolgeler.json'daki "file" alanından okunur.
// Kullanım: npm run veri:ozet

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { alanYukle, bolgeleriYukle, yukleyiciAyarla } from '../src/core/veri.js'
import { gunesOrani, iletisimDurumu, olcutler } from '../src/core/hesap.js'

const ADIM_SAAT = 168 // haftalık iniş tarihi
const INIS_SAYISI = 52
const EPSILON = 2
const DIREKLER = [0, 2, 10]
const SURELER = [7, 30, 90, 180]

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const veriDizini = path.join(kok, 'public', 'veri')
yukleyiciAyarla(async (dosya) => JSON.parse(await readFile(path.join(veriDizini, dosya), 'utf8')))

const iki = (x) => {
  const r = Math.round(x * 100) / 100
  return r === 0 ? 0 : r
}

const bolgeler = await bolgeleriYukle()
const ozet = {
  t0: null,
  landing_step_h: ADIM_SAAT,
  landing_count: INIS_SAYISI,
  epsilon_deg: EPSILON,
  sites: {},
}

const basla = performance.now()
for (const { site } of bolgeler) {
  const alan = await alanYukle(site)
  if (ozet.t0 === null) ozet.t0 = alan.t0
  else if (alan.t0 !== ozet.t0) throw new Error(`${site}: t0 farklı (${alan.t0})`)

  const dt = alan.dt_hours
  const inisAdimi = Math.round(ADIM_SAAT / dt)
  const n = alan.sun_alt.length
  const f = new Float32Array(n)
  const c = new Float32Array(n)
  const alanOzeti = {}

  for (const hm of DIREKLER) {
    const horizon = alan.horizon[String(hm)]
    gunesOrani(alan.sun_alt, alan.sun_az, horizon, alan.sun_au ?? null, f)
    iletisimDurumu(alan.earth_alt, alan.earth_az, horizon, EPSILON, c)

    const hmOzeti = {}
    for (const D of SURELER) {
      const hucre = { f_bar: [], c_bar: [], tau_max_h: [], sigma_max_h: [] }
      for (let i = 0; i < INIS_SAYISI; i++) {
        const o = olcutler(f, c, null, i * inisAdimi, D, dt) // yıl sonunu aşarsa null
        hucre.f_bar.push(o ? iki(o.fBar) : null)
        hucre.c_bar.push(o ? iki(o.cBar) : null)
        hucre.tau_max_h.push(o ? o.tauMax : null)
        hucre.sigma_max_h.push(o ? o.sigmaMax : null)
      }
      hmOzeti[String(D)] = hucre
    }
    alanOzeti[String(hm)] = hmOzeti
  }
  ozet.sites[site] = alanOzeti
}

await writeFile(path.join(veriDizini, 'ozet.json'), JSON.stringify(ozet))
console.log(
  `✓ ozet.json — ${bolgeler.length} alan × ${DIREKLER.length} hm × ${SURELER.length} D × ${INIS_SAYISI} iniş ` +
    `(${Math.round(performance.now() - basla)} ms)`,
)
