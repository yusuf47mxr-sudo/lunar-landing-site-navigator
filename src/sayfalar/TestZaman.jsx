// GEÇİCİ TEST SAYFASI — ZamanCizelgesi'ni denemek için (?test=zaman).
// Orta sayfa yazılınca silinecek.

import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import GokyuzuGorunumu from '../bilesenler/GokyuzuGorunumu.jsx'
import ZamanCizelgesi from '../bilesenler/ZamanCizelgesi.jsx'
import ZamanKaydirici from '../bilesenler/ZamanKaydirici.jsx'
import { saatBicimle } from '../core/hesap.js'
import {
  GOREV_SURELERI,
  useAnlikDurum,
  useDurum,
  useEnUzunAraliklar,
  useGorunurluk,
  useOlcutler,
} from '../durum/store.js'

const TEST_ALANLARI = ['Malapert Massif', 'Haworth', 'Apollo 11', "Chang'e 4"]

export default function TestZaman() {
  const anlik = useAnlikDurum()
  const { alan, f, c } = useGorunurluk()
  const araliklar = useEnUzunAraliklar()
  const { olcutler } = useOlcutler()
  const { seciliAlan, t, tL, D, alanSec, tAyarla, tLAyarla, DAyarla } = useDurum(
    useShallow((s) => ({
      seciliAlan: s.seciliAlan,
      t: s.t,
      tL: s.tL,
      D: s.D,
      alanSec: s.alanSec,
      tAyarla: s.tAyarla,
      tLAyarla: s.tLAyarla,
      DAyarla: s.DAyarla,
    })),
  )

  // tL görev yıl sonunu aşmasın
  const tLmaks = alan ? alan.n - Math.round((D * 24) / alan.dt_hours) : 0
  useEffect(() => {
    if (alan && tL > tLmaks) tLAyarla(tLmaks)
  }, [alan, tL, tLmaks, tLAyarla])

  const izler = useMemo(() => {
    if (!alan) return {}
    const bas = Math.max(0, anlik.t - 48)
    const kes = (az, alt) => Array.from({ length: anlik.t - bas + 1 }, (_, k) => [az[bas + k], alt[bas + k]])
    return { sun: kes(alan.sun_az, alan.sun_alt), earth: kes(alan.earth_az, alan.earth_alt) }
  }, [alan, anlik.t])

  const dugme = (etkin) =>
    `px-3 py-1.5 rounded-md text-sm border transition-colors ${
      etkin ? 'border-gunes bg-yuzey-acik text-metin' : 'border-cizgi text-metin-solgun hover:bg-yuzey'
    }`

  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 pb-10 pt-6 sm:px-6">
        <h1 className="text-xl font-light tracking-wide">
          Zaman çizelgesi <span className="text-sm text-metin-solgun">— geçici test</span>
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {TEST_ALANLARI.map((ad) => (
            <button key={ad} className={dugme(seciliAlan === ad)} onClick={() => alanSec(ad)}>
              {ad}
            </button>
          ))}
          <span className="mx-3 h-6 w-px bg-cizgi" />
          <span className="text-sm text-metin-solgun">D</span>
          {GOREV_SURELERI.map((d) => (
            <button key={d} className={dugme(D === d)} onClick={() => DAyarla(d)}>
              {d} g
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 text-sm text-metin-solgun">
          <span className="w-24 shrink-0">İniş (tL) = {tL}</span>
          <input
            type="range"
            className="kaydirici flex-1"
            style={{ '--dolu': `${tLmaks ? (tL / tLmaks) * 100 : 0}%` }}
            min={0}
            max={Math.max(0, tLmaks)}
            value={Math.min(tL, Math.max(0, tLmaks))}
            onChange={(e) => tLAyarla(Number(e.target.value))}
          />
        </label>

        <section className="rounded-2xl border border-cizgi bg-yuzey px-4 py-4">
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
            <p className="text-metin-solgun">Yükleniyor…</p>
          )}
        </section>

        <p className="text-sm text-metin-solgun tabular-nums" id="olcut-ozet">
          olcutler: tauMax = <span className="text-metin">{olcutler?.tauMax ?? '—'}</span> sa, sigmaMax ={' '}
          <span className="text-metin">{olcutler?.sigmaMax ?? '—'}</span> sa · araliklar: karanlık{' '}
          <span className="text-metin">
            {araliklar?.karanlik.uzunluk ?? '—'} sa @ {araliklar?.karanlik.bas ?? '—'}
          </span>
          , kesinti{' '}
          <span className="text-metin">
            {araliklar?.kesinti.uzunluk ?? '—'} sa @ {araliklar?.kesinti.bas ?? '—'}
          </span>{' '}
          ({saatBicimle(araliklar?.karanlik.uzunluk) ?? '—'})
        </p>

        <div className="grid h-[340px] overflow-hidden rounded-2xl border border-cizgi">
          {alan && anlik.horizon && (
            <GokyuzuGorunumu
              horizon={anlik.horizon}
              sunAlt={anlik.sunAlt}
              sunAz={anlik.sunAz}
              earthAlt={anlik.earthAlt}
              earthAz={anlik.earthAz}
              epsilon={anlik.epsilon}
              kutup={anlik.kutup}
              sunTrail={izler.sun}
              earthTrail={izler.earth}
              yaklasik={anlik.yaklasik}
              merkezAz={anlik.merkezAz}
            />
          )}
        </div>
      </main>
      <ZamanKaydirici />
    </div>
  )
}
