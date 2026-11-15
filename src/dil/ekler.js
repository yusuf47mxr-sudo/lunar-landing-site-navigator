// Türkçe ek yardımcıları (yalnız tr.js ve Türkçe şablonlar kullanır).
// Yönelme: "Haworth'a", "Apollo 11'e", "%82'ye". Bulunma: "Haworth'ta", "Apollo 11'de".
// İyelik: "%53'ü", "%62'si". Ay adlarında bulunma: "26 Ocak'ta", "3 Eylül'de".

const UNLU = /[aeıioöuü]/g
// Sayının okunuşuna göre ek: [sıfır … dokuz], [on … doksan], yüz
export const YONELME = {
  rakam: ['a', 'e', 'ye', 'e', 'e', 'e', 'ya', 'ye', 'e', 'a'],
  onluk: ['', 'a', 'ye', 'a', 'a', 'ye', 'a', 'e', 'e', 'a'],
  yuz: 'e',
}
export const BULUNMA = {
  rakam: ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da'],
  onluk: ['', 'da', 'de', 'da', 'ta', 'de', 'ta', 'te', 'de', 'da'],
  yuz: 'de',
}
const IYELIK = {
  rakam: ['ı', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'],
  onluk: ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'],
  yuz: 'ü',
}

/** Sayının son okunuşuna göre ek (varsayılan yönelme). */
export function sayiEki(n, ek = YONELME) {
  const v = Math.abs(Math.round(n))
  if (v % 10 || v === 0) return ek.rakam[v % 10]
  const onluk = Math.floor(v / 10) % 10
  return onluk ? ek.onluk[onluk] : ek.yuz
}

/** Adın son sözcüğü: sayıysa { sayi }, değilse ses bilgisi { kalin, unluSon, sertSon }. */
function sonSozcuk(ad) {
  // Sondaki noktalama atlanır: "IM-2 Athena (iniş)" → "iniş"
  const son = ad.trim().replace(/[^\p{L}\d]+$/u, '').split(/[\s-]+/).pop()
  if (/^\d+$/.test(son)) return { sayi: Number(son) }
  const k = son.toLowerCase()
  const unluler = k.match(UNLU)
  if (!unluler) return { kalin: false, unluSon: k.length === 1, sertSon: false } // tek harf: "B" → "be"
  return {
    kalin: 'aıou'.includes(unluler[unluler.length - 1]),
    unluSon: 'aeıioöuü'.includes(k[k.length - 1]),
    sertSon: 'fstkçşhp'.includes(k[k.length - 1]),
  }
}

/** Yönelme eki: "Haworth" → "a", "Rim 2" → "ye", "Athena" → "ya". */
export function adEki(ad) {
  const s = sonSozcuk(ad)
  if (s.sayi !== undefined) return sayiEki(s.sayi)
  return (s.unluSon ? 'y' : '') + (s.kalin ? 'a' : 'e')
}

/** Bulunma eki: "Haworth" → "ta", "Malapert Massif" → "te", "Rim 2" → "de". */
export function bulunmaEki(ad) {
  const s = sonSozcuk(ad)
  if (s.sayi !== undefined) return sayiEki(s.sayi, BULUNMA)
  return (s.sertSon ? 't' : 'd') + (s.kalin ? 'a' : 'e')
}

/** "%53'ü", "%62'si" — yüzdenin üçüncü tekil iyelik eki. */
export const yuzdeIyelik = (n) => `%${n}'${sayiEki(n, IYELIK)}`

/** "%82'ye" */
export const yuzdeYonelme = (n) => `%${n}'${sayiEki(n)}`

/** Ay adından sonra bulunma eki (ay sırası 0–11): Ocak'ta, Nisan'da, Eylül'de … */
export const AY_BULUNMA = ['ta', 'ta', 'ta', 'da', 'ta', 'da', 'da', 'ta', 'de', 'de', 'da', 'ta']

/** İlk harf büyük (Türkçe kurallı: i → İ). */
export const basHarfBuyuk = (m) => m.charAt(0).toLocaleUpperCase('tr') + m.slice(1)
