// Parçalı düğme — birkaç seçenekten biri (mod, görev süresi, direk
// yüksekliği, görünüm kipi). Seçili parça --gunes çerçevesiyle vurgulanır.

/**
 * @param {Array<{deger: any, etiket: string}>} props.secenekler
 * @param {any} props.deger       seçili değer
 * @param {(deger: any) => void} props.onSec
 * @param {string} props.etiket   erişilebilirlik adı
 * @param {boolean} [props.esnek] parçalar eşit genişlikte, kutu satırı doldurur
 * @param {boolean} [props.kucuk]
 */
export default function Secenekler({ secenekler, deger, onSec, etiket, esnek = false, kucuk = false, className = '' }) {
  return (
    <div
      role="group"
      aria-label={etiket}
      className={`${esnek ? 'flex' : 'inline-flex'} rounded-lg border border-cizgi bg-yuzey p-0.5 ${className}`}
    >
      {secenekler.map((s) => {
        const secili = s.deger === deger
        return (
          <button
            key={String(s.deger)}
            type="button"
            aria-pressed={secili}
            onClick={() => onSec(s.deger)}
            className={`rounded-md tracking-wide tabular-nums transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-iletisim/60
              ${esnek ? 'flex-1' : ''} ${kucuk ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
              ${secili ? 'bg-yuzey-acik text-metin ring-1 ring-inset ring-gunes/70' : 'text-metin-solgun hover:text-metin'}`}
          >
            {s.etiket}
          </button>
        )
      })}
    </div>
  )
}
