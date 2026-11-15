// 3B Ay küresi — bütün alanlar tek Ay üzerinde; tıklayınca yerel sahneye uçuş.
//
// Küre: yarıçap 1, 256 dilim; LROC WAC renk dokusu (2k, tam ekranda 4k),
// LOLA yükseklik haritasından displacement (4×) ve normal haritası.
// Işık: Güneş alt-noktası yönünden yönlü ışık (zaman kaydırıcısıyla akıcı
// kayar); gece tarafını yalnız Dünya'ya bakan yüzde çok hafif earthshine
// aydınlatır. Uzakta evreli küçük Dünya ve sönük yıldızlar. Güneş ekranda yok.
// İşaretler DOM'dadır (kategoriye göre şekil); arka yüzdekiler gizlenir,
// yakınlaşınca adlar açılır. Bu Canvas yerel sahneyle aynı anda bağlı olmaz.

import { OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Quaternion, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'
import { INIS_ADIM_SAAT } from '../../core/sabitler.js'
import { useDil } from '../../dil/index.js'
import { useBolgeler, useDurum, useEfemeris, useOzet } from '../../durum/store.js'
import { useAyDokulari } from './ayDokulari.js'
import { HataSiniri } from './HataSiniri.jsx'
import Iskelet from './Iskelet.jsx'
import { enlemBoylamVektoru, kameraDurusu, yakinBakis } from './kure.js'
import { useKutupYamasi } from './kutupYamasi.js'

const DUNYA_UZAKLIK = 42
const DUNYA_YARICAP = 0.55
const ISARET_YARICAP = 1.012
/** Kamera bu uzaklığın altındayken alan adları açılır (yalnız noktalar uzakta). */
const ETIKET_UZAKLIK = 2.15
const UCUS_SURE = 2.0 // sn, işarete tıklayınca yaklaşma
const DONUS_SURE = 1.6 // sn, yerel sahneden geri
const DONME_SURE = 1.2 // sn, listeden başka alan seçilince

// Kategori → işaret şekli. Adlar sözlükten: t(`kategori.${k}`) (Artemis: kure.artemisIII).
export const SEKILLER = {
  artemis: { yol: <circle cx="6" cy="6" r="4.2" /> },
  clps: { yol: <rect x="2" y="2" width="8" height="8" rx="0.6" /> },
  apollo: { yol: <path d="M6 1.4 10.8 10H1.2Z" /> },
  uluslararasi: { yol: <path d="M6 0.8 11.2 6 6 11.2 0.8 6Z" /> },
  ozel: { yol: <path d="M6 1v10M1 6h10" strokeWidth="2" stroke="currentColor" /> },
}

const GOLGE = '[text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_0_6px_rgba(0,0,0,0.8)]'

// --- Işık, Ay, Dünya --------------------------------------------------------

/** Güneş ve Dünya yönü: hedefe her karede yumuşakça yaklaşır (oynatırken sınır akar). */
function Isiklar({ gunesYon, dunyaYon, dunyaRef }) {
  const gunes = useRef()
  const dunyaIsik = useRef()
  const g = useMemo(() => gunesYon.clone(), []) // eslint-disable-line react-hooks/exhaustive-deps
  const d = useMemo(() => dunyaYon.clone(), []) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 10)
    g.lerp(gunesYon, k).normalize()
    d.lerp(dunyaYon, k).normalize()
    gunes.current?.position.copy(g).multiplyScalar(10)
    dunyaIsik.current?.position.copy(d).multiplyScalar(10)
    dunyaRef.current?.position.copy(d).multiplyScalar(DUNYA_UZAKLIK)
  })
  return (
    <>
      <directionalLight ref={gunes} color="#fff6ea" intensity={3.2} />
      {/* Earthshine: Dünya'ya bakan (ön) yüzde gece tarafı tamamen siyah olmasın */}
      <directionalLight ref={dunyaIsik} color="#9db7ff" intensity={0.06} />
    </>
  )
}

/**
 * Ay. Kutup yaması hazırsa küre 80°G'de kesilir ve güney kutbunu 400 m DEM'li
 * yama tamamlar (kutupYamasi.js); değilse tam küre.
 */
function Ay({ dokular, kutup }) {
  const malzeme = (
    <meshStandardMaterial
      map={dokular.renk}
      displacementMap={dokular.yer}
      displacementScale={dokular.ayar.olcek}
      displacementBias={dokular.ayar.kayma}
      normalMap={dokular.normal}
      roughness={1}
      metalness={0}
    />
  )
  return (
    <>
      {kutup.kure ? (
        <mesh key="kesik" geometry={kutup.kure}>
          {malzeme}
        </mesh>
      ) : (
        <mesh key="tam">
          <sphereGeometry args={[1, 256, 128]} />
          {malzeme}
        </mesh>
      )}
      {kutup.yama && (
        <mesh geometry={kutup.yama}>
          <meshStandardMaterial map={dokular.renk} roughness={1} metalness={0} />
        </mesh>
      )}
    </>
  )
}

/** Kamera güney kutbuna yaklaşınca (yakın ve 55°G'den güneye bakıyor) kutup yamasını ister; bir kez. */
function KutupTetik({ onIste }) {
  const camera = useThree((s) => s.camera)
  const istendi = useRef(false)
  useFrame(() => {
    if (istendi.current) return
    const r = camera.position.length()
    if (r < 2.4 && camera.position.y / r < -0.55) {
      istendi.current = true
      onIste()
    }
  })
  return null
}

/**
 * Uzakta küçük Dünya; evresini aynı Güneş ışığı verir. Gece yüzü siyah değil,
 * çok soluk gri-mavi (zayıf öz ışıma): Güneş arkadayken ince hilal + soluk disk.
 */
function Dunya({ dunyaRef }) {
  return (
    <group ref={dunyaRef}>
      <mesh>
        <sphereGeometry args={[DUNYA_YARICAP, 64, 32]} />
        <meshStandardMaterial color="#3d7bd6" emissive="#2a3240" emissiveIntensity={1} roughness={0.55} metalness={0} />
      </mesh>
    </group>
  )
}

// --- Kamera -----------------------------------------------------------------

const _q = new Quaternion()
const _a = new Vector3()
const _b = new Vector3()

/**
 * Küre çevresinde kamera. Geçiş: yön küresel ara değer (slerp), uzaklık doğrusal.
 * @param {object} props.durus  { enlem, boylam } seçili alan
 * @param {object|null} props.ucus  { enlem, boylam, site, sira } işarete tıklanınca yaklaşma
 * @param {boolean} props.donus  yerel sahneden geri dönülüyorsa (yakından başlar)
 */
function KureKamera({ durus, ucus, donus, onVaris }) {
  const camera = useThree((s) => s.camera)
  const denetim = useRef()
  const gecis = useRef(null)
  const ilk = useRef(true)
  const bakis = useRef(new Vector3()) // kameranın baktığı nokta (genelde merkez, yaklaşmada alan)
  const MERKEZ = useMemo(() => new Vector3(), [])

  /** Geçiş: konum ve bakış noktası birlikte ara değerlenir. */
  const basla = (son, sure, sonra, bakisSon = MERKEZ) => {
    const d = denetim.current
    gecis.current = { bas: camera.position.clone(), son, bakisBas: bakis.current.clone(), bakisSon, t: 0, sure, sonra }
    if (d) d.enabled = false
  }

  // Açılış ve seçili alan değişimi. Yaklaşma uçuşu sürerken (işarete tıklama da
  // alanı değiştirir) dönülmez: uçuş bitsin, iniş tetiklensin.
  useEffect(() => {
    if (!durus || gecis.current?.sonra) return
    const genel = kameraDurusu(durus.enlem, durus.boylam, 'genel')
    if (ilk.current) {
      ilk.current = false
      if (donus) {
        camera.position.copy(kameraDurusu(durus.enlem, durus.boylam, 'yakin'))
        bakis.current.copy(yakinBakis(durus.enlem, durus.boylam))
      } else camera.position.copy(genel).multiplyScalar(1.7)
      camera.lookAt(bakis.current)
      basla(genel, donus ? DONUS_SURE : DONME_SURE)
      return
    }
    basla(genel, DONME_SURE)
  }, [durus?.enlem, durus?.boylam]) // eslint-disable-line react-hooks/exhaustive-deps

  // İşarete tıklama: yaklaş, sonra yerel sahneye in
  useEffect(() => {
    if (!ucus) return
    basla(kameraDurusu(ucus.enlem, ucus.boylam, 'yakin'), UCUS_SURE, () => onVaris?.(ucus.site), yakinBakis(ucus.enlem, ucus.boylam))
  }, [ucus?.sira]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const g = gecis.current
    const d = denetim.current
    if (!g) return
    g.t = Math.min(1, g.t + Math.min(dt, 0.25) / g.sure)
    const s = g.t < 0.5 ? 4 * g.t ** 3 : 1 - (-2 * g.t + 2) ** 3 / 2
    _a.copy(g.bas).normalize()
    _b.copy(g.son).normalize()
    _q.setFromUnitVectors(_a, _b)
    const yon = _a.clone().applyQuaternion(new Quaternion().slerp(_q, s))
    const r = g.bas.length() + (g.son.length() - g.bas.length()) * s
    camera.position.copy(yon.multiplyScalar(r))
    bakis.current.lerpVectors(g.bakisBas, g.bakisSon, s)
    camera.lookAt(bakis.current)
    if (g.t >= 1) {
      gecis.current = null
      if (d) {
        d.enabled = true
        d.update()
      }
      g.sonra?.()
    }
  })

  return (
    <OrbitControls
      ref={denetim}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.45}
      zoomSpeed={0.7}
      minDistance={1.12}
      maxDistance={8}
    />
  )
}

// --- İşaretler (DOM) --------------------------------------------------------

const _p = new Vector3()
const PAY = 3

/** Her karede işaretleri ekrana izdüşürür; arka yüzdekileri gizler, adlarda çakışmayı önler. */
function IsaretIzdusumu({ noktalar, ogeler, seciliId }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const uzaklik = camera.position.length()
    const adlarAcik = uzaklik < ETIKET_UZAKLIK
    const kutular = []
    // Seçili önce yerleşir: adı her zaman görünür kalsın
    const sirali = [...noktalar].sort((a, b) => (b.id === seciliId) - (a.id === seciliId))
    for (const n of sirali) {
      const el = ogeler.current[n.id]
      if (!el) continue
      const onYuz = n.vek.dot(camera.position) > ISARET_YARICAP * 1.002
      _p.copy(n.vek).project(camera)
      const ekranda = _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05
      if (!onYuz || !ekranda) {
        el.style.visibility = 'hidden'
        continue
      }
      const x = ((_p.x + 1) / 2) * size.width
      const y = ((1 - _p.y) / 2) * size.height
      el.style.visibility = 'visible'
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      const ad = el.querySelector('[data-ad]')
      if (!ad) continue
      let goster = adlarAcik || n.id === seciliId
      if (goster) {
        const kutu = { x: x + 10, y: y - 8, w: ad.offsetWidth, h: 16 }
        if (kutular.some((k) => kutu.x < k.x + k.w + PAY && k.x < kutu.x + kutu.w + PAY && kutu.y < k.y + k.h + PAY && k.y < kutu.y + kutu.h + PAY)) goster = false
        else kutular.push(kutu)
      }
      ad.style.opacity = goster ? '1' : '0'
    }
  })
  return null
}

// --- Ana bileşen --------------------------------------------------------------

/**
 * @param {boolean} props.tamEkran  true iken 4k doku
 * @param {string} props.hud  üst katman solma sınıfı (tam ekranda fare durunca)
 * @param {boolean} props.donus  yerel sahneden geri dönülüyor
 * @param {object|null} props.ucus  { site, sira } — yaklaşma isteği (işaret ya da gezinti çubuğu)
 * @param {(site: string) => void} props.onUcus  işarete tıklanınca
 * @param {(site: string) => void} props.onInis  yaklaşma bitince (perde + yerel sahne)
 */
export default function AyKuresi({ tamEkran, hud, donus, ucus, onUcus, onInis, onHata }) {
  const { bolgeler } = useBolgeler()
  const { t, b, ad, aciklama } = useDil()
  const { ozet } = useOzet()
  const { efemeris } = useEfemeris(true)
  const p = useDurum(
    useShallow((s) => ({ t: s.t, seciliAlan: s.seciliAlan, ozelNokta: s.ozelNokta, D: s.D, tL: s.tL, hm: s.hm, epsilon: s.epsilon })),
  )
  const dokular = useAyDokulari(tamEkran)
  useEffect(() => {
    if (dokular.hata) onHata?.(dokular.hata)
  }, [dokular.hata, onHata])

  // Seçili an için Güneş ve Dünya yönü (alt-noktalardan). t depodan: alan verisi
  // yüklenirken anlik.t geçici olarak 0 olur, ışık sıçramasın.
  const an = Math.max(0, Math.min((efemeris?.n ?? 1) - 1, Math.round(p.t)))
  const gunesYon = useMemo(
    () => (efemeris ? enlemBoylamVektoru(efemeris.sun_sub_lat[an], efemeris.sun_sub_lon[an]) : new Vector3(1, 0, 0)),
    [efemeris, an],
  )
  const dunyaYon = useMemo(
    () => (efemeris ? enlemBoylamVektoru(efemeris.earth_sub_lat[an], efemeris.earth_sub_lon[an]) : new Vector3(1, 0, 0)),
    [efemeris, an],
  )
  const dunyaRef = useRef()

  // İşaretler: 26 alan (+ özel nokta)
  const noktalar = useMemo(() => {
    if (!bolgeler) return []
    const liste = bolgeler.map((k) => ({
      id: k.site,
      site: k.site,
      kayit: k,
      kategori: k.kategori,
      enlem: k.lat,
      boylam: k.lon,
      vek: enlemBoylamVektoru(k.lat, k.lon).multiplyScalar(ISARET_YARICAP),
    }))
    if (p.ozelNokta) {
      const { lat, lon } = p.ozelNokta
      liste.push({ id: '__ozel', site: null, kayit: null, kategori: 'ozel', enlem: lat, boylam: lon, vek: enlemBoylamVektoru(lat, lon).multiplyScalar(ISARET_YARICAP) })
    }
    return liste
  }, [bolgeler, p.ozelNokta])
  const seciliId = p.ozelNokta ? '__ozel' : p.seciliAlan
  const secili = noktalar.find((n) => n.id === seciliId)
  const durus = secili ? { enlem: secili.enlem, boylam: secili.boylam } : null

  // Görev aralığı ölçütleri (ozet.json: haftalık iniş ızgarası, ε = 2°)
  const olcut = (site) => {
    const h = ozet?.sites?.[site]?.[String(p.hm)]?.[String(p.D)]
    const i = Math.round(p.tL / INIS_ADIM_SAAT)
    if (!h || h.f_bar[i] == null) return null
    return `${t('ortak.gunes')} ${b.yuzde(h.f_bar[i])} · ${t('ortak.dunya')} ${b.yuzde(h.c_bar[i])}`
  }

  const ucusNoktasi = ucus ? noktalar.find((n) => n.id === ucus.site) : null
  const ucusHedefi = ucusNoktasi ? { enlem: ucusNoktasi.enlem, boylam: ucusNoktasi.boylam, site: ucus.site, sira: ucus.sira } : null

  // Güney kutbu yaması: yaklaşınca, kutup alanına uçuşta ya da kutup alanından dönüşte
  const [kutupIstek, setKutupIstek] = useState(false)
  const kutupAlani = (enlem) => enlem != null && enlem < -75
  useEffect(() => {
    if (kutupAlani(ucusHedefi?.enlem) || (donus && kutupAlani(durus?.enlem))) setKutupIstek(true)
  }, [ucusHedefi?.sira, donus]) // eslint-disable-line react-hooks/exhaustive-deps
  const kutup = useKutupYamasi(kutupIstek, dokular.yer, dokular.ayar, dokular.normal)
  if (import.meta.env.DEV && typeof window !== 'undefined') window.__kutupYamasi = !!kutup.yama

  const ogeler = useRef({})
  const hazir = dokular.hazir && efemeris && bolgeler && durus

  return (
    <div className="relative h-full w-full overflow-hidden bg-zemin" data-ay-kuresi="">
      {!hazir ? (
        <Iskelet metin={t(dokular.hata ? 'kure.dokuYuklenemedi' : 'kure.yukleniyor')} />
      ) : (
        <HataSiniri onHata={onHata}>
          <Canvas
            dpr={[1, 2]}
            camera={{ fov: 35, near: 0.01, far: 2000, position: kameraDurusu(durus.enlem, durus.boylam, 'genel').toArray() }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <color attach="background" args={['#010208']} />
            <Stars radius={300} depth={80} count={4000} factor={5} saturation={0} fade speed={0} />
            <Isiklar gunesYon={gunesYon} dunyaYon={dunyaYon} dunyaRef={dunyaRef} />
            <Ay dokular={dokular} kutup={kutup} />
            {!kutupIstek && <KutupTetik onIste={() => setKutupIstek(true)} />}
            <Dunya dunyaRef={dunyaRef} />
            <KureKamera durus={durus} ucus={ucusHedefi} donus={donus} onVaris={onInis} />
            <IsaretIzdusumu noktalar={noktalar} ogeler={ogeler} seciliId={seciliId} />
          </Canvas>
        </HataSiniri>
      )}

      {/* İşaretler: konumları IsaretIzdusumu her karede yazar */}
      {hazir && (
        <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" data-isaretler="">
          {noktalar.map((n) => {
            const secil = n.id === seciliId
            const o = n.site ? olcut(n.site) : null
            const adi = n.site ? ad(n.site) : t('ozel.adKisa')
            return (
              <div
                key={n.id}
                ref={(el) => {
                  if (el) ogeler.current[n.id] = el
                  else delete ogeler.current[n.id]
                }}
                data-isaret={n.id}
                className={`group absolute left-0 top-0 hover:z-30 ${secil ? 'z-20' : 'z-0'}`}
                style={{ visibility: 'hidden' }}
              >
                <button
                  type="button"
                  aria-label={t('kure.inisAria', { ad: adi })}
                  onClick={() => n.site && onUcus?.(n.site)}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60 ${
                    secil ? 'text-gunes' : 'text-metin/75 hover:text-metin'
                  }`}
                >
                  <svg viewBox="0 0 12 12" className={`${secil ? 'h-4 w-4' : 'h-2.5 w-2.5'} drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]`} fill="currentColor" aria-hidden="true">
                    {SEKILLER[n.kategori]?.yol ?? SEKILLER.artemis.yol}
                  </svg>
                </button>
                <span
                  data-ad=""
                  className={`pointer-events-none absolute left-2.5 top-0 -translate-y-1/2 whitespace-nowrap text-[11px] tracking-wide transition-opacity duration-300 ${GOLGE} ${
                    secil ? 'text-gunes' : 'text-metin/85'
                  }`}
                  style={{ opacity: 0 }}
                >
                  {adi}
                </span>
                {/* Üzerine gelince: ad, açıklama, görev ölçütleri */}
                <div className="pointer-events-none absolute left-3 top-3 z-10 hidden w-max max-w-[240px] rounded-lg border border-cizgi bg-zemin/90 px-3 py-2 text-xs shadow-lg group-hover:block">
                  <p className="text-sm text-metin">{adi}</p>
                  <p className="text-metin-solgun">{n.kayit ? aciklama(n.kayit) : t('kure.ozelAciklama')}</p>
                  {o && (
                    <p className="mt-1 tabular-nums text-metin">
                      {o}
                      <span className="text-metin-solgun">
                        {' '}
                        · {t('kure.gorev', { gun: p.D })}{p.epsilon !== 2 ? ' (ε = 2°)' : ''}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sol alt: şekil açıklaması; sağ alt: doku kredisi */}
      {hazir && (
        <>
          <div className={`pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-zemin/70 px-2 py-1 text-[11px] text-metin-solgun ${tamEkran ? 'bottom-[7.5rem]' : ''} ${hud}`}>
            {['artemis', 'clps', 'apollo', 'uluslararasi'].map((k) => (
              <span key={k} className="flex items-center gap-1">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-metin/75" fill="currentColor" aria-hidden="true">
                  {SEKILLER[k].yol}
                </svg>
                {k === 'artemis' ? t('kure.artemisIII') : t(`kategori.${k}`)}
              </span>
            ))}
          </div>
          <p className={`pointer-events-none absolute bottom-3 right-3 z-10 text-[10px] text-metin-solgun/80 ${tamEkran ? 'bottom-[7.5rem]' : ''} ${hud}`}>
            {t('kure.kredi')}
          </p>
          <p className={`pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-[11px] tracking-wide text-metin-solgun ${hud}`}>
            {t('kure.ipucu')}
          </p>
        </>
      )}
    </div>
  )
}
