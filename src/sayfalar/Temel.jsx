// Temel mod — tek sütun, büyük puntolar, bol boşluk.
// Sıra: başlık → alan şeridi → gökyüzü → rozetler → geri sayım → Ay–Dünya
// kartı; zaman kaydırıcısı sayfanın altına yapışık.
// Parametre, zaman çizelgesi ve harita bu modda YOK.

import AlanListesi from '../bilesenler/AlanListesi.jsx'
import AyDunyaKarti from '../bilesenler/AyDunyaKarti.jsx'
import DilSecici from '../bilesenler/DilSecici.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import GeriSayim from '../bilesenler/GeriSayim.jsx'
import GokyuzuKutusu from '../bilesenler/GokyuzuKutusu.jsx'
import ModDegistirici from '../bilesenler/ModDegistirici.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useDil } from '../dil/index.js'
import { useBolgeler, useSeciliAlanVerisi } from '../durum/store.js'

export default function Temel() {
  const { alan } = useSeciliAlanVerisi()
  const { bolgeler } = useBolgeler()
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null
  const { t, ad, aciklama } = useDil()

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[900px] flex-col gap-10 px-4 pb-12 pt-10 sm:px-6">
        <header>
          <div className="flex flex-wrap-reverse items-start justify-between gap-x-6 gap-y-4">
            <h1 className="text-3xl font-light tracking-wide sm:text-4xl">{t('uygulama.baslik')}</h1>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2" role="group" aria-label={t('sayfa.ayarlar')}>
              <ModDegistirici />
              <DilSecici />
            </div>
          </div>
          <p className="mt-3 text-lg font-light tracking-wide text-metin-solgun">
            {alan ? ad(alan.site) : ' '}
            {aciklama(kayit) && <span className="text-metin-solgun/70"> · {aciklama(kayit)}</span>}
          </p>
        </header>

        <AlanListesi yerlesim="yatay" />

        <section aria-label={t('sayfa.gokyuzu')}>
          {/* Temel'de varsayılan 3B sahne (sunumun ana görseli); düğmeyle panorama/kubbe */}
          <GokyuzuKutusu gecisli varsayilan="3b" className="h-[460px]" />
        </section>

        <div className="flex flex-col gap-5">
          <DurumGostergesi kip="sozel" />
          <GeriSayim />
        </div>

        <AyDunyaKarti />
      </main>

      <ZamanKaydirici />
    </div>
  )
}
