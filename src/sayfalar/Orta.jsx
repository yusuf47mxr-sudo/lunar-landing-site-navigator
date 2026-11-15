// Orta mod — iki sütun (sol 380px sabit, sağ esnek); 1024px altında tek sütun.
// Sol: alan listesi, kutup haritası, özel koordinat, görev ayarları, sayısal özet.
// Sağ: rozetler, gökyüzü görünümü, zaman çizelgesi. Altta tam genişlik ısı haritası
// ve yan yana karşılaştırma (en fazla 2 sütun).
// Zaman kaydırıcısı altta yapışıktır ve akışın içindedir: sayfanın sonunda kendi
// yüksekliği kadar yer tutar, en alttaki içerik onun arkasında kalmaz.

import AlanListesi from '../bilesenler/AlanListesi.jsx'
import DilSecici from '../bilesenler/DilSecici.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import IsiHaritasi from '../bilesenler/IsiHaritasi.jsx'
import GokyuzuKutusu from '../bilesenler/GokyuzuKutusu.jsx'
import Karsilastirma from '../bilesenler/Karsilastirma.jsx'
import KutupHaritasi from '../bilesenler/KutupHaritasi.jsx'
import ModDegistirici from '../bilesenler/ModDegistirici.jsx'
import OzelKoordinat from '../bilesenler/OzelKoordinat.jsx'
import ParametrePaneli from '../bilesenler/ParametrePaneli.jsx'
import SayisalOzet from '../bilesenler/SayisalOzet.jsx'
import ZamanCizelgesiKutusu from '../bilesenler/ZamanCizelgesiKutusu.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useDil } from '../dil/index.js'
import { useBolgeler, useSeciliAlanVerisi } from '../durum/store.js'

const BASLIK = 'text-[11px] uppercase tracking-[0.18em] text-metin-solgun'

function Kutu({ baslik, children, className = '' }) {
  return (
    <section aria-label={baslik} className={`rounded-2xl border border-cizgi bg-yuzey p-4 ${className}`}>
      <h2 className={`mb-3 ${BASLIK}`}>{baslik}</h2>
      {children}
    </section>
  )
}

export default function Orta() {
  const { alan } = useSeciliAlanVerisi()
  const { bolgeler } = useBolgeler()
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null
  const { t, ad, aciklama } = useDil()

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
        <header className="flex flex-wrap-reverse items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-xl font-light tracking-wide sm:text-2xl">{t('uygulama.baslik')}</h1>
            <p className="mt-1 truncate font-light tracking-wide text-metin-solgun">
              {alan ? ad(alan.site) : ' '}
              {aciklama(kayit) && <span className="text-metin-solgun/70"> · {aciklama(kayit)}</span>}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2" role="group" aria-label={t('sayfa.ayarlar')}>
            <ModDegistirici />
            <DilSecici />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* SOL SÜTUN */}
          <div className="flex min-w-0 flex-col gap-6">
            <Kutu baslik={t('sayfa.inisAlani')}>
              <AlanListesi yerlesim="dikey" />
            </Kutu>
            <Kutu baslik={t('sayfa.kutupHaritasi')}>
              <KutupHaritasi />
            </Kutu>
            <Kutu baslik={t('sayfa.ozelKoordinat')}>
              <OzelKoordinat />
            </Kutu>
            <Kutu baslik={t('sayfa.gorevAyarlari')}>
              <ParametrePaneli />
            </Kutu>
            <Kutu baslik={t('sayfa.sayisalOzet')}>
              <SayisalOzet />
            </Kutu>
          </div>

          {/* SAĞ SÜTUN — yalnızca yeterince yüksek ekranda (≥ 950px) yapışık kalır.
              Daha kısa ekranda sütun ekrana sığmaz; yapışık olsaydı zaman çizelgesi
              kaydırıcının arkasında kalır ve kaydırarak da görülemezdi. */}
          <div className="flex min-w-0 flex-col gap-6 lg:self-start lg:[@media(min-height:950px)]:sticky lg:[@media(min-height:950px)]:top-6">
            <DurumGostergesi kip="sayisal" />

            <section aria-label={t('sayfa.gokyuzu')}>
              <GokyuzuKutusu gecisli className="h-[340px]" />
            </section>

            <Kutu baslik={t('sayfa.zamanCizelgesi')}>
              <ZamanCizelgesiKutusu />
            </Kutu>
          </div>
        </div>

        <section aria-label={t('sayfa.isiHaritasi')} className="rounded-2xl border border-cizgi bg-yuzey p-4">
          <IsiHaritasi karsilastirmaMaks={2} />
        </section>

        <section aria-label={t('sayfa.karsilastirma')} className="rounded-2xl border border-cizgi bg-yuzey p-4">
          <Karsilastirma maks={2} />
        </section>
      </main>

      <ZamanKaydirici enFazla="max-w-[1400px]" />
    </div>
  )
}
