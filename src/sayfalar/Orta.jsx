// Orta mod — iki sütun (sol 380px sabit, sağ esnek); 1024px altında tek sütun.
// Sol: alan listesi, kutup haritası, özel koordinat, görev ayarları, sayısal özet.
// Sağ: rozetler, gökyüzü görünümü, zaman çizelgesi. Altta tam genişlik ısı haritası
// ve yan yana karşılaştırma (en fazla 2 sütun).
// Zaman kaydırıcısı altta yapışıktır ve akışın içindedir: sayfanın sonunda kendi
// yüksekliği kadar yer tutar, en alttaki içerik onun arkasında kalmaz.

import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import AlanListesi from '../bilesenler/AlanListesi.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import IsiHaritasi from '../bilesenler/IsiHaritasi.jsx'
import GokyuzuKutusu from '../bilesenler/GokyuzuKutusu.jsx'
import { kubbeMi } from '../bilesenler/GokyuzuGorunumu.jsx'
import Karsilastirma from '../bilesenler/Karsilastirma.jsx'
import KutupHaritasi from '../bilesenler/KutupHaritasi.jsx'
import ModDegistirici from '../bilesenler/ModDegistirici.jsx'
import OzelKoordinat from '../bilesenler/OzelKoordinat.jsx'
import ParametrePaneli from '../bilesenler/ParametrePaneli.jsx'
import SayisalOzet from '../bilesenler/SayisalOzet.jsx'
import Secenekler from '../bilesenler/Secenekler.jsx'
import ZamanCizelgesi from '../bilesenler/ZamanCizelgesi.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useAnlikDurum, useBolgeler, useDurum, useEnUzunAraliklar, useGorunurluk } from '../durum/store.js'

const GORUNUM_SECENEKLERI = [
  { deger: 'panorama', etiket: 'Panorama' },
  { deger: 'kubbe', etiket: 'Kubbe' },
]

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
  const anlik = useAnlikDurum()
  const { alan, f, c } = useGorunurluk()
  const araliklar = useEnUzunAraliklar()
  const { bolgeler } = useBolgeler()
  const { t, tL, D, tAyarla } = useDurum(
    useShallow((s) => ({ t: s.t, tL: s.tL, D: s.D, tAyarla: s.tAyarla })),
  )
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null

  // Görünüm kipi: varsayılan otomatik (kutup → panorama, değilse kubbe).
  // Elle seçim, kutup ↔ kutup dışı geçişinde geçersiz kalır ve otomatiğe döner.
  const [secim, setSecim] = useState(null) // { kutup, gorunum } veya null
  const gorunum = secim && secim.kutup === anlik.kutup ? secim.gorunum : 'otomatik'
  const gosterilen = kubbeMi(gorunum, anlik.kutup) ? 'kubbe' : 'panorama'

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
        <header className="flex flex-wrap-reverse items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-xl font-light tracking-wide sm:text-2xl">Ay İniş Alanı Navigatörü</h1>
            <p className="mt-1 truncate font-light tracking-wide text-metin-solgun">
              {alan?.site ?? ' '}
              {kayit?.aciklama && <span className="text-metin-solgun/70"> · {kayit.aciklama}</span>}
            </p>
          </div>
          <ModDegistirici className="ml-auto" />
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* SOL SÜTUN */}
          <div className="flex min-w-0 flex-col gap-6">
            <Kutu baslik="İniş alanı">
              <AlanListesi yerlesim="dikey" />
            </Kutu>
            <Kutu baslik="Güney kutbu haritası">
              <KutupHaritasi />
            </Kutu>
            <Kutu baslik="Özel koordinat">
              <OzelKoordinat />
            </Kutu>
            <Kutu baslik="Görev ayarları">
              <ParametrePaneli />
            </Kutu>
            <Kutu baslik="Sayısal özet">
              <SayisalOzet />
            </Kutu>
          </div>

          {/* SAĞ SÜTUN — yalnızca yeterince yüksek ekranda (≥ 950px) yapışık kalır.
              Daha kısa ekranda sütun ekrana sığmaz; yapışık olsaydı zaman çizelgesi
              kaydırıcının arkasında kalır ve kaydırarak da görülemezdi. */}
          <div className="flex min-w-0 flex-col gap-6 lg:self-start lg:[@media(min-height:950px)]:sticky lg:[@media(min-height:950px)]:top-6">
            <DurumGostergesi kip="sayisal" />

            <section aria-label="Gökyüzü">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 className={BASLIK}>Gökyüzü</h2>
                <Secenekler
                  secenekler={GORUNUM_SECENEKLERI}
                  deger={gosterilen}
                  onSec={(g) => setSecim({ kutup: anlik.kutup, gorunum: g })}
                  etiket="Gökyüzü görünümü"
                  kucuk
                />
              </div>
              <GokyuzuKutusu gorunum={gorunum} className="h-[340px]" />
            </section>

            <Kutu baslik="Zaman çizelgesi">
              {alan && f && c ? (
                <ZamanCizelgesi
                  f={f}
                  c={c}
                  t0={alan.t0}
                  dtHours={alan.dt_hours}
                  tSecili={t}
                  tL={tL}
                  D={D}
                  araliklar={araliklar}
                  onZamanSec={tAyarla}
                />
              ) : (
                <p className="text-sm text-metin-solgun">Yükleniyor…</p>
              )}
            </Kutu>
          </div>
        </div>

        <section aria-label="Isı haritası" className="rounded-2xl border border-cizgi bg-yuzey p-4">
          <IsiHaritasi karsilastirmaMaks={2} />
        </section>

        <section aria-label="Karşılaştırma" className="rounded-2xl border border-cizgi bg-yuzey p-4">
          <Karsilastirma maks={2} />
        </section>
      </main>

      <ZamanKaydirici enFazla="max-w-[1400px]" />
    </div>
  )
}
