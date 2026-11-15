// 3B sahne yüklenirken gösterilen iskelet: koyu zemin, hafif nabız atan
// ufuk çizgisi ve kısa not. three.js içermez; GokyuzuKutusu bunu Suspense
// yedeği olarak kullanır (3B parçası inmeden önce).

import { useDil } from '../../dil/index.js'

export default function Iskelet({ metin: verilen }) {
  const { t } = useDil()
  const metin = verilen ?? t('kure.sahneYukleniyor')
  return (
    <div className="relative h-full w-full overflow-hidden bg-zemin" aria-busy="true" aria-label={metin}>
      <div className="absolute inset-x-0 top-[58%] h-px animate-pulse bg-gradient-to-r from-transparent via-metin-solgun/50 to-transparent" />
      <div className="absolute inset-x-0 top-[58%] h-[42%] bg-gradient-to-b from-yuzey-acik/40 to-transparent" />
      <div className="absolute right-[22%] top-[44%] h-5 w-5 animate-pulse rounded-full bg-gunes/40 blur-[3px]" />
      <p className="absolute inset-x-0 bottom-4 text-center text-xs tracking-wide text-metin-solgun">{metin}</p>
    </div>
  )
}
