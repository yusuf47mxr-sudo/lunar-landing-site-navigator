// İleri mod — üç sütun: sol 320px parametreler, orta esnek grafikler, sağ 300px
// sayısal özet ve dışa aktarma. 1280px altında sağ sütun ortanın altına iner;
// 1024px altında hepsi tek sütun. Bilgi yoğunluğu yüksek: 13px yazı, dar
// satır aralığı, az boşluk. Zaman kaydırıcısı altta yapışık ve akışın içinde.

import DisaAktar from '../bilesenler/DisaAktar.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import GokyuzuKutusu from '../bilesenler/GokyuzuKutusu.jsx'
import IsiHaritasi from '../bilesenler/IsiHaritasi.jsx'
import Karsilastirma from '../bilesenler/Karsilastirma.jsx'
import ModDegistirici from '../bilesenler/ModDegistirici.jsx'
import ParametrePaneli from '../bilesenler/ParametrePaneli.jsx'
import SayisalOzet from '../bilesenler/SayisalOzet.jsx'
import ZamanCizelgesiKutusu from '../bilesenler/ZamanCizelgesiKutusu.jsx'
import VeriUyarisi from '../bilesenler/VeriUyarisi.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useBolgeler, useSeciliAlanVerisi } from '../durum/store.js'

const BASLIK = 'text-[11px] uppercase tracking-[0.18em] text-metin-solgun'
const PANEL = 'rounded-xl border border-cizgi bg-yuzey'

function Panel({ baslik = null, etiket, children, className = '' }) {
  return (
    <section aria-label={etiket ?? baslik} className={`${PANEL} p-3 ${className}`}>
      {baslik && <h2 className={`mb-2 ${BASLIK}`}>{baslik}</h2>}
      {children}
    </section>
  )
}

export default function Ileri() {
  const { alan } = useSeciliAlanVerisi()
  const { bolgeler } = useBolgeler()
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null

  return (
    <div className="min-h-screen bg-zemin text-[13px] leading-snug text-metin">
      <main className="mx-auto flex max-w-[1760px] flex-col gap-3 px-3 pb-6 pt-3 sm:px-4">
        <header className="flex flex-wrap-reverse items-center justify-between gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <h1 className="text-lg font-light tracking-wide">Ay İniş Alanı Navigatörü</h1>
            <p className="truncate font-light tracking-wide text-metin-solgun">
              {alan?.site ?? ' '}
              {kayit?.aciklama && <span className="text-metin-solgun/70"> · {kayit.aciklama}</span>}
              {alan && (
                <span className="tabular-nums text-metin-solgun/70">
                  {' '}
                  · {alan.lat.toFixed(2)}°, {alan.lon.toFixed(2)}°
                </span>
              )}
            </p>
            <VeriUyarisi className="mt-1 basis-full sm:basis-auto sm:mt-0" />
          </div>
          <ModDegistirici className="ml-auto" />
        </header>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
          {/* SOL — parametreler. Yan sütunlar yapışıktır; yükseklikleri alttaki zaman
              kaydırıcısına ve üst başlığa yer bırakır, taşan kısım kendi içinde kayar. */}
          <aside
            aria-label="Parametreler"
            className={`${PANEL} min-w-0 ince-kaydirma lg:sticky lg:top-3 lg:row-span-2 lg:self-start lg:overflow-y-auto lg:max-h-[calc(100vh-10rem)] xl:row-span-1`}
          >
            <ParametrePaneli kapsam="tam" />
          </aside>

          {/* ORTA — grafikler */}
          <div className="flex min-w-0 flex-col gap-3">
            <DurumGostergesi kip="sayisal" />
            <section aria-label="Gökyüzü">
              <GokyuzuKutusu gecisli className="h-[300px]" />
            </section>
            <Panel baslik="Zaman çizelgesi">
              <ZamanCizelgesiKutusu />
            </Panel>
            <Panel etiket="Isı haritası">
              <IsiHaritasi karsilastirmaMaks={3} />
            </Panel>
            <Panel etiket="Karşılaştırma">
              <Karsilastirma maks={3} />
            </Panel>
          </div>

          {/* SAĞ — sayısal özet ve dışa aktarma */}
          <aside
            aria-label="Özet"
            className={`flex min-w-0 flex-col gap-3 lg:col-start-2 xl:sticky xl:top-3 xl:col-start-3 xl:self-start xl:overflow-y-auto xl:max-h-[calc(100vh-10rem)] ince-kaydirma`}
          >
            <Panel baslik="Özet">
              <SayisalOzet kip="tam" />
            </Panel>
            <Panel baslik="Dışa aktar">
              <DisaAktar />
            </Panel>
          </aside>
        </div>
      </main>

      <ZamanKaydirici enFazla="max-w-[1760px]" />
    </div>
  )
}
