// Tıklanan ML kraterinin kartı: çap, ML güven skoru, bu çaptaki tespitlerin
// isabet oranı (kutup testi), hücre tehlikesi ve "buraya inersen" başarı
// olasılığı (paketin landingOdds'u, işçide; rehber §6, §9).
//
// Pencere (depoda, sayfalar arası korunur): varsayılan "14 gün (t'den)" — CLPS
// tipik görev süresi, bir Ay günü; ya da "Görev penceresi (tL, D)". Batarya
// 50 / 100 / 200 sa. Sonuç %0 ise gerekçe büyük yazılır ve aynı hücre için bu
// pencereden sonraki ilk ≥ %50 başarılı 14 günlük başlangıç önerilir (günlük
// tarama, ≤ 1 yıl); tıklanınca t oraya atlar.
//
// Kart kraterin yanında durur: KartIzdusum (Canvas içinde) her karede kraterin
// ekran konumunu yazar; ekranın sağ yarısındaysa kart sola geçer, kraterin
// üstüne binmez. Boşa tıklama (Canvas onPointerMissed) ya da ESC kapatır.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { ONERI_GUN } from '../../core/inisPencere.js'
import { KART_BATARYALARI, useDurum } from '../../durum/store.js'
import { gunBicimle, tarihBicimle } from '../ZamanKaydirici.jsx'
import { INIS_VARSAYILAN } from './inisOlasiligi.js'
import { guvenRengi, kraterHucresi, kraterIsabeti } from './MlKatmanlari.jsx'

const v = new Vector3()
const PAY = 18 // kraterle kart arası (px)

/** Canvas içinde: kraterin ekran konumunu kart öğesine yazar. */
export function KartIzdusum({ nokta, kart }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const el = kart.current
    if (!el || !nokta) return
    v.set(nokta[0], nokta[1], nokta[2]).project(camera)
    const gorunur = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
    el.style.visibility = gorunur ? 'visible' : 'hidden'
    if (!gorunur) return
    const x = ((v.x + 1) / 2) * size.width
    const y = ((1 - v.y) / 2) * size.height
    const w = el.offsetWidth
    const h = el.offsetHeight
    const sola = x > size.width / 2
    const kx = Math.max(8, Math.min(size.width - w - 8, sola ? x - PAY - w : x + PAY))
    const ky = Math.max(8, Math.min(size.height - h - 8, y - h / 2))
    el.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`
  })
  return null
}

/** "%53'ü", "%62'si" — yüzdenin üçüncü tekil iyelik eki. */
function yuzdeIyelik(n) {
  const ek = n === 100 ? 'ü' : n % 10 ? ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'][n % 10] : { 1: 'u', 2: 'si', 3: 'u', 4: 'ı', 5: 'si', 6: 'ı', 7: 'i', 8: 'i', 9: 'ı', 0: 'ı' }[Math.floor(n / 10)]
  return `%${n}'${ek}`
}

const NEDEN = {
  ground: 'krater',
  slope: 'eğim',
  dark: 'uzun karanlık',
  noEarth: 'iletişim kesintisi',
  outside: 'ızgara dışına düşme',
}

/** %0 durumunda gerekçenin açık cümlesi. */
const NEDEN_UZUN = {
  dark: (b) => `Uzun karanlık: ${b} sa batarya bu pencerede yetmiyor`,
  noEarth: () => `İletişim kesintisi: Dünya ${INIS_VARSAYILAN.bufferH} sa tampondan uzun görünmüyor`,
  slope: () => `Eğim: çevredeki zemin ${INIS_VARSAYILAN.slopeMax}°'den dik`,
  ground: () => 'Krater riski: çevre küçük kraterlerle dolu',
  outside: () => 'Hedef ızgara kenarına çok yakın: iniş dışarı düşüyor',
}

/** reasons + outside, büyükten küçüğe (başarısızlığa katkı). */
function nedenler(sonuc) {
  return Object.entries({ ...sonuc.reasons, outside: sonuc.outside })
    .filter(([, p]) => p > 0.005)
    .sort((a, b) => b[1] - a[1])
    .map(([anahtar, pay]) => ({ anahtar, ad: NEDEN[anahtar] ?? anahtar, pay }))
}

const AY_BULUNMA = ['ta', 'ta', 'ta', 'da', 'ta', 'da', 'da', 'ta', 'de', 'de', 'da', 'ta']
const tarih = (t) => new Date(Date.UTC(2027, 0, 1) + t * 3600e3)
/** "26 Ocak'ta" */
function gunde(t) {
  const d = tarih(t)
  return `${d.getUTCDate()} ${new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'UTC' }).format(d)}'${AY_BULUNMA[d.getUTCMonth()]}`
}

/** Değer `ms` boyunca değişmeden kalınca döner (oynatırken işçi her saatte yeniden hesaplamasın). */
function useGecikmeli(deger, ms) {
  const [g, setG] = useState(deger)
  useEffect(() => {
    if (g === deger) return
    const z = setTimeout(() => setG(deger), ms)
    return () => clearTimeout(z)
  }, [deger, ms, g])
  return g
}

/** İşçiden anahtar başına tek sonuç; anahtar null ise istek yok. Eski sonuç yenisi gelene dek tutulur. */
function useIsciSonucu(anahtar, iste) {
  const [sonuc, setSonuc] = useState({ anahtar: null, deger: null, hata: null })
  useEffect(() => {
    if (!anahtar) return
    let iptal = false
    iste().then(
      (deger) => !iptal && setSonuc({ anahtar, deger, hata: null }),
      (hata) => !iptal && setSonuc({ anahtar, deger: null, hata }),
    )
    return () => {
      iptal = true
    }
  }, [anahtar]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...sonuc, guncel: anahtar != null && sonuc.anahtar === anahtar }
}

/** Kart içi küçük parçalı düğme. */
function KucukSecim({ secenekler, deger, onSec, etiket }) {
  return (
    <div role="group" aria-label={etiket} className="flex rounded-md border border-cizgi bg-yuzey p-0.5">
      {secenekler.map(([d, e]) => (
        <button
          key={d}
          type="button"
          aria-pressed={d === deger}
          onClick={() => onSec(d)}
          className={`flex-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] tracking-wide tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60 ${
            d === deger ? 'bg-yuzey-acik text-metin ring-1 ring-inset ring-gunes/70' : 'text-metin-solgun hover:text-metin'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {Array} props.krater  [doğu, kuzey, D, güven]
 * @param {object} props.veri   mlcraters dosyası (node, accuracy)
 * @param {string} props.izgara ızgara dosya kökü (izgara_<ad>)
 * @param {object} props.inis   useInisOlasiligi()
 */
export default function KraterKarti({ kartRef, krater, veri, izgara, inis, onKapat }) {
  const [e, n, cap, guven] = krater
  const hucre = kraterHucresi(veri.node, krater)
  const g = hucre ? veri.node.haz_frac[hucre.k] : undefined
  const isabet = kraterIsabeti(veri, cap)
  const renk = `rgb(${guvenRengi(guven).join(',')})`

  const { t, tL, D, kartPencere, kartBatarya, kartPencereSec, kartBataryaSec } = useDurum(
    useShallow((s) => ({
      t: s.t,
      tL: s.tL,
      D: s.D,
      kartPencere: s.kartPencere,
      kartBatarya: s.kartBatarya,
      kartPencereSec: s.kartPencereSec,
      kartBataryaSec: s.kartBataryaSec,
    })),
  )
  const tKip = kartPencere === 't14'
  const bas = useGecikmeli(tKip ? t : tL, 200)
  const gun = tKip ? ONERI_GUN : D
  const pencereTasar = bas + gun * 24 > 8760
  const hedef = hucre ? { i: hucre.i, j: hucre.j } : null
  const ortak = { izgara, hedef, ground: veri.node.haz_frac, batteryH: kartBatarya }

  const anahtar = hedef && !pencereTasar ? `${izgara}|${bas}|${gun}|${kartBatarya}|${hedef.i},${hedef.j}` : null
  const sonuc = useIsciSonucu(anahtar, () => inis.hesapla({ ...ortak, bas, gun }))
  const deger = sonuc.deger
  const sifir = !!deger && 100 * deger.pLow < 0.05
  const oneriAnahtar = sifir && sonuc.guncel ? `${izgara}|${bas}|${kartBatarya}|${hedef.i},${hedef.j}` : null
  const oneri = useIsciSonucu(oneriAnahtar, () => inis.oneri({ ...ortak, bas }))
  const neden = deger ? nedenler(deger) : []

  const oneriyeGit = (o) => useDurum.setState({ t: o.t, kartPencere: 't14', oynatiliyor: false })

  return (
    <div
      ref={kartRef}
      data-krater-kart=""
      role="dialog"
      aria-label="Krater bilgisi"
      className="pointer-events-auto absolute left-0 top-0 z-20 w-[264px] rounded-lg border border-cizgi bg-zemin/95 px-3 py-2.5 backdrop-blur-sm text-xs leading-snug text-metin shadow-lg"
      style={{ visibility: 'hidden' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          Krater · D ≈ {cap.toFixed(1)} m
        </p>
        <button
          type="button"
          onClick={onKapat}
          aria-label="Kapat (ESC)"
          className="-mr-1 -mt-0.5 rounded px-1 text-metin-solgun hover:text-metin focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
        >
          ×
        </button>
      </div>

      <p className="mt-1.5 flex items-center justify-between tabular-nums">
        <span>ML güven skoru: %{Math.round(guven * 100)} (olasılık değil)</span>
      </p>
      <div className="mt-1 h-1.5 w-full rounded-full bg-cizgi" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.round(guven * 100)}%`, background: renk }} />
      </div>
      {isabet != null && (
        <p className="mt-1.5 text-metin-solgun">
          Bu boyuttaki tespitlerin ~{yuzdeIyelik(Math.round(isabet * 100))} gerçek krater (kutup testi, {cap < 20 ? '10–20 m' : '≥ 20 m'})
        </p>
      )}

      <p className="mt-1.5 tabular-nums">
        Hücre tehlikesi{' '}
        {g === undefined ? '—' : g === null ? <span className="text-metin-solgun">bilinmiyor — gölge</span> : <>g = {g.toFixed(2)}</>}
      </p>

      <div className="mt-1.5 space-y-1 border-t border-cizgi pt-1.5" data-inis-sonucu="">
        <div data-kart-pencere="">
          <KucukSecim
            etiket="İniş penceresi"
            secenekler={[
              ['t14', `${ONERI_GUN} gün (t'den)`],
              ['gorev', 'Görev penceresi (tL, D)'],
            ]}
            deger={kartPencere}
            onSec={kartPencereSec}
          />
        </div>
        <div className="flex items-center gap-2" data-kart-batarya="">
          <span className="text-[10px] text-metin-solgun">Batarya</span>
          <div className="flex-1">
            <KucukSecim etiket="Batarya" secenekler={KART_BATARYALARI.map((b) => [b, `${b} sa`])} deger={kartBatarya} onSec={kartBataryaSec} />
          </div>
        </div>

        {pencereTasar ? (
          <p className="pt-0.5 text-metin-solgun">Pencere 2027 verisinin dışına taşıyor.</p>
        ) : sonuc.hata && sonuc.guncel ? (
          <p className="pt-0.5 text-uyari">Hesaplanamadı: {sonuc.hata.message}</p>
        ) : !deger ? (
          <p className="pt-0.5 text-metin-solgun">Buraya inersen: başarı hesaplanıyor…</p>
        ) : sifir ? (
          <div className={`pt-0.5 transition-opacity ${sonuc.guncel ? '' : 'opacity-60'}`} data-sifir="">
            <p>
              Buraya inersen: başarı <span className="tabular-nums text-uyari">%0</span>
            </p>
            {neden
              .filter((x, k) => k === 0 || x.pay >= 0.5)
              .slice(0, 2)
              .map((x) => (
                <p key={x.anahtar} className="mt-1 text-[13px] font-medium leading-tight text-uyari">
                  {(NEDEN_UZUN[x.anahtar] ?? (() => x.ad))(kartBatarya)}
                </p>
              ))}
            <div className="mt-1.5" data-oneri="">
              {!oneri.guncel ? (
                <p className="text-metin-solgun">Daha iyi bir tarih aranıyor…</p>
              ) : oneri.hata ? null : oneri.deger ? (
                <button
                  type="button"
                  onClick={() => oneriyeGit(oneri.deger)}
                  title={`${tarihBicimle(tarih(oneri.deger.t))} başlangıçlı ${ONERI_GUN} gün — zamanı oraya taşı`}
                  className="w-full rounded-md border border-gunes/50 bg-gunes/10 px-2 py-1 text-left text-metin transition-colors hover:bg-gunes/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60"
                >
                  → {gunde(oneri.deger.t)} inersen: <span className="tabular-nums text-gunes">%{Math.round(100 * oneri.deger.pLow)}</span>
                  <span className="text-metin-solgun"> ({ONERI_GUN} gün)</span>
                </button>
              ) : (
                <p className="text-metin-solgun">
                  2027 sonuna kadar %50'yi geçen {ONERI_GUN} günlük başlangıç yok
                  {neden[0]?.anahtar === 'dark' && kartBatarya < KART_BATARYALARI.at(-1) ? '; daha büyük batarya dene.' : '.'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className={`pt-0.5 transition-opacity ${sonuc.guncel ? '' : 'opacity-60'}`}>
            <p className="text-sm">
              Buraya inersen: başarı <span className="tabular-nums text-gunes">%{(100 * deger.pLow).toFixed(1)}</span>
            </p>
            {neden[0] && (
              <p className="text-metin-solgun">
                başarısızlığın çoğu: {neden[0].ad} (%{Math.round(100 * neden[0].pay)})
              </p>
            )}
          </div>
        )}
        <p className="text-[10px] text-metin-solgun/80">
          Hedef bu 100 m hücre; {tKip ? tarihBicimle(tarih(bas)) : gunBicimle(tarih(bas))} + {gun} gün, σ {INIS_VARSAYILAN.sigmaM} m, eğim ≤{' '}
          {INIS_VARSAYILAN.slopeMax}°, tampon {INIS_VARSAYILAN.bufferH} sa, ML krater riski dahil.
        </p>
      </div>

      <p className="mt-1.5 text-[10px] text-metin-solgun/80">Güven skoru olasılık değildir; model kalibre edilmedi.</p>
    </div>
  )
}
