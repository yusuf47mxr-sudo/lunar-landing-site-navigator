// İleri mod — Adım 10'da yazılacak. Şimdilik yer tutucu.

import ModDegistirici from '../bilesenler/ModDegistirici.jsx'

export default function Ileri() {
  return (
    <div className="min-h-screen bg-zemin text-metin">
      <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 pb-10 pt-6 sm:px-6">
        <header className="flex flex-wrap-reverse items-center justify-between gap-x-6 gap-y-3">
          <h1 className="text-xl font-light tracking-wide sm:text-2xl">Ay İniş Alanı Navigatörü</h1>
          <ModDegistirici className="ml-auto" />
        </header>
        <p className="grid flex-1 place-items-center text-2xl font-light tracking-[0.2em] text-metin-solgun">
          Yakında
        </p>
      </main>
    </div>
  )
}
