// Temel mod — tek sütun, büyük puntolar, bol boşluk.
// Sıra: başlık → alan şeridi → gökyüzü → rozetler → geri sayım → Ay–Dünya
// kartı; zaman kaydırıcısı sayfanın altına yapışık.
// Parametre, zaman çizelgesi ve harita bu modda YOK.

import AlanListesi from '../bilesenler/AlanListesi.jsx'
import AyDunyaKarti from '../bilesenler/AyDunyaKarti.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import GeriSayim from '../bilesenler/GeriSayim.jsx'
import GokyuzuKutusu from '../bilesenler/GokyuzuKutusu.jsx'
import ModDegistirici from '../bilesenler/ModDegistirici.jsx'
import VeriUyarisi from '../bilesenler/VeriUyarisi.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useBolgeler, useSeciliAlanVerisi } from '../durum/store.js'

export default function Temel() {
  const { alan } = useSeciliAlanVerisi()
  const { bolgeler } = useBolgeler()
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[900px] flex-col gap-10 px-4 pb-12 pt-10 sm:px-6">
        <header>
          <div className="flex flex-wrap-reverse items-start justify-between gap-x-6 gap-y-4">
            <h1 className="text-3xl font-light tracking-wide sm:text-4xl">Ay İniş Alanı Navigatörü</h1>
            <ModDegistirici className="ml-auto" />
          </div>
          <p className="mt-3 text-lg font-light tracking-wide text-metin-solgun">
            {alan?.site ?? ' '}
            {kayit?.aciklama && <span className="text-metin-solgun/70"> · {kayit.aciklama}</span>}
          </p>
          <VeriUyarisi className="mt-3" />
        </header>

        <AlanListesi yerlesim="yatay" />

        <section aria-label="Gökyüzü">
          <GokyuzuKutusu className="h-[380px]" />
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
