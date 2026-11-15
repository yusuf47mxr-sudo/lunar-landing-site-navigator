// 3B kalite profili (cihaza göre). Hem Ay küresi hem yerel sahne kullanır.
//
//   masaüstü  : DPR ≤ 2, gölge haritası 4096 (ilk ölçümde fps < 40 → 2048),
//               4k Ay dokusu yalnız tam ekranda
//   mobil     : (dokunmatik ya da genişlik < 1024 px) DPR ≤ 1.5, gölge 1024, yalnız 2k doku
//   zayıf     : ilk 3 sn'de fps < 25 (her cihaz) → gölge KAPALI, DPR 1, düşük segment.
//               Oturum boyunca hatırlanır (sahneler yeniden açılınca yeniden ölçülmez).
//
// Profil modül düzeyinde tutulur; useKalite() değişince bileşeni yeniden çizer.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useSyncExternalStore } from 'react'

export const FPS_ZAYIF = 25
export const FPS_HAFIF = 40

const mobilMi = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches

let zayif = false
let golgeHafif = false // masaüstünde fps < 40: 4096 → 2048
let profil = null
const dinleyiciler = new Set()

function hesapla() {
  const mobil = mobilMi()
  return {
    mobil,
    zayif,
    dpr: zayif ? 1 : mobil ? 1.5 : 2,
    golge: zayif ? 0 : mobil ? 1024 : golgeHafif ? 2048 : 4096, // 0: gölge kapalı
    doku4k: !mobil && !zayif, // ayrıca yalnız tam ekranda
    kureDilim: zayif ? [96, 48] : mobil ? [192, 96] : [256, 128], // Ay küresi (yatay, düşey)
    bloom: !zayif,
    olculdu: zayif || golgeHafif,
  }
}

const bildir = () => {
  profil = hesapla()
  dinleyiciler.forEach((f) => f())
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(max-width: 1023px), (pointer: coarse)').addEventListener?.('change', bildir)
}

export const kaliteAl = () => (profil ??= hesapla())

/**
 * İlk ölçüm sonucu (fps, 1.–3. saniye). < 25 → zayıf; masaüstünde < 40 → gölge 2048.
 * Bir kez etkili olur; sonraki çağrılar yalnız daha kötüye götürebilir.
 */
export function fpsBildir(fps) {
  if (import.meta.env?.DEV && typeof window !== 'undefined') window.__fpsOlcum = { fps: Math.round(fps * 10) / 10 }
  if (fps < FPS_ZAYIF && !zayif) {
    zayif = true
    bildir()
  } else if (fps < FPS_HAFIF && !golgeHafif) {
    golgeHafif = true
    bildir()
  }
}

const abone = (f) => {
  dinleyiciler.add(f)
  return () => dinleyiciler.delete(f)
}

/** Kalite profili (değişince yeniden çizer). */
export function useKalite() {
  return useSyncExternalStore(abone, kaliteAl, kaliteAl)
}

// --- Sahne içi yardımcılar (Canvas içinde) ------------------------------------

const olculen = new Set() // sahne adı → bu oturumda ölçüldü

/**
 * İlk karelerden sonra (1. ile 3. saniye arası) fps'i bir kez ölçer ve
 * fpsBildir'e verir. Sahne başına oturumda bir kez. Arayüzde görünmez.
 */
export function FpsOlcer({ sahne }) {
  const d = useRef({ ilk: null, bas: null, kare: 0, bitti: olculen.has(sahne) })
  useFrame(() => {
    const o = d.current
    if (o.bitti) return
    const simdi = performance.now()
    if (o.ilk === null) o.ilk = simdi
    if (simdi - o.ilk < 1000) return
    if (o.bas === null) {
      o.bas = simdi
      return
    }
    o.kare++
    if (simdi - o.bas >= 2000) {
      o.bitti = true
      olculen.add(sahne)
      fpsBildir((o.kare * 1000) / (simdi - o.bas))
    }
  })
  return null
}

/**
 * WebGL bağlamı beklenmedik biçimde kaybolursa onKayip() çağırır. Sahne
 * kapanırken R3F bağlamı bilerek düşürür (forceContextLoss); dinleyici o
 * andan önce (bu bileşenin temizliğinde) kaldırıldığı için o durum sayılmaz.
 */
export function BaglamBekcisi({ onKayip }) {
  const gl = useThree((s) => s.gl)
  const geri = useRef(onKayip)
  geri.current = onKayip
  useEffect(() => {
    const tuval = gl.domElement
    const dinle = (e) => {
      if (!tuval.isConnected) return
      e.preventDefault?.()
      geri.current?.()
    }
    tuval.addEventListener('webglcontextlost', dinle)
    return () => tuval.removeEventListener('webglcontextlost', dinle)
  }, [gl])
  return null
}

// --- Telefon düzeni ---------------------------------------------------------------

const TELEFON_SORGU = '(max-width: 639px)'
const telefonAbone = (f) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const m = window.matchMedia(TELEFON_SORGU)
  m.addEventListener?.('change', f)
  return () => m.removeEventListener?.('change', f)
}
const telefonMu = () => typeof window !== 'undefined' && !!window.matchMedia?.(TELEFON_SORGU).matches

/** Telefon genişliği (< 640 px): krater kartı ve açıklamalar alttan açılan panel olur. */
export function useTelefon() {
  return useSyncExternalStore(telefonAbone, telefonMu, () => false)
}
