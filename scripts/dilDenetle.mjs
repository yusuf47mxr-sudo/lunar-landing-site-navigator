// Dil denetimi:
//   1) src/ altında sözlük (src/dil/) ve paket kodu (src/vendor/) dışında, YORUMLAR
//      HARİÇ Türkçe karakter (ı ş ğ ü ö ç İ Ş Ğ Ü Ö Ç) içeren satırları listeler.
//   2) tr.js ve en.js anahtar ağaçlarını karşılaştırır (eksik / fazla anahtar).
// Kullanım: npm run dil:denetle [-- dosya...]   (dosya verilirse yalnız onlar taranır)
// Çıkış kodu: sorun varsa 1.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TURKCE = /[ıİşŞğĞüÜöÖçÇ]/

/** Yorumları boşlukla değiştirir (dizgi, şablon ve düzenli ifade içindeki // korunur). */
function yorumsuz(kaynak) {
  let cikti = ''
  let i = 0
  const n = kaynak.length
  let durum = 'kod' // kod | tek | cift | sablon | satirYorum | blokYorum | jsxMetin
  const sablonDerinlik = []
  while (i < n) {
    const c = kaynak[i]
    const s = kaynak[i + 1]
    if (durum === 'kod') {
      if (c === '/' && s === '/') {
        durum = 'satirYorum'
        i += 2
        continue
      }
      if (c === '/' && s === '*') {
        durum = 'blokYorum'
        i += 2
        continue
      }
      if (c === "'") durum = 'tek'
      else if (c === '"') durum = 'cift'
      else if (c === '`') durum = 'sablon'
      else if (c === '}' && sablonDerinlik.length && sablonDerinlik[sablonDerinlik.length - 1] === 0) {
        sablonDerinlik.pop()
        durum = 'sablon'
      } else if (c === '{' && sablonDerinlik.length) sablonDerinlik[sablonDerinlik.length - 1]++
      else if (c === '}' && sablonDerinlik.length) sablonDerinlik[sablonDerinlik.length - 1]--
      cikti += c
      i++
      continue
    }
    if (durum === 'satirYorum') {
      if (c === '\n') {
        durum = 'kod'
        cikti += c
      }
      i++
      continue
    }
    if (durum === 'blokYorum') {
      if (c === '*' && s === '/') {
        durum = 'kod'
        i += 2
        continue
      }
      if (c === '\n') cikti += c
      i++
      continue
    }
    // dizgiler
    if (c === '\\') {
      cikti += c + (s ?? '')
      i += 2
      continue
    }
    if ((durum === 'tek' && c === "'") || (durum === 'cift' && c === '"') || (durum === 'sablon' && c === '`')) durum = 'kod'
    else if (durum === 'sablon' && c === '$' && s === '{') {
      sablonDerinlik.push(0)
      durum = 'kod'
      cikti += '${'
      i += 2
      continue
    } else if ((durum === 'tek' || durum === 'cift') && c === '\n') durum = 'kod' // JSX metnindeki kesme işareti vb.
    cikti += c
    i++
  }
  return cikti
}

async function dosyalar(dizin) {
  const sonuc = []
  for (const g of await readdir(dizin, { withFileTypes: true })) {
    const yol = path.join(dizin, g.name)
    if (g.isDirectory()) {
      if (['dil', 'vendor'].includes(g.name) && path.dirname(yol) === path.join(KOK, 'src')) continue
      sonuc.push(...(await dosyalar(yol)))
    } else if (/\.(jsx?|mjs)$/.test(g.name)) sonuc.push(yol)
  }
  return sonuc
}

let sorun = 0
const istenen = process.argv.slice(2).map((d) => path.resolve(d))
const liste = istenen.length ? istenen : await dosyalar(path.join(KOK, 'src'))
const bulunan = []
for (const d of liste) {
  const satirlar = yorumsuz(await readFile(d, 'utf8')).split('\n')
  satirlar.forEach((s, k) => {
    if (TURKCE.test(s)) bulunan.push(`${path.relative(KOK, d)}:${k + 1}: ${s.trim().slice(0, 140)}`)
  })
}
console.log(`Sözlük dışında Türkçe karakterli satır: ${bulunan.length}`)
for (const b of bulunan) console.log('  ' + b)
sorun += bulunan.length

// Anahtar eşleşmesi
if (!istenen.length) {
  const yukle = async (ad) => (await import(pathToFileURL(path.join(KOK, 'src/dil', ad)).href)).default
  const tr = await yukle('tr.js')
  const en = await yukle('en.js')
  const anahtarlar = (o, on = '') =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? anahtarlar(v, `${on}${k}.`) : [`${on}${k}`]))
  const a = new Set(anahtarlar(tr))
  const b = new Set(anahtarlar(en))
  const yalnizTr = [...a].filter((k) => !b.has(k))
  const yalnizEn = [...b].filter((k) => !a.has(k))
  console.log(`Anahtar: tr ${a.size}, en ${b.size}; yalnız tr'de ${yalnizTr.length}, yalnız en'de ${yalnizEn.length}`)
  for (const k of yalnizTr) console.log('  yalnız tr: ' + k)
  for (const k of yalnizEn) console.log('  yalnız en: ' + k)
  sorun += yalnizTr.length + yalnizEn.length
}
process.exit(sorun ? 1 : 0)
