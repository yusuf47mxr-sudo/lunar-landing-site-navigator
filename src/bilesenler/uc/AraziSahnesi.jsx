// 3B yerel sahne — sunumun ana görseli.
//
// react-three-fiber + drei + postprocessing. Yalnız bu parça three.js içerir;
// GokyuzuKutusu React.lazy ile 3B seçilince yükler. Katmanlar:
//   Arazi (LOLA, r ≈ 5 km, 50 m) + etek + uzak ufuk şeridi (R·tan H(az)) + koni
//   sacak — tek parça zemin · never_lit örtüsü · Güneş ve Dünya gök küresinde
//   (şerit × 1.1; ufkun altında derinlik testiyle örtülür) · yıldızlar · pusula,
//   iniş aracı ve etiketler · kamera kipleri (+ açılış uçuşu) · tam ekran katmanı.
// Gölge haritası 4096; ilk saniyelerde fps < 40 ise sessizce 2048'e iner.
// Sahne hata verirse onHata çağrılır; kutu panoramaya döner. Tam ekran, üst
// katman ve gezinti çubuğu kapsayıcıdadır (UcBoyut); burası yalnız yerel sahne.
//
// Veri: public/veri/3b/<file> (yalnız seçili alan). Özel koordinatta arazi
// verisi yoktur: düz plaka ve not.

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PCFShadowMap } from 'three'
import { useBolgeler } from '../../durum/store.js'
import Secenekler from '../Secenekler.jsx'
import Arazi, { NEVER_LIT_RENK, zeminOlustur } from './Arazi.jsx'
import Gok from './Gok.jsx'
import Iskelet from './Iskelet.jsx'
import EkranEtiketleri from './EkranEtiketleri.jsx'
import { HataSiniri } from './HataSiniri.jsx'
import Kamera, { FOV } from './Kamera.jsx'
import { KRATER_RENK, MlKraterler, mlAciklamasi, useKatmanShader, useMlVerisi, useNacDokusu, useTehlikeDokusu } from './MlKatmanlari.jsx'
import Pusula, { PUSULA_YARICAP, sahneEtiketleri } from './Pusula.jsx'
import { ABARTILAR, KAMERA_UZAK, UFUK_YARICAP } from './sahne.js'
import { useArazi } from './veri.js'

/** Bloom yalnız bunun üstündeki parlaklığı alır: Güneş diski (ton eşlemesiz, ~8). */
const BLOOM_ESIK = 2.0
const KARANLIK_ESIK = 0.5

/** Gölge haritası: ilk ölçümde yavaşsa 2048'e iner; sayfa oturumu boyunca hatırlanır. */
const GOLGE_IYI = 4096
const GOLGE_HAFIF = 2048
const FPS_ESIK = 40
let golgeBoyutu = GOLGE_IYI

/** Yalnız geliştirmede: test betikleri için sahne noktası → istemci pikseli. */
function GelistirmeIzdusum() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__yerelIzdusum = (x, y, z) => {
      const v = camera.position.clone().set(x, y, z).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, onde: v.z < 1 }
    }
    return () => delete window.__yerelIzdusum
  }, [camera, gl])
  return null
}

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

/**
 * @param {object} props.anlik   useAnlikDurum() çıktısı
 * @param {number} props.f  @param {0|1} props.c
 * @param {(hata: Error) => void} props.onHata
 * @param {boolean} props.tamEkran  kapsayıcı tam ekranda mı (alt kontroller zaman çubuğunun üstüne çıkar)
 * @param {string} props.hud  üst katman solma sınıfı (kapsayıcıdan)
 * @param {boolean} [props.acilisUcusu]  sahne açılınca yüksekten iniş uçuşu (küreden gelince)
 */
export default function AraziSahnesi({ anlik, f, c, onHata, tamEkran = false, hud = '', acilisUcusu = false }) {
  const { alan, horizon, sunAlt, sunAz, earthAlt, earthAz, kutup, yaklasik } = anlik
  const { bolgeler } = useBolgeler()
  // null: özel koordinat (düz zemin); "kaba:…": 80°G içi özel koordinat (400 m DEM'den kaba arazi);
  // undefined: liste ya da alan verisi henüz yüklenmedi (bekle)
  const dosya = yaklasik
    ? alan?.ufukKaynagi === 'dem400'
      ? `kaba:${alan.lat},${alan.lon}`
      : alan
        ? null
        : undefined
    : bolgeler && alan
      ? (bolgeler.find((b) => b.site === alan.site)?.file ?? null)
      : undefined
  const { arazi, hata } = useArazi(dosya)

  const [abarti, setAbarti] = useState(1)
  const [komut, setKomut] = useState({ tip: 'kus', sira: 0 })
  const [kip, setKip] = useState('kus') // 'yerden' | 'kus' (Güneş/Dünya'ya bak kipi korur)
  // v5 ML katmanları (yalnız taranan 10 alanda düğmeler görünür; varsayılan kapalı)
  const [katman, setKatman] = useState({ foto: false, krater: false, tehlike: false })
  const [kraterTumu, setKraterTumu] = useState(false) // false: D ≥ 20 m; true: hepsi (≥ 10 m)
  const [kraterUzerinde, setKraterUzerinde] = useState(null) // { D, x, y }
  const kapsayici = useRef(null)
  const kamera = (tip) => {
    if (tip === 'yerden' || tip === 'kus') setKip(tip)
    else if (tip === 'foto') setKip('kus')
    setKomut((k) => ({ tip, sira: k.sira + 1 }))
  }
  // Alan değişince kuş bakışına dön
  useEffect(() => {
    setKip('kus')
    setKomut((k) => ({ tip: 'kus', sira: k.sira + 1 }))
  }, [arazi])

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

  const ml = arazi?.ml ?? null
  const mlAcik = !!ml && (katman.foto || katman.krater || katman.tehlike)
  const mlVeri = useMlVerisi(ml, !!ml && (katman.krater || katman.tehlike))
  const kraterler = useMemo(
    () => (mlVeri.veri ? (kraterTumu ? mlVeri.veri.craters : mlVeri.veri.craters.filter((k) => k[2] >= 20)) : []),
    [mlVeri.veri, kraterTumu],
  )
  const kapsayiciKutu = () => kapsayici.current?.getBoundingClientRect()

  // Fotoğraf ve tehlike arazi malzemesinin içinde (useKatmanShader): uniform'lar güncellenir
  const katmanShader = useKatmanShader()
  const fotoDokusu = useNacDokusu(ml, !!ml && katman.foto)
  const tehlikeDokusu = useTehlikeDokusu(ml && katman.tehlike ? mlVeri.veri?.node : null)
  useEffect(() => {
    const u = katmanShader.u
    u.uKFoto.value = fotoDokusu ?? u.uKFoto.value
    u.uKFotoAcik.value = ml && katman.foto && fotoDokusu ? 1 : 0
    u.uKTehlike.value = tehlikeDokusu ?? u.uKTehlike.value
    u.uKTehlikeAcik.value = ml && katman.tehlike && tehlikeDokusu ? 1 : 0
    if (ml) u.uKYari.value = ml.yari_m
    if (mlVeri.veri) {
      u.uKHucre.value = mlVeri.veri.node.spacing_m
      u.uKN.value = mlVeri.veri.node.n
    }
  }, [katmanShader, ml, katman.foto, katman.tehlike, fotoDokusu, tehlikeDokusu, mlVeri.veri])
  /** Katman düğmesi; fotoğraf açılınca kamera 3 km'lik kareyi kadraja alır. */
  const katmanDegistir = (ad) => {
    const fotoAcilacak = ad === 'foto' && !katman.foto
    setKatman((s) => ({ ...s, [ad]: !s[ad] }))
    if (fotoAcilacak) kamera('foto')
  }

  const karanlik = f <= KARANLIK_ESIK
  const karanlikNot = sunAlt + 0.266 < 0 ? 'Güneş ufkun altında' : 'Güneş uzaktaki arazinin arkasında'
  const neverLitVar = !!arazi?.neverLit && arazi.neverLit.values.some((v) => v === 1)

  return (
    <div ref={kapsayici} className="relative h-full w-full overflow-hidden bg-zemin" data-yerel-sahne="">
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
            <Arazi arazi={arazi} abarti={abarti} zemin={zemin} katman={katmanShader} />
            <Pusula arazi={arazi} abarti={abarti} yaricap={PUSULA_YARICAP[kip]} aracGorunur={kip !== 'yerden'} />
            {ml && katman.krater && kraterler.length > 0 && (
              <MlKraterler arazi={arazi} abarti={abarti} kraterler={kraterler} onUzerinde={setKraterUzerinde} />
            )}
            <EkranEtiketleri noktalar={etiketler} ogeler={ogeler} />
            <Kamera komut={komut} zemin={zemin} sunAlt={sunAlt} sunAz={sunAz} earthAlt={earthAlt} earthAz={earthAz} acilisUcusu={acilisUcusu} />
            {golgeOlcumu && <GolgeOlcer onYavas={yavasSa} />}
            {import.meta.env.DEV && <GelistirmeIzdusum />}
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

      {/* Üzerine gelinen krater */}
      {kraterUzerinde && katman.krater && (() => {
        const k = kapsayiciKutu()
        if (!k) return null
        return (
          <p
            data-krater-ipucu=""
            className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md border border-cizgi bg-zemin/90 px-2 py-1 text-xs text-metin"
            style={{ left: kraterUzerinde.x - k.left + 12, top: kraterUzerinde.y - k.top - 28 }}
          >
            Krater, D ≈ {Math.round(kraterUzerinde.D)} m
          </p>
        )
      })()}

      {/* Sol alt: (ML katmanları) (yerden notu) kamera ve düşey abartı */}
      <div className={`absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 ${tamEkran ? 'bottom-[7.5rem]' : ''} ${hud}`}>
        {ml && (
          <div role="group" aria-label="ML katmanları" data-ml-dugmeler="" className="flex w-full flex-wrap items-center gap-1.5">
            {[
              ['foto', 'Fotoğraf'],
              ['krater', 'Küçük kraterler (ML)'],
              ['tehlike', 'Tehlike'],
            ].map(([ad, etiket]) => (
              <button
                key={ad}
                type="button"
                aria-pressed={katman[ad]}
                onClick={() => katmanDegistir(ad)}
                className={`rounded-md border px-2.5 py-1 text-xs tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60 ${
                  katman[ad] ? 'border-gunes/70 bg-yuzey-acik text-metin' : 'border-cizgi bg-zemin/70 text-metin-solgun hover:text-metin'
                }`}
              >
                {etiket}
              </button>
            ))}
            {katman.krater && (
              <Secenekler
                secenekler={[
                  { deger: false, etiket: 'D ≥ 20 m' },
                  { deger: true, etiket: 'tümü (≥ 10 m)' },
                ]}
                deger={kraterTumu}
                onSec={setKraterTumu}
                etiket="Krater boyutu"
                kucuk
                className="bg-zemin/70"
              />
            )}
          </div>
        )}
        {kip === 'yerden' && (
          <p data-yerden-not="" className="pointer-events-none w-full text-[11px] tracking-wide text-metin-solgun">
            Ay'da hava olmadığı için gölgeler tam karanlık.
          </p>
        )}
        <Secenekler secenekler={KAMERA_SECENEKLERI} deger={komut.tip === 'foto' ? 'kus' : komut.tip} onSec={kamera} etiket="Kamera" kucuk className="bg-zemin/70" />
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
        {arazi?.kaba && (
          <span data-kaba-arazi="" className="rounded-md bg-zemin/70 px-2 py-0.5 text-uyari">
            Kaba arazi: 400 m kutup DEM'i (küçük tepeler görünmez)
          </span>
        )}
        {/* ML açıklaması, katman açıklamaları ve krediler */}
        {mlAcik && (
          <div data-ml-aciklama="" className="max-w-[360px] rounded-md bg-zemin/80 px-2.5 py-1.5 text-right leading-snug">
            {katman.foto && <p className="text-metin/85">LROC NAC fotoğrafı (ışık fotoğraftan, sahne ışığından bağımsız)</p>}
            {(katman.krater || katman.tehlike) && <p className={`text-metin/85 ${katman.foto ? 'mt-1' : ''}`}>{mlAciklamasi(mlVeri.veri, mlVeri.kalibrasyon)}</p>}
            {katman.krater && (
              <p className="mt-1 flex items-center justify-end gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: KRATER_RENK }} />
                ML kraterleri ({kraterTumu ? 'D ≥ 10 m' : 'D ≥ 20 m'}, {kraterler.length})
              </p>
            )}
            {katman.tehlike && (
              <>
                <p className="mt-1">Tehlike: iniş ayağının krater payı g (100 m hücre)</p>
                <div className="mt-0.5 flex items-center justify-end gap-1.5">
                  <span>0</span>
                  <span
                    className="inline-block h-2.5 w-28 rounded-sm"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(255,180,110,0.05) 0%, rgba(255,180,110,0.18) 20%, rgba(255,120,45,0.55) 60%, rgba(196,60,20,0.85) 100%)',
                    }}
                  />
                  <span>≥ 0.5</span>
                </div>
                <p className="mt-0.5">g &lt; 0.10 neredeyse saydam · 0.10–0.30 açık turuncu · ≥ 0.30 koyu turuncu-kırmızı</p>
                <p className="mt-0.5 flex items-center justify-end gap-1.5">
                  <span
                    className="inline-block h-2.5 w-6 rounded-sm"
                    style={{ background: 'repeating-linear-gradient(135deg, rgba(200,206,214,0.95) 0 3px, rgba(120,128,140,0.35) 3px 7px)' }}
                  />
                  unknown — shadowed, ML can&apos;t see (bilinmiyor, güvenli değil)
                </p>
              </>
            )}
            <p className="mt-1 text-[10px] text-metin-solgun/80">
              {katman.foto && <>LROC NAC: NASA/GSFC/Arizona State University · </>}
              {(katman.krater || katman.tehlike) && <>Craters: Boazman et al. 2024; SomBench NAC (NASA–IBM, CC BY 4.0) · </>}
              Not an official NASA product.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
