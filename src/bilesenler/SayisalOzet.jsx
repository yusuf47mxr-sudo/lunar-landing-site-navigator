// Sayısal özet — seçili an (yükseklikler, geri sayım) ve görev aralığı
// (oranlar, en uzun karanlık/kesinti) için iki sütunlu küçük tablo.
// Sayılar elle değişince akar, oynatırken doğrudan yazılır (AkanSayi).

import { dereceBicimle, tamSaatBicimle, yuzdeBicimle } from '../core/hesap.js'
import { useAnlikDurum, useOlcutler } from '../durum/store.js'
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

export default function SayisalOzet({ className = '' }) {
  const anlik = useAnlikDurum()
  const { f, olcutler, geriSayim } = useOlcutler()
  const hazir = !!anlik.alan && !!f
  const tasiyor = hazir && !olcutler // görev yıl sonunu aşıyor
  const sayimlar = geriSayim
    ? geriSayimSatirlari(geriSayim)
    : [{ tur: 'gunBatimi', onEk: 'Gün batımına', saat: undefined }, { tur: 'dunyaBatisi', onEk: 'Dünya batışına', saat: undefined }]

  const donem = (deger, bicim) => (olcutler ? <AkanSayi deger={deger} bicim={bicim} /> : YOK)

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
        <Satir etiket="Aydınlanma oranı">{donem(olcutler?.fBar, yuzdeBicimle)}</Satir>
        <Satir etiket="İletişim oranı">{donem(olcutler?.cBar, yuzdeBicimle)}</Satir>
        <Satir etiket="En uzun karanlık">{donem(olcutler?.tauMax, tamSaatBicimle)}</Satir>
        <Satir etiket="En uzun iletişim kesintisi">{donem(olcutler?.sigmaMax, tamSaatBicimle)}</Satir>
      </dl>
      {tasiyor ? (
        <p className="mt-2 text-xs text-metin-solgun">Görev veri aralığının dışına taşıyor.</p>
      ) : (
        <p className="mt-2 text-xs text-metin-solgun/70">Son dört satır görev aralığı içindir.</p>
      )}
    </div>
  )
}
