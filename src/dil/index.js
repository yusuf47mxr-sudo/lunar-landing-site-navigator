// Dil desteği (Türkçe / İngilizce). Kütüphane yok: iki sözlük (tr.js, en.js),
// bir çeviri fonksiyonu ve dile duyarlı biçimlendiriciler.
//
//   const { dil, t, b } = useDil()
//   t('gok.gunes')                     → "Güneş" / "Sun"
//   t('kart.basari', { yuzde: '%67' }) → sözlükteki "{yuzde}" yer tutucuları doldurulur
//   Sözlük değeri fonksiyon olabilir (Türkçe ek mantığı, İngilizce çoğul):
//   t('karsilastirma.cumle', {...})    → değer(params, b) çağrılır
//
// React dışı kod (canvas çizimi, three.js etiketleri) için: ceviri(dil),
// bicim(dil) ya da dilAl() (depodaki güncel dil).
//
// Ondalık işaret iki dilde de nokta (bilimsel tutarlılık); yalnız tarih,
// ay adı, birim kısaltması ve yüzde işaretinin yeri dile göre değişir.

import { useMemo } from 'react'
import { OZEL_ON_EK } from '../core/ozelNokta.js'
import { bolgelerOnbellekte } from '../core/veri.js'
import { useBolgeler, useDurum } from '../durum/store.js'
import en from './en.js'
import tr from './tr.js'

export const DILLER = ['tr', 'en']
export const SOZLUKLER = { tr, en }

function bul(sozluk, anahtar) {
  let v = sozluk
  for (const p of anahtar.split('.')) {
    if (v == null) return undefined
    v = v[p]
  }
  return v
}

const ceviriler = {}
/** dil → t(anahtar, params). Eksik anahtar: EN'de TR'ye düşer (geliştirmede uyarır), ikisinde de yoksa anahtarın kendisi. */
export function ceviri(dil) {
  if (ceviriler[dil]) return ceviriler[dil]
  const s = SOZLUKLER[dil] ?? tr
  const b = bicim(dil)
  const t = (anahtar, params = {}) => {
    let v = bul(s, anahtar)
    if (v === undefined) {
      if (import.meta.env?.DEV) console.warn(`[dil] eksik anahtar (${dil}): ${anahtar}`)
      v = bul(tr, anahtar)
      if (v === undefined) return anahtar
    }
    if (typeof v === 'function') return v(params, b, t)
    if (typeof v !== 'string') return v
    return v.replace(/\{(\w+)\}/g, (m, ad) => (params[ad] ?? m))
  }
  return (ceviriler[dil] = t)
}

// --- Biçimlendiriciler -----------------------------------------------------

const YEREL = { tr: 'tr-TR', en: 'en-US' }
const bicimler = {}

/** dil → biçimlendiriciler (önbellekli). */
export function bicim(dil) {
  if (bicimler[dil]) return bicimler[dil]
  const yer = YEREL[dil] ?? 'tr-TR'
  const tr_ = dil !== 'en'
  const intl = (o) => new Intl.DateTimeFormat(yer, { timeZone: 'UTC', ...o })
  const gunF = intl({ day: 'numeric', month: tr_ ? 'long' : 'short', year: 'numeric' })
  const gunAyF = intl({ day: 'numeric', month: tr_ ? 'long' : 'short' })
  const ayF = intl({ month: 'long' })
  const ayKisaF = intl({ month: 'short' })
  const saatF = intl({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const birim = tr_ ? { g: 'g', sa: 'sa', dk: 'dk' } : { g: 'd', sa: 'h', dk: 'min' }

  const b = {
    dil,
    yerel: yer,
    birim,
    /** "26 Ocak 2027" / "Jan 26, 2027" */
    gun: (d) => gunF.format(d),
    /** "26 Ocak" / "Jan 26" */
    gunAy: (d) => gunAyF.format(d),
    /** "Ocak" / "January" */
    ay: (d) => ayF.format(d),
    /** "Oca" / "Jan" */
    ayKisa: (d) => ayKisaF.format(d),
    /** "10:00" */
    saat: (d) => saatF.format(d),
    /** "26 Ocak 2027, 10:00 UTC" / "Jan 26, 2027, 10:00 UTC" */
    tarih: (d) => `${gunF.format(d)}, ${saatF.format(d)} UTC`,
    /**
     * Saat cinsinden süre: 79 → "3 g 7 sa" / "3 d 7 h"; 11.5 → "11 sa 30 dk" / "11 h 30 min".
     * null / geçersiz → null (arayüz "veri aralığında değişmiyor" gösterir).
     */
    sure: (saat) => {
      if (saat === null || saat === undefined || !Number.isFinite(saat) || saat < 0) return null
      const dakika = Math.round(saat * 60)
      if (dakika < 60) return `${dakika} ${birim.dk}`
      const gun = Math.floor(dakika / 1440)
      const sa = Math.floor((dakika % 1440) / 60)
      const dk = dakika % 60
      if (gun > 0) return sa > 0 ? `${gun} ${birim.g} ${sa} ${birim.sa}` : `${gun} ${birim.g}`
      return dk > 0 ? `${sa} ${birim.sa} ${dk} ${birim.dk}` : `${sa} ${birim.sa}`
    },
    /** Saat → "62 sa" / "62 h" (güne çevrilmez) */
    tamSaat: (v) => `${Math.round(v)} ${birim.sa}`,
    /** Gün → "30 gün" / "30 days" */
    gunSayisi: (n) => (tr_ ? `${n} gün` : `${n} ${n === 1 ? 'day' : 'days'}`),
    /** 0…1 oranı → "%82" / "82%" */
    yuzde: (v) => (tr_ ? `%${Math.round(v * 100)}` : `${Math.round(v * 100)}%`),
    /** Hazır yüzde sayısı (metin ya da sayı) → "%66.9" / "66.9%" */
    yuzdeSayi: (n) => (tr_ ? `%${n}` : `${n}%`),
    /** Ondalık nokta, iki dilde de: (3.14159, 2) → "3.14" */
    sayi: (v, ondalik = 0) => v.toFixed(ondalik),
  }
  return (bicimler[dil] = b)
}

/** Depodaki güncel dil (React dışı kod için). */
export const dilAl = () => useDurum.getState().dil

/** Bileşenler için: { dil, t, b, ad, aciklama }. Dil değişince yeniden çizer. */
export function useDil() {
  const dil = useDurum((s) => s.dil)
  const { bolgeler } = useBolgeler()
  return useMemo(
    () => ({ dil, t: ceviri(dil), b: bicim(dil), ad: (site) => alanAdi(site, dil, bolgeler), aciklama: (k) => alanAciklamasi(k, dil) }),
    [dil, bolgeler],
  )
}

// --- Alan adları ve açıklamaları (bolgeler.json: site / site_en, aciklama / aciklama_en) ---
// "site" anahtardır (depo, ozet.json, karşılaştırma); yalnız GÖSTERİLEN ad dile göre değişir.

/** Alanın gösterilen adı. Özel nokta ("@ozel:lat,lon") → "Özel nokta (lat°, lon°)"; kayıt yoksa adın kendisi. */
export function alanAdi(site, dil, bolgeler = bolgelerOnbellekte()) {
  if (site == null) return site
  if (site.startsWith(OZEL_ON_EK)) {
    const [lat, lon] = site.slice(OZEL_ON_EK.length).split(',')
    return ceviri(dil)('ozel.ad', { lat, lon })
  }
  if (dil !== 'en') return site
  return bolgeler?.find((b) => b.site === site)?.site_en ?? site
}

/** Kullanıcıya gösterilecek hata metni: hata.kod varsa sözlükten, yoksa message. */
export function hataMetni(hata, t) {
  if (!hata) return ''
  if (hata.kod) return t(hata.kod, hata.params ?? {})
  return String(hata.message ?? hata)
}

/** bolgeler.json kaydının açıklaması. */
export const alanAciklamasi = (kayit, dil) => (kayit ? (dil === 'en' ? (kayit.aciklama_en ?? kayit.aciklama) : kayit.aciklama) : undefined)
