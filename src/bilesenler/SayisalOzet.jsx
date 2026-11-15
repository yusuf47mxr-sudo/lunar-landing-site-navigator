// Sayısal özet — seçili an ve görev aralığı için küçük tablo.
// kip='kisa': yükseklikler, sıradaki iki geçiş, dört görev ölçütü (Orta)
// kip='tam' : dört geri sayım satırı (batış ve doğuş, Güneş ve Dünya), anlık
//             güç, enerji ve puan dahil bütün görev ölçütleri (İleri)
// Sayılar elle değişince akar, oynatırken doğrudan yazılır (AkanSayi).

import { dereceBicimle } from '../core/hesap.js'
import { useDil } from '../dil/index.js'
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

// Dört geri sayım satırı; tur, 24 saatin altındaki rengi belirler (AkanSure).
// Etiket: t(`sayisalOzet.gecis.${tur}`)
const GECIS_SATIRLARI = [
  { tur: 'gunBatimi', cisim: 'gunes', alan: 'sonrakiBatis' },
  { tur: 'gunDogumu', cisim: 'gunes', alan: 'sonrakiDogus' },
  { tur: 'dunyaBatisi', cisim: 'dunya', alan: 'sonrakiBatis' },
  { tur: 'dunyaDogusu', cisim: 'dunya', alan: 'sonrakiDogus' },
]

/** @param {'kisa'|'tam'} [props.kip] */
export default function SayisalOzet({ kip = 'kisa', className = '' }) {
  const { t, b } = useDil()
  const anlik = useAnlikDurum()
  const { f, P, olcutler, geriSayim } = useOlcutler()
  const hazir = !!anlik.alan && !!f
  const tasiyor = hazir && !olcutler // görev yıl sonunu aşıyor

  const donem = (deger, bicim) => (olcutler ? <AkanSayi deger={deger} bicim={bicim} /> : YOK)
  const oranlar = (
    <>
      <Satir etiket={t('sayisalOzet.aydinlanmaOrani')}>{donem(olcutler?.fBar, b.yuzde)}</Satir>
      <Satir etiket={t('sayisalOzet.iletisimOrani')}>{donem(olcutler?.cBar, b.yuzde)}</Satir>
      <Satir etiket={t('sayisalOzet.enUzunKaranlik')}>{donem(olcutler?.tauMax, b.tamSaat)}</Satir>
      <Satir etiket={t('sayisalOzet.enUzunKesinti')}>{donem(olcutler?.sigmaMax, b.tamSaat)}</Satir>
    </>
  )
  const tasmaNotu = tasiyor && <p className="mt-2 text-xs text-metin-solgun">{t('sayisalOzet.tasiyor')}</p>

  if (kip === 'tam') return <TamOzet className={className} anlik={anlik} hazir={hazir} P={P} olcutler={olcutler} donem={donem} oranlar={oranlar} tasmaNotu={tasmaNotu} />

  const sayimlar = geriSayim
    ? geriSayimSatirlari(geriSayim, t)
    : [
        { tur: 'gunBatimi', onEk: t('geriSayim.gunBatimi'), saat: undefined },
        { tur: 'dunyaBatisi', onEk: t('geriSayim.dunyaBatisi'), saat: undefined },
      ]

  return (
    <div className={className}>
      <dl className="text-sm">
        <Satir etiket={t('sayisalOzet.gunesYuksekligi')}>
          {hazir ? <AkanSayi deger={anlik.sunAlt} bicim={dereceBicimle} /> : YOK}
        </Satir>
        <Satir etiket={t('sayisalOzet.dunyaYuksekligi')}>
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
      {tasmaNotu || <p className="mt-2 text-xs text-metin-solgun/70">{t('sayisalOzet.sonDortSatir')}</p>}
    </div>
  )
}

/** İleri mod: geri sayım (dört satır) + anlık güç + görev aralığı ölçütleri. */
function TamOzet({ className, anlik, hazir, P, olcutler, donem, oranlar, tasmaNotu }) {
  const { t } = useDil()
  const gecis = useGecisler()
  const D = useDurum((s) => s.D)
  const gucT = hazir && P ? P[anlik.t] : null

  return (
    <div className={className}>
      <h3 className={ALT_BASLIK}>{t('sayisalOzet.geriSayim')}</h3>
      <dl aria-live="off">
        {GECIS_SATIRLARI.map((s) => {
          const saat = gecis ? gecis[s.cisim][s.alan] : undefined
          return (
            <Satir key={s.tur} etiket={t(`sayisalOzet.gecis.${s.tur}`)}>
              {saat === undefined ? (
                YOK
              ) : saat === null ? (
                <span className="text-metin-solgun">{t('sayisalOzet.veriYok')}</span>
              ) : (
                <>
                  <AkanSure saat={saat} tur={s.tur} /> <span className="text-metin-solgun">{t('sayisalOzet.sonra')}</span>
                </>
              )}
            </Satir>
          )
        })}
        <Satir etiket={t('sayisalOzet.anlikGuc')}>{gucT === null ? YOK : <AkanSayi deger={gucT} bicim={wattBicimle} />}</Satir>
      </dl>

      <h3 className={`mt-4 ${ALT_BASLIK}`}>{t('sayisalOzet.gorevAraligi', { D })}</h3>
      <dl>
        {oranlar}
        <Satir etiket={t('sayisalOzet.toplamEnerji')}>{donem(olcutler ? olcutler.E / 1000 : null, kWhBicimle)}</Satir>
        <Satir etiket={t('sayisalOzet.ortalamaGuc')}>{donem(olcutler ? olcutler.E / (D * 24) : null, wattBicimle)}</Satir>
        <Satir etiket={t('sayisalOzet.puan')}>{donem(olcutler?.puan, puanBicimle)}</Satir>
      </dl>
      {tasmaNotu}
    </div>
  )
}
