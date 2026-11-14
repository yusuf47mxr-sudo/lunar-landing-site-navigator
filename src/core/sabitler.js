// Fiziksel sabitler ve varsayılan parametreler

/** |lat| >= 75° olan alanlar "kutup alanı" sayılır (CLAUDE.md bölüm 10). */
export const KUTUP_SINIRI = 75

/** İniş tarihi seçenekleri: t0'dan başlayarak haftada bir, 52 adet (ozet.json ile aynı ızgara). */
export const INIS_ADIM_SAAT = 168
export const INIS_SAYISI = 52

/**
 * Görev ve mühendislik parametrelerinin varsayılanları (CLAUDE.md bölüm 6).
 * Depo bunlarla başlar; ParametrePaneli "Varsayılana dön" ve rozet sayımı için okur.
 */
export const VARSAYILAN = Object.freeze({
  tL: 0, // iniş tarihi indeksi
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
