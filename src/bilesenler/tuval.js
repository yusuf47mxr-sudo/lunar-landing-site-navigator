// Canvas 2D bileşenlerinin ortak yardımcıları (GokyuzuGorunumu, ZamanCizelgesi).
// Renkler CSS değişkenlerinden okunur (CLAUDE.md bölüm 9).

export const VARSAYILAN_RENK = {
  zemin: '#070B14',
  yuzeyAcik: '#16203A',
  cizgi: '#1F2B45',
  metin: '#E6EDF7',
  metinSolgun: '#8A97AC',
  gunes: '#F5A524',
  iletisim: '#22D3EE',
  uyari: '#EF4444',
}

export const YAZI = '400 11px Inter, ui-sans-serif, system-ui, sans-serif'
export const YAZI_KUCUK = '400 10px Inter, ui-sans-serif, system-ui, sans-serif'

/** CSS değişkenlerinden paleti okur; bulunamazsa varsayılanlar. */
export function renkleriOku() {
  if (typeof document === 'undefined') return VARSAYILAN_RENK
  const st = getComputedStyle(document.documentElement)
  const oku = (ad, yedek) => st.getPropertyValue(ad).trim() || yedek
  const r = VARSAYILAN_RENK
  return {
    zemin: oku('--zemin', r.zemin),
    yuzeyAcik: oku('--yuzey-acik', r.yuzeyAcik),
    cizgi: oku('--cizgi', r.cizgi),
    metin: oku('--metin', r.metin),
    metinSolgun: oku('--metin-solgun', r.metinSolgun),
    gunes: oku('--gunes', r.gunes),
    iletisim: oku('--iletisim', r.iletisim),
    uyari: oku('--uyari', r.uyari),
  }
}

/** #RRGGBB (veya #RGB) → [r, g, b] */
export function rgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** #RRGGBB → rgba(...) */
export function saydam(hex, a) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
