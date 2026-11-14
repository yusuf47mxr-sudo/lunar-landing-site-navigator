// Temel mod — tek sütun, büyük puntolar, bol boşluk.
// Sıra: başlık → alan şeridi → gökyüzü → rozetler → geri sayım → Ay–Dünya
// kartı; zaman kaydırıcısı sayfanın altına yapışık.
// Parametre, zaman çizelgesi ve harita bu modda YOK.

import { useMemo } from 'react'
import AlanListesi from '../bilesenler/AlanListesi.jsx'
import AyDunyaKarti from '../bilesenler/AyDunyaKarti.jsx'
import DurumGostergesi from '../bilesenler/DurumGostergesi.jsx'
import GeriSayim from '../bilesenler/GeriSayim.jsx'
import GokyuzuGorunumu from '../bilesenler/GokyuzuGorunumu.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { useAnlikDurum, useBolgeler } from '../durum/store.js'

const IZ_SAAT = 48
const YAKLASIK_UYARI = 'Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler farklı olabilir.'

/** Son `saat` saatin [az, alt] çiftleri, eskiden yeniye (t dahil). */
function izKes(azDizi, altDizi, t, saat, dt) {
  const bas = Math.max(0, t - Math.round(saat / dt))
  const iz = []
  for (let k = bas; k <= t; k++) iz.push([azDizi[k], altDizi[k]])
  return iz
}

export default function Temel() {
  const anlik = useAnlikDurum()
  const { alan } = anlik
  const { bolgeler } = useBolgeler()
  const kayit = alan && bolgeler ? bolgeler.find((b) => b.site === alan.site) : null

  const sunTrail = useMemo(
    () => (alan ? izKes(alan.sun_az, alan.sun_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )
  const earthTrail = useMemo(
    () => (alan ? izKes(alan.earth_az, alan.earth_alt, anlik.t, IZ_SAAT, alan.dt_hours) : null),
    [alan, anlik.t],
  )

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[900px] flex-col gap-10 px-4 pb-12 pt-10 sm:px-6">
        <header>
          <h1 className="text-3xl font-light tracking-wide sm:text-4xl">Ay İniş Alanı Navigatörü</h1>
          <p className="mt-3 text-lg font-light tracking-wide text-metin-solgun">
            {alan?.site ?? ' '}
            {kayit?.aciklama && <span className="text-metin-solgun/70"> · {kayit.aciklama}</span>}
          </p>
        </header>

        <AlanListesi yerlesim="yatay" />

        <section aria-label="Gökyüzü">
          <div className="grid h-[380px] overflow-hidden rounded-2xl border border-cizgi">
            {anlik.hata ? (
              <p className="p-6 text-uyari">Veri yüklenemedi: {String(anlik.hata.message ?? anlik.hata)}</p>
            ) : alan && anlik.horizon ? (
              <GokyuzuGorunumu
                horizon={anlik.horizon}
                sunAlt={anlik.sunAlt}
                sunAz={anlik.sunAz}
                earthAlt={anlik.earthAlt}
                earthAz={anlik.earthAz}
                epsilon={anlik.epsilon}
                kutup={anlik.kutup}
                sunTrail={sunTrail}
                earthTrail={earthTrail}
                yaklasik={anlik.yaklasik}
                gorunum="otomatik"
              />
            ) : (
              <p className="self-center justify-self-center text-metin-solgun">Yükleniyor…</p>
            )}
          </div>
          {anlik.yaklasik && <p className="mt-3 text-sm text-uyari">{YAKLASIK_UYARI}</p>}
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
