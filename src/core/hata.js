// Kullanıcıya gösterilebilen hatalar dile bağımsız: kod + parametre taşır,
// metin arayüzde sözlükten gelir (dil/index.js hataMetni). message, sözlüğe
// ulaşılamayan yerler (konsol) için İngilizce kısa açıklamadır.

/**
 * @param {string} kod     sözlük anahtarı, ör. 'hata.yuklenemedi'
 * @param {object} params  yer tutucular, ör. { dosya, durum }
 * @param {string} mesaj   İngilizce yedek metin
 */
export function hataOlustur(kod, params = {}, mesaj = kod) {
  const h = new Error(mesaj)
  h.kod = kod
  h.params = params
  return h
}
