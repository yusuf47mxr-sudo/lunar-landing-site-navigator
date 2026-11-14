# Ay İniş Alanı Navigatörü

**NASA Space Apps Challenge 2026 — "Landing Site Navigator"**

> ⚠️ **Veri durumu: ŞU AN SAHTE VERİ.** Uygulamadaki bütün alan dosyaları
> test için üretilmiştir: fiziksel olarak tutarlıdır ama gerçek efemeris ya da
> gerçek arazi değildir. Arayüz bunu her sayfanın başlığı altında da söyler.
> Ayrıntı için [Veri durumu ve kaynaklar](#veri-durumu-ve-kaynaklar) bölümüne bakın.

Ay'da seçilen bir iniş alanında ve tarihte Güneş ile Dünya'nın ufka göre
nerede durduğunu gösteren bir web uygulaması. Quickmap, Moon Trek ve JPL
Horizons gibi araçlar güçlüdür ama uzman olmayanlar için kullanması zordur.
Bu projenin katkısı yeni bir hesap yöntemi değil, **anlaşılır bir arayüzdür**.

## Ne yapar

Challenge'ın dört sorusuna hızlıca cevap verir:

| Soru | Uygulamada |
|---|---|
| **Enerji:** Güneş ufkun üstünde mi, ne kadar güç üretilir? | Gökyüzü görünümünde Güneş ve arazi profili; aydınlanma oranı, anlık güç, görev boyunca toplam enerji (kWh) |
| **İletişim:** Dünya görünüyor mu, doğrudan radyo bağlantısı var mı? | Dünya'nın arazi + güvenlik payının üstünde olup olmadığı; iletişim oranı, en uzun kesinti |
| **Zamanlama:** Gün batımına ve Dünya batışına (Earthset) ne kadar kaldı? | Her sayfada görünen geri sayım; 24 saatin altında uyarı renginde |
| **Karşılaştırma:** Başka bir alan ya da tarih seçilse ne değişir? | Isı haritası (alan × iniş haftası) ve yan yana karşılaştırma |

Liste Artemis III aday bölgelerini, Apollo alanlarını, CLPS görevlerini ve
diğer ülkelerin iniş alanlarını içerir (24 alan). Kullanıcı kendi koordinatını
da girebilir; bu durumda arazi düz kabul edilir ve sonuç "yaklaşık" diye
işaretlenir.

### Üç mod

- **Temel** — çocuklar ve meraklılar için. Tek sütun, büyük yazı: gökyüzü,
  "Güneş görünür / Bağlantı var" rozetleri, büyük geri sayım ve Ay ile
  Dünya'yı somut sayılarla kıyaslayan bir kart.
- **Orta** — eğitimciler için. Kutup haritası, özel koordinat, zaman
  çizelgesi, ısı haritası, iki alanlı karşılaştırma, görev süresi ve direk
  yüksekliği seçimi.
- **İleri** — görev planlayıcıları için. Bütün mühendislik parametreleri
  (iletişim güvenlik payı, panel alanı, verim, yönelim, puan ağırlıkları),
  dört satırlı geri sayım, enerji ve puan, üç alanlı karşılaştırma ve CSV
  indirme.

Mod üst köşedeki düğmeyle değiştirilir; seçili alan, zaman ve parametreler
korunur.

## Çalıştırma

Node.js 20.19+ ya da 22.12+ gerekir (Vite 8).

```bash
npm install          # bağımlılıklar
npm run dev          # geliştirme sunucusu (http://localhost:5173)
npm run veri:uret    # sahte veriyi public/veri/ altına yeniden üretir
npm run veri:ozet    # ısı haritası özetini (ozet.json) yeniden hesaplar
npm run build        # üretim derlemesi → dist/
npm run preview      # derlemeyi yerelde sunar
```

`public/veri/` altındaki dosyalar depoda hazır gelir; `veri:uret` ve
`veri:ozet` yalnızca veri değiştiğinde gerekir. `veri:ozet` her zaman
`veri:uret`'ten (ya da gerçek dosyalar konduktan) sonra çalıştırılmalıdır.

Uygulama tamamen tarayıcıda çalışır; sunucu tarafı yoktur. `dist/` klasörü
herhangi bir statik barındırmaya (Vercel, GitHub Pages) konabilir.

## Veri sözleşmesi

Arayüz yalnızca [CLAUDE.md bölüm 4](CLAUDE.md#4-veri-sözleşmesi)'te tanımlanan
JSON yapılarını bilir:

| Dosya | İçerik |
|---|---|
| `bolgeler.json` | Alan listesi: ad, kategori, açıklama, enlem, boylam, dosya adı |
| `<alan>.json` | Bir alan için ufuk profilleri (3 direk yüksekliği × 360 azimut) ve bir yıllık saatlik Güneş/Dünya yükseklik ve azimutu |
| `efemeris.json` | Güneş ve Dünya'nın Ay üzerindeki alt-noktaları (özel koordinat için) |
| `ozet.json` | Isı haritası için önceden hesaplanmış dönem ölçütleri |

Açılar derece, azimut kuzeyden saat yönünde `[0, 360)`, zaman adımı 1 saat.

**Gerçek veri geldiğinde ne değişir:**

1. Gerçek dosyalar aynı adlarla `public/veri/` altına konur (sahtelerin
   üstüne).
2. `npm run veri:ozet` çalıştırılır.
3. `src/core/sabitler.js` içinde `VERI_KAYNAGI = 'gercek'` yapılır; sahte
   veri uyarısı kalkar.

Arayüz kodunda başka bir değişiklik gerekmez.

## Veri durumu ve kaynaklar

**Şu an:** `scripts/sahteVeriUret.mjs`, Güneş ve Dünya alt-noktalarını basit
periyodik modellerle (29.53 günlük güneş günü, Dünya'nın yaklaşık 27 günlük
librasyonu) üretir. Ufuk profilleri de uydurmadır: her alan için bir taban
yüksekliği ve birkaç tümsek. Sonuç, fiziksel olarak tutarlı davranır (kutupta
ufukta sürünen Güneş, gökte neredeyse sabit duran Dünya, uzak yüzde hiç
görünmeyen Dünya), ama **sayılar gerçek görev planlaması için kullanılamaz**.
Alan koordinatları da yaklaşıktır ve doğrulanmalıdır.

**Planlanan kaynaklar:**

| Kaynak | Kullanım |
|---|---|
| [NASA NAIF SPICE](https://naif.jpl.nasa.gov/naif/) — DE440 gezegen efemerisi, Ay çerçevesi `MOON_ME` | Güneş ve Dünya'nın her alandan yüksekliği ve azimutu; `efemeris.json` için `subpnt` ile alt-noktalar |
| [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) sayısal yükseklik modeli (DEM) | Her alan ve direk yüksekliği için 360° ufuk profili |
| [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | 3B Ay küresinin dokusu (3B görünüm eklenirse) |

## Formüller

Bütün hesaplar tarayıcıda yapılır. Ayrıntı:
[CLAUDE.md bölüm 5](CLAUDE.md#5-hesap-formülleri).

- **Alt-noktadan yükseklik ve azimut:** küresel trigonometri; saat açısı
  `H = λ − λ_s` (özel koordinat ve sahte veri üreteci için).
- **Güneş diskinin görünen oranı:**
  `f = clamp((h☉ + 0.266° − H(A☉)) / 0.532°, 0, 1)`; `H(A)` o azimuttaki
  ufuk yüksekliği (komşu dereceler arasında doğrusal ara değer).
- **İletişim:** `c = 1` eğer `h⊕ > H(A⊕) + ε`, değilse `0` (ε varsayılan 2°).
- **Anlık güç:** `P = 1361 · η · S · f`, yatay panelde `× sin h☉`, dikey
  panelde `× cos h☉`.
- **Geri sayım:** seçili andan ileri doğru `f` ve `c` dizilerinde ilk
  geçişe kadar geçen saat.
- **Görev ölçütleri** (`[tL, tL + D]`): ortalama `f` ve `c`, en uzun
  karanlık, en uzun iletişim kesintisi, toplam enerji
  `E = Σ P · Δt`, puan
  `w1 · f̄ + w2 · c̄ − w3 · (en uzun karanlık / görev süresi)`.

## Kütüphaneler ve lisansları

| Kütüphane | Kullanım | Lisans |
|---|---|---|
| [React](https://react.dev) | Arayüz | MIT |
| [Vite](https://vite.dev) | Geliştirme sunucusu ve derleme | MIT |
| [Tailwind CSS](https://tailwindcss.com) | Stil | MIT |
| [Zustand](https://zustand.docs.pmnd.rs) | Durum yönetimi | MIT |
| [Framer Motion](https://motion.dev) | Geçişler ve akan sayılar | MIT |
| [d3-geo](https://d3js.org/d3-geo) | Kutup haritası (stereografik projeksiyon) | ISC |
| [Inter](https://rsms.me/inter/) (Google Fonts) | Yazı tipi | SIL Open Font License 1.1 |

Grafikler (gökyüzü, zaman çizelgesi, ısı haritası) Canvas 2D ile elle
çizilmiştir; hazır grafik kütüphanesi kullanılmaz.

`package.json`'da kurulu ama henüz kullanılmayanlar: `three`,
`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
(planlanan 3B Ay küresi için, hepsi MIT) ve `d3-scale` (ISC). Derlenen pakete
girmezler.

## Yapay zekâ kullanımı

Kod, [Claude](https://www.anthropic.com/claude) (Anthropic) yardımıyla
yazıldı. Tasarım kararları, formüller, veri sözleşmesi ve sonuçların
doğrulanması ekip tarafından yapıldı.

## Ekip

**ENRG – Erciyes Neutrino Research Group**

- _Ad Soyad_ — _rol_
- _Ad Soyad_ — _rol_
- _Ad Soyad_ — _rol_

---

## English summary

**Lunar Landing Site Navigator** — NASA Space Apps Challenge 2026,
"Landing Site Navigator".

A browser-only web app that shows where the Sun and Earth sit relative to the
local horizon at a chosen lunar landing site and date. It answers four
questions: is there sunlight and how much power (energy), is Earth visible for
direct radio contact (communication), how long until sunset and Earthset
(timing), and how a different site or date compares (comparison). Three modes
target different audiences: Basic (children and the curious), Intermediate
(educators) and Advanced (mission planners, with engineering parameters and
CSV export).

> **Data status: the app currently runs on SYNTHETIC data** — physically
> consistent but not real ephemeris or terrain. Planned sources are NASA NAIF
> SPICE (DE440, `MOON_ME` frame), LRO LOLA DEM horizon profiles and, if a 3D
> view is added, the NASA CGI Moon Kit.

Run with `npm install` and `npm run dev`; build with `npm run build`.
Built with React, Vite, Tailwind CSS, Zustand, Framer Motion and d3-geo.
The code was written with the help of Claude (Anthropic); design decisions,
formulas and validation were done by the team, ENRG – Erciyes Neutrino
Research Group.
