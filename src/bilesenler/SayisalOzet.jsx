// Sayısal özet — seçili an ve görev aralığı için küçük tablo.
// kip='kisa': yükseklikler, sıradaki iki geçiş, dört görev ölçütü (Orta)
// kip='tam' : dört geri sayım satırı (batış ve doğuş, Güneş ve Dünya), anlık
//             güç, enerji ve puan dahil bütün görev ölçütleri (İleri)
// Sayılar elle değişince akar, oynatırken doğrudan yazılır (AkanSayi).

import { dereceBicimle, tamSaatBicimle, yuzdeBicimle } from '../core/hesap.js'
import { useAnlikDurum, useDurum, useGecisler, useOlcutler } from '../durum/store.js'
import AkanSayi from './AkanSayi.jsx'
import { AkanSure, geriSayimSatirlari } from './GeriSayim.jsx'

function Satir({ etiket, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-cizgi/60 py-1.5 last:border-b-0">
      <dt className="text-metin-solgun">{etiket}</dt>
      <dd className="whitespace-nowrap text-right tabular-nums text-metin">{children}</dd>
    </div>
  )
}

const YOK = <span className="text-metin-solgun">—</span>
const ALT_BASLIK = 'mb-1 text-[11px] uppercase tracking-[0.18em] text-metin-solgun'

const wattBicimle = (v) => `${v.toFixed(1)} W`
const kWhBicimle = (v) => `${v.toFixed(2)} kWh`
const puanBicimle = (v) => v.toFixed(2).replace('-', '−')

// Dört geri sayım satırı; tur, 24 saatin altındaki rengi belirler (AkanSure)
const GECIS_SATIRLARI = [
  { tur: 'gunBatimi', etiket: 'Gün batımı', cisim: 'gunes', alan: 'sonrakiBatis' },
  { tur: 'gunDogumu', etiket: 'Gün doğumu', cisim: 'gunes', alan: 'sonrakiDogus' },
  { tur: 'dunyaBatisi', etiket: 'Dünya batışı', cisim: 'dunya', alan: 'sonrakiBatis' },
  { tur: 'dunyaDogusu', etiket: 'Dünya doğuşu', cisim: 'dunya', alan: 'sonrakiDogus' },
]

/** @param {'kisa'|'tam'} [props.kip] */
export default function SayisalOzet({ kip = 'kisa', className = '' }) {
  const anlik = useAnlikDurum()
  const { f, P, olcutler, geriSayim } = useOlcutler()
  const hazir = !!anlik.alan && !!f
  const tasiyor = hazir && !olcutler // görev yıl sonunu aşıyor

  const donem = (deger, bicim) => (olcutler ? <AkanSayi deger={deger} bicim={bicim} /> : YOK)
  const oranlar = (
    <>
      <Satir etiket="Aydınlanma oranı">{donem(olcutler?.fBar, yuzdeBicimle)}</Satir>
      <Satir etiket="İletişim oranı">{donem(olcutler?.cBar, yuzdeBicimle)}</Satir>
      <Satir etiket="En uzun karanlık">{donem(olcutler?.tauMax, tamSaatBicimle)}</Satir>
      <Satir etiket="En uzun iletişim kesintisi">{donem(olcutler?.sigmaMax, tamSaatBicimle)}</Satir>
    </>
  )
  const tasmaNotu = tasiyor && <p className="mt-2 text-xs text-metin-solgun">Görev veri aralığının dışına taşıyor.</p>

  if (kip === 'tam') return <TamOzet className={className} anlik={anlik} hazir={hazir} P={P} olcutler={olcutler} donem={donem} oranlar={oranlar} tasmaNotu={tasmaNotu} />

  const sayimlar = geriSayim
    ? geriSayimSatirlari(geriSayim)
    : [{ tur: 'gunBatimi', onEk: 'Gün batımına', saat: undefined }, { tur: 'dunyaBatisi', onEk: 'Dünya batışına', saat: undefined }]

  return (
    <div className={className}>
      <dl className="text-sm">
        <Satir etiket="Güneş yüksekliği">
          {hazir ? <AkanSayi deger={anlik.sunAlt} bicim={dereceBicimle} /> : YOK}
        </Satir>
        <Satir etiket="Dünya yüksekliği">
          {hazir ? <AkanSayi deger={anlik.earthAlt} bicim={dereceBicimle} /> : YOK}
        </Satir>
        {sayimlar.map((s) => (
          <Satir key={s.tur} etiket={s.onEk}>
            {s.saat === undefined ? (
              YOK
            ) : s.saat === null ? (
              <span className="text-metin-solgun">{s.yoksa}</span>
            ) : (
              <AkanSure saat={s.saat} tur={s.tur} />
            )}
          </Satir>
        ))}
        {oranlar}
      </dl>
      {tasmaNotu || <p className="mt-2 text-xs text-metin-solgun/70">Son dört satır görev aralığı içindir.</p>}
    </div>
  )
}

/** İleri mod: geri sayım (dört satır) + anlık güç + görev aralığı ölçütleri. */
function TamOzet({ className, anlik, hazir, P, olcutler, donem, oranlar, tasmaNotu }) {
  const gecis = useGecisler()
  const D = useDurum((s) => s.D)
  const gucT = hazir && P ? P[anlik.t] : null

  return (
    <div className={className}>
      <h3 className={ALT_BASLIK}>Geri sayım</h3>
      <dl aria-live="off">
        {GECIS_SATIRLARI.map((s) => {
          const saat = gecis ? gecis[s.cisim][s.alan] : undefined
          return (
            <Satir key={s.tur} etiket={s.etiket}>
              {saat === undefined ? (
                YOK
              ) : saat === null ? (
                <span className="text-metin-solgun">veri aralığında yok</span>
              ) : (
                <>
                  <AkanSure saat={saat} tur={s.tur} /> <span className="text-metin-solgun">sonra</span>
                </>
              )}
            </Satir>
          )
        })}
        <Satir etiket="Anlık güç">{gucT === null ? YOK : <AkanSayi deger={gucT} bicim={wattBicimle} />}</Satir>
      </dl>

      <h3 className={`mt-4 ${ALT_BASLIK}`}>Görev aralığı · {D} gün</h3>
      <dl>
        {oranlar}
        <Satir etiket="Toplam enerji E">{donem(olcutler ? olcutler.E / 1000 : null, kWhBicimle)}</Satir>
        <Satir etiket="Ortalama güç">{donem(olcutler ? olcutler.E / (D * 24) : null, wattBicimle)}</Satir>
        <Satir etiket="Puan">{donem(olcutler?.puan, puanBicimle)}</Satir>
      </dl>
      {tasmaNotu}
    </div>
  )
}
