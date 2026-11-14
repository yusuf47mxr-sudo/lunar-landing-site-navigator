// 3B yerel sahne — sunumun ana görseli.
//
// react-three-fiber + drei + postprocessing. Yalnız bu parça three.js içerir;
// GokyuzuKutusu React.lazy ile 3B seçilince yükler. Katmanlar:
//   Arazi (LOLA, r ≈ 5 km, 50 m) + etek + uzak ufuk şeridi (R·tan H(az)) + koni
//   sacak — tek parça zemin · never_lit örtüsü · Güneş ve Dünya gök küresinde
//   (şerit × 1.1; ufkun altında derinlik testiyle örtülür) · yıldızlar · pusula,
//   iniş aracı ve etiketler · kamera kipleri (+ açılış uçuşu) · tam ekran katmanı.
// Gölge haritası 4096; ilk saniyelerde fps < 40 ise sessizce 2048'e iner.
// WebGL yoksa ya da sahne hata verirse onHata çağrılır; kutu panoramaya döner.
//
// Veri: public/veri/3b/<file> (yalnız seçili alan). Özel koordinatta arazi
// verisi yoktur: düz plaka ve not.

import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { PCFShadowMap } from 'three'
import { useBolgeler } from '../../durum/store.js'
import Secenekler from '../Secenekler.jsx'
import Arazi, { NEVER_LIT_RENK, zeminOlustur } from './Arazi.jsx'
import Gok from './Gok.jsx'
import Iskelet from './Iskelet.jsx'
import EkranEtiketleri from './EkranEtiketleri.jsx'
import Kamera, { FOV } from './Kamera.jsx'
import Pusula, { PUSULA_YARICAP, sahneEtiketleri } from './Pusula.jsx'
import { ABARTILAR, KAMERA_UZAK, UFUK_YARICAP } from './sahne.js'
import { TamEkranKatmani, useKatmanGorunur, useTamEkran } from './TamEkran.jsx'
import { useArazi } from './veri.js'

/** Bloom yalnız bunun üstündeki parlaklığı alır: Güneş diski (ton eşlemesiz, ~8). */
const BLOOM_ESIK = 2.0
const KARANLIK_ESIK = 0.5

/** Gölge haritası: ilk ölçümde yavaşsa 2048'e iner; sayfa oturumu boyunca hatırlanır. */
const GOLGE_IYI = 4096
const GOLGE_HAFIF = 2048
const FPS_ESIK = 40
let golgeBoyutu = GOLGE_IYI

/**
 * İlk karelerden sonra (1. ile 3. saniye arası) fps'i bir kez ölçer; eşiğin
 * altındaysa onYavas(fps) çağırır. Arayüzde görünmez.
 */
function GolgeOlcer({ onYavas }) {
  const d = useRef({ ilk: null, bas: null, kare: 0, bitti: false })
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
      const fps = (o.kare * 1000) / (simdi - o.bas)
      if (import.meta.env.DEV) window.__golgeOlcum = { fps: Math.round(fps * 10) / 10 }
      if (fps < FPS_ESIK) onYavas(fps)
    }
  })
  return null
}

const KAMERA_SECENEKLERI = [
  { deger: 'yerden', etiket: 'Yerden' },
  { deger: 'kus', etiket: 'Kuş bakışı' },
  { deger: 'gunes', etiket: "Güneş'e bak" },
  { deger: 'dunya', etiket: "Dünya'ya bak" },
]
const ABARTI_SECENEKLERI = ABARTILAR.map((a) => ({ deger: a, etiket: `${a}×` }))

export function webglVar() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Sahne içindeki bir hatayı yakalar ve onHata ile üst bileşene bildirir. */
class HataSiniri extends Component {
  state = { hata: null }
  static getDerivedStateFromError(hata) {
    return { hata }
  }
  componentDidCatch(hata) {
    this.props.onHata?.(hata)
  }
  render() {
    return this.state.hata ? null : this.props.children
  }
}

function BuyutSimgesi({ acik }) {
  return acik ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * @param {object} props.anlik   useAnlikDurum() çıktısı
 * @param {number} props.f  @param {0|1} props.c
 * @param {string} [props.aciklama]  alanın kısa açıklaması (tam ekran katmanı)
 * @param {(hata: Error) => void} props.onHata
 */
export default function AraziSahnesi({ anlik, f, c, aciklama, onHata }) {
  const { alan, horizon, sunAlt, sunAz, earthAlt, earthAz, kutup, yaklasik } = anlik
  const { bolgeler } = useBolgeler()
  // null: özel koordinat (düz zemin); undefined: liste henüz yüklenmedi (bekle)
  const dosya = yaklasik ? null : bolgeler ? (bolgeler.find((b) => b.site === alan?.site)?.file ?? null) : undefined
  const { arazi, hata } = useArazi(dosya)

  const [abarti, setAbarti] = useState(1)
  const [komut, setKomut] = useState({ tip: 'kus', sira: 0 })
  const [kip, setKip] = useState('kus') // 'yerden' | 'kus' (Güneş/Dünya'ya bak kipi korur)
  const kamera = (tip) => {
    if (tip === 'yerden' || tip === 'kus') setKip(tip)
    setKomut((k) => ({ tip, sira: k.sira + 1 }))
  }
  // Alan değişince kuş bakışına dön
  useEffect(() => {
    setKip('kus')
    setKomut((k) => ({ tip: 'kus', sira: k.sira + 1 }))
  }, [arazi])

  const kapsayici = useRef(null)
  const { tamEkran, sahte, degistir } = useTamEkran(kapsayici)
  const katman = useKatmanGorunur(tamEkran, kapsayici)

  useEffect(() => {
    if (!webglVar()) onHata?.(new Error('WebGL yok'))
  }, [onHata])
  useEffect(() => {
    if (hata) onHata?.(hata)
  }, [hata, onHata])

  const [golgeBoyut, setGolgeBoyut] = useState(golgeBoyutu)
  const golgeOlcumu = golgeBoyutu === GOLGE_IYI // zaten düşürüldüyse yeniden ölçme
  const yavasSa = useMemo(
    () => () => {
      golgeBoyutu = GOLGE_HAFIF
      setGolgeBoyut(GOLGE_HAFIF)
    },
    [],
  )
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__golgeBoyut = golgeBoyut

  // Zemin modeli: arazi + etek + şerit + sacak; kamera da buna kenetlenir
  const zemin = useMemo(() => (arazi ? zeminOlustur(arazi, abarti, horizon) : null), [arazi, abarti, horizon])
  // Gölge kamerası: arazi + etek, ufka kadar (dışında gölge sınırı çizgisi görünmesin)
  const golgeYari = useMemo(
    () => (arazi ? Math.hypot(UFUK_YARICAP, ((arazi.enCok - arazi.enAz) * abarti) / 2) : UFUK_YARICAP),
    [arazi, abarti],
  )
  const etiketler = useMemo(
    () =>
      arazi
        ? sahneEtiketleri({ arazi, abarti, r: PUSULA_YARICAP[kip], kip, earthAz, earthAlt, sunAz, sunAlt, c })
        : [],
    [arazi, abarti, kip, earthAz, earthAlt, sunAz, sunAlt, c],
  )
  const ogeler = useRef({})

  const karanlik = f <= KARANLIK_ESIK
  const karanlikNot = sunAlt + 0.266 < 0 ? 'Güneş ufkun altında' : 'Güneş uzaktaki arazinin arkasında'
  const neverLitVar = !!arazi?.neverLit && arazi.neverLit.values.some((v) => v === 1)

  const hud = `transition-opacity duration-500 ${!tamEkran || katman ? 'opacity-100' : 'pointer-events-none opacity-0'}`

  return (
    <div
      ref={kapsayici}
      className={`relative h-full w-full overflow-hidden bg-zemin ${sahte ? 'fixed inset-0 z-50' : ''}`}
      data-3b-sahne=""
      data-tam-ekran={tamEkran ? '' : undefined}
    >
      {!arazi ? (
        <Iskelet metin={hata ? 'Arazi verisi yüklenemedi' : 'Arazi verisi yükleniyor…'} />
      ) : (
        <HataSiniri onHata={onHata}>
          <Canvas
            shadows={{ type: PCFShadowMap }}
            dpr={[1, 2]}
            camera={{ fov: FOV.kus, near: 0.5, far: KAMERA_UZAK, position: [0, 30000, 4000] }}
            gl={{ antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <color attach="background" args={['#02030a']} />
            <Gok
              sunAlt={sunAlt}
              sunAz={sunAz}
              earthAlt={earthAlt}
              earthAz={earthAz}
              f={f}
              c={c}
              golgeYari={golgeYari}
              golgeBoyut={golgeBoyut}
            />
            <Arazi arazi={arazi} abarti={abarti} zemin={zemin} />
            <Pusula arazi={arazi} abarti={abarti} yaricap={PUSULA_YARICAP[kip]} aracGorunur={kip !== 'yerden'} />
            <EkranEtiketleri noktalar={etiketler} ogeler={ogeler} />
            <Kamera komut={komut} zemin={zemin} sunAlt={sunAlt} sunAz={sunAz} earthAlt={earthAlt} earthAz={earthAz} />
            {golgeOlcumu && <GolgeOlcer onYavas={yavasSa} />}
            <EffectComposer multisampling={4}>
              <Bloom luminanceThreshold={BLOOM_ESIK} luminanceSmoothing={0.3} mipmapBlur intensity={1.2} radius={0.7} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
          </Canvas>
        </HataSiniri>
      )}

      {/* Sahne etiketleri: konumları EkranEtiketleri her karede yazar */}
      {arazi && (
        <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true" data-etiketler="">
          {etiketler.map((e) => (
            <div
              key={e.id}
              data-etiket={e.id}
              ref={(el) => {
                if (el) ogeler.current[e.id] = el
                else delete ogeler.current[e.id]
              }}
              className={`absolute left-0 top-0 select-none whitespace-nowrap leading-tight opacity-0 ${e.sinif}`}
            >
              {e.ok ? (
                <span className="flex items-center gap-1.5">
                  <svg data-ok="" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                    <path d="M2 8h10M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>
                    {e.metin}
                    {e.ikinci && <span className="block text-[10px] opacity-80">{e.ikinci}</span>}
                  </span>
                </span>
              ) : (
                e.metin
              )}
            </div>
          ))}
        </div>
      )}

      {/* Üst orta: karanlık notu */}
      {arazi && karanlik && (
        <p
          data-karanlik-not=""
          className={`pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-xs tracking-wide text-metin-solgun ${hud}`}
        >
          <span className="rounded-md bg-zemin/70 px-2 py-1">{karanlikNot}</span>
        </p>
      )}

      {/* Sağ üst: büyüt/küçült */}
      <button
        type="button"
        onClick={degistir}
        aria-label={tamEkran ? 'Tam ekrandan çık (ESC)' : 'Tam ekran (F)'}
        title={tamEkran ? 'Tam ekrandan çık (ESC)' : 'Tam ekran (F)'}
        className={`absolute right-3 top-3 z-30 grid h-8 w-8 place-items-center rounded-md border border-cizgi bg-zemin/70 text-metin-solgun
          hover:text-metin focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60 ${hud}`}
      >
        <BuyutSimgesi acik={tamEkran} />
      </button>

      {/* Sol alt: (yerden notu) kamera ve düşey abartı */}
      <div className={`absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 ${tamEkran ? 'bottom-[7.5rem]' : ''} ${hud}`}>
        {kip === 'yerden' && (
          <p data-yerden-not="" className="pointer-events-none w-full text-[11px] tracking-wide text-metin-solgun">
            Ay'da hava olmadığı için gölgeler tam karanlık.
          </p>
        )}
        <Secenekler secenekler={KAMERA_SECENEKLERI} deger={komut.tip} onSec={kamera} etiket="Kamera" kucuk className="bg-zemin/70" />
        <Secenekler secenekler={ABARTI_SECENEKLERI} deger={abarti} onSec={setAbarti} etiket="Düşey abartı" kucuk className="bg-zemin/70" />
        {kutup && abarti === 1 && <span className="text-[11px] text-metin-solgun">kutupta 2× önerilir</span>}
      </div>

      {/* Sağ alt: açıklamalar */}
      <div className={`pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1 text-[11px] text-metin-solgun ${tamEkran ? 'bottom-[7.5rem]' : ''} ${hud}`}>
        {neverLitVar && (
          <span className="flex items-center gap-1.5 rounded-md bg-zemin/70 px-2 py-0.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NEVER_LIT_RENK, opacity: 0.7 }} />
            18 yılda hiç güneş almayan bölge
          </span>
        )}
        {arazi?.duz && <span className="rounded-md bg-zemin/70 px-2 py-0.5 text-uyari">Arazi verisi yok: düz zemin</span>}
      </div>

      {tamEkran && <TamEkranKatmani gorunur={katman} aciklama={aciklama} />}
    </div>
  )
}
