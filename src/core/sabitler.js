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
/**
 * Açılıştaki an: 6. gün (t = 120, dt = 1 saat). t = 0'da Malapert gökyüzünde
 * Güneş ve Dünya aynı noktada duruyor; 120'de aralarında ≈ 68° var, ikisi de
 * görünür ve Dünya batışına 11 saat kalmış: Earthset geri sayımı açılışta
 * uyarı renginde görünür. iniş tarihi (tL) ızgaranın ilk haftasıdır (1 Ocak):
 * tL haftalık ızgaradan seçilir, 120 ızgarada yok.
 */
export const BASLANGIC_T = 120

export const VARSAYILAN = Object.freeze({
  tL: 0, // iniş tarihi indeksi — 1 Ocak; açılıştaki an (t = 120) bu görevin 6. günü
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

/**
 * public/veri/ altındaki verinin kaynağı: 'sahte' (scripts/sahteVeriUret.mjs)
 * ya da 'gercek' (SPICE + LOLA). 'sahte' iken üç sayfanın başlığı altında
 * VeriUyarisi görünür. Gerçek veri gelince bu satırı 'gercek' yapmak yeter.
 */
export const VERI_KAYNAGI = 'sahte'
