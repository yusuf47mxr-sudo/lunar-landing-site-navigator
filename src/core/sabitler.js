// Fiziksel sabitler ve varsayılan parametreler

/** Ufuk profilindeki yön sayısı (0.5° adım; veri paketiyle aynı). Okuma her zaman ufukOku ile. */
export const UFUK_YON_SAYISI = 720

/** |lat| >= 75° olan alanlar "kutup alanı" sayılır (CLAUDE.md bölüm 10). */
export const KUTUP_SINIRI = 75

/** İniş tarihi seçenekleri: t0'dan başlayarak haftada bir, 52 adet (ozet.json ile aynı ızgara). */
export const INIS_ADIM_SAAT = 168
export const INIS_SAYISI = 52

/**
 * Görev ve mühendislik parametrelerinin varsayılanları (CLAUDE.md bölüm 6).
 * Depo bunlarla başlar; ParametrePaneli "Varsayılana dön" ve rozet sayımı için okur.
 */
/**
 * Açılıştaki an: 26 Ocak 2027, 10:00 UTC (t = 610, dt = 1 saat). Malapert'te
 * Güneş ve Dünya ikisi de görünür, aralarında ≈ 53° var; Dünya batışına 16 sa
 * kaldı (Earthset geri sayımı açılışta uyarı renginde), gün batımına 61 sa.
 * İniş tarihi (tL = 0, 1 Ocak) ile 30 günlük görevin içinde kalır.
 */
export const BASLANGIC_T = 610

export const VARSAYILAN = Object.freeze({
  tL: 0, // iniş tarihi indeksi — 1 Ocak; açılıştaki an (t = 610) bu 30 günlük görevin içinde
  D: 30, // görev süresi (gün)
  hm: 2, // direk yüksekliği (m)
  epsilon: 2, // iletişim güvenlik payı (derece)
  S: 1, // panel alanı (m²)
  eta: 0.3, // panel verimi
  yonelim: 'izleyen',
  w1: 1,
  w2: 1,
  w3: 1,
})
