/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // CLAUDE.md bölüm 9 — Renk Paleti
      colors: {
        zemin: '#070B14',          // en arka plan
        yuzey: {
          DEFAULT: '#0E1524',      // panel arkaplanı
          acik: '#16203A',         // kart, hover
        },
        cizgi: '#1F2B45',          // kenarlık, ızgara
        metin: {
          DEFAULT: '#E6EDF7',      // ana metin
          solgun: '#8A97AC',       // ikincil metin, etiket
        },
        gunes: {
          DEFAULT: '#F5A524',      // Güneş, aydınlanma, enerji
          soluk: '#6B4A12',        // aydınlık şerit arkaplanı
        },
        iletisim: {
          DEFAULT: '#22D3EE',      // Dünya, iletişim penceresi
          soluk: '#0E4A55',
        },
        uyari: '#EF4444',          // kritik durum, uzun karanlık
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
