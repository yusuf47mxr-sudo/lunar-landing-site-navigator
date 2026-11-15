# Ay İniş Alanı Navigatörü

**🌐 Canlı: <https://ay-inis-navigatoru.vercel.app>**

**NASA Space Apps Challenge 2026 — "Landing Site Navigator"**

> **Veri:** NAIF SPICE (DE440) efemerisi ve LRO LOLA / SLDEM2015 arazisinden
> hesaplanmış ufuk profilleri; 26 iniş alanı, 2027 yılı, saatlik. Ayrıntı ve
> doğrulama: [Veri kaynakları ve doğrulama](#veri-kaynakları-ve-doğrulama).

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

**3B Ay küresi ve yerel sahne** (Temel modda varsayılan; diğerlerinde
Panorama / Kubbe / 3B düğmesi): önce bütün alanların işaretli olduğu Ay
küresi — LROC renk dokusu, LOLA kabartması, seçili ana göre Güneş ışığı ve
gece-gündüz sınırı, uzakta evreli Dünya. Bir işarete tıklayınca kamera alana
yaklaşır ve yerel sahneye iner; "Ay › alan" çubuğuyla geri dönülür. Yerel sahne: seçili alanın 10 × 10 km'lik gerçek LOLA arazisi, Güneş'in
yönlü ışığı ve gölgeleri, uzak ufuk şeridi (Güneş uzak dağın arkasına
girince 3B'de de kaybolur), Dünya (bağlantı yokken içi boş halka), 18 yılda
hiç Güneş almayan hücrelerin mavi örtüsü, pusula, dört kamera kipi, düşey
abartı (1× / 2× / 5×) ve tam ekran (F / ESC). three.js yalnız 3B seçilince
indirilir.

Liste Artemis III aday bölgelerini, Apollo alanlarını, CLPS görevlerini ve
diğer ülkelerin iniş alanlarını içerir (26 alan). Kullanıcı kendi koordinatını
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
npm run veri:donustur # veri paketinden public/veri/ (alanlar, bolgeler, efemeris)
npm run veri:ozet    # ısı haritası özetini (ozet.json) yeniden hesaplar
npm run veri:3b      # 3B arazi dosyalarını (public/veri/3b/) veri paketinden üretir
npm run build        # üretim derlemesi → dist/
npm run preview      # derlemeyi yerelde sunar
```

`public/veri/` altındaki dosyalar depoda hazır gelir; veri betikleri yalnızca
veri paketi değiştiğinde gerekir. Paket (`planb_veri_paketi_v4_*.zip`)
`veri_kaynak/planb/` altına açılır (ikisi de depoya girmez); sonra sırayla
`veri:donustur`, `veri:ozet`, `veri:3b`.

Uygulama tamamen tarayıcıda çalışır; sunucu tarafı yoktur. `dist/` klasörü
herhangi bir statik barındırmaya (Vercel, GitHub Pages) konabilir.

## Veri sözleşmesi

Arayüz yalnızca [CLAUDE.md bölüm 4](CLAUDE.md#4-veri-sözleşmesi)'te tanımlanan
JSON yapılarını bilir:

| Dosya | İçerik |
|---|---|
| `bolgeler.json` | Alan listesi: ad, kategori, açıklama, enlem, boylam, dosya adı, koordinat kaynağı, arazi türü |
| `<alan>.json` | Bir alan için ufuk profilleri (3 direk yüksekliği × 720 azimut, 0.5°) ve bir yıllık saatlik Güneş/Dünya yükseklik ve azimutu, Güneş uzaklığı |
| `efemeris.json` | Güneş ve Dünya'nın Ay üzerindeki alt-noktaları ve Güneş uzaklığı (özel koordinat için) |
| `ozet.json` | Isı haritası için önceden hesaplanmış dönem ölçütleri |
| `3b/<alan>.json` | 3B sahne: 201 × 201 yükseklik ızgarası (50 m, merkeze göre) ve kutup alanlarında 31 × 31 "hiç Güneş almayan" hücre haritası |

Açılar derece, azimut kuzeyden saat yönünde `[0, 360)`, zaman adımı 1 saat.

## Veri kaynakları ve doğrulama

Bütün veri ekibin **Plan B veri paketinden (v4, 14 Kasım 2026)** gelir;
`scripts/gercekVeriDonustur.mjs` onu bu uygulamanın veri sözleşmesine çevirir.
Güneş ve Dünya konumları paketin, Python hattıyla birebir doğrulanmış
`web/js/model.js` kütüphanesiyle hesaplanır (formül kopyalanmaz).

| Kaynak | Kullanım |
|---|---|
| [NASA NAIF SPICE](https://naif.jpl.nasa.gov/naif/) — DE440, Ay çerçevesi `MOON_ME_DE440_ME421`, ışık zamanı + yıldız sapması | Güneş yönü, Dünya vektörü, Güneş uzaklığı (saatlik). JPL Horizons ile fark 0.000° |
| [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) — kutupta 20 m / 80 m (bazı alanlarda PGDA 104 5 m) | Kutup alanlarında 720 yönlü ufuk (0, 2, 10 m direk), 3B arazi, "18 yılda hiç Güneş almayan" hücreler |
| SLDEM2015 (≈ 118 m; Chandrayaan-3 için LOLA ≈ 237 m) | Kutup dışı alanlarda ufuk ve 3B arazi; arayüzde "Arazi ~118 m çözünürlükte." notu |
| NASA NSSDC, LROC, USGS, makaleler | Alan koordinatları (`bolgeler.json` "kaynak") |
| [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) — NASA's Scientific Visualization Studio | 3B Ay küresinin renk dokusu (LROC WAC) ve yükseklik haritası (LOLA), `public/veri/3b/moon/`; arayüzde kredi yazılır |
| LROC NAC kontrollü güney kutbu mozaiği, 1 m/px — **NASA/GSFC/Arizona State University** | Yerel sahnede "Fotoğraf" katmanı (10 alan, 3.1 km kare) |
| Ekibin ML modeli (YOLOv8, 1 m LROC NAC); eğitim: **Boazman et al. 2024** (PSJ 5:279) ve **SomBench NAC (NASA–IBM, CC BY 4.0)** | "Küçük kraterler (ML)" (D ≥ 10 m) ve 100 m hücre "Tehlike" katmanları; kutupta ML 0.208 / uzman 0.198, hücre başına ±0.09; kalıcı gölgede görüntü yok → bilinmiyor |
| Güney kutbu 400 m DEM (LOLA LDEM_80S_80MPP_ADJ) | 80°G içi özel koordinatta **kaba** ufuk ve 3B arazi (Güneş % ort. +8 puan fazla, RMSE 12) |

*Not an official NASA product.*

**Tanımlar (paketle aynı):** Güneş diskinin görünen oranı `f` daire dilimidir,
yarıçap Güneş uzaklığından; `f > 0.5` "aydınlık"; Dünya görünür = merkezi ufkun
en az ε üstünde; güç `× (1 AB / uzaklık)²`.

**Doğrulama** (dönüştürülmüş veri + `hesap.js`, paketin referans değerleriyle):

| Kontrol | Sonuç |
|---|---|
| Güneş %, Dünya %, en uzun karanlık, en uzun Dünya'sız (5 senaryo, 2027) | paketle aynı (Güneş % farkı ≤ 0.01 puan) |
| Geri sayım (17 referans olay, SPICE 1 dk) | 17/17 ±1 saat içinde |
| Ufuk | 720 yön (0.5°), paketle aynı; Güneş kutupta ufukta sürünürken `el − H` yalnızca birkaç yüzde bir derece |

**Bilinen sınırlar** (paketin veri sözleşmesinden): kutup dışı ufuklar ~118 m
DEM'e dayanır, küçük tepeler görünmez; Dünya görünürlüğü yalnız geometridir
(yer istasyonu, bağlantı bütçesi yok); özel koordinatta ufuk 80°G içinde
kaba (400 m DEM), diğer yerlerde düz kabul edilir; ML kraterleri tek hücrede
kabadır, aşınmış büyük (> ~50 m) kraterleri kaçırabilir ve kalıcı gölgede
görüntü olmadığı için oralarda tehlike "bilinmiyor"dur.

## Formüller

Bütün hesaplar tarayıcıda yapılır. Ayrıntı:
[CLAUDE.md bölüm 5](CLAUDE.md#5-hesap-formülleri).

- **Yükseklik ve azimut:** paketin `model.js` `basis/azel`'i (yerel doğu-
  kuzey-yukarı tabanı; Dünya için gözlemci konumu zemin + direk). Özel
  koordinatta alt-noktadan küresel trigonometri (`H = λ − λ_s`).
- **Güneş diskinin görünen oranı (daire dilimi):**
  `d = clamp((h☉ − H(A☉)) / ρ, −1, 1)`, `f = 1 − (acos d − d·√(1 − d²)) / π`;
  `ρ = asin(R☉ / uzaklık)`, `H(A)` o azimuttaki ufuk yüksekliği (komşu
  dereceler arasında doğrusal ara değer). Aydınlık: `f > 0.5`.
- **İletişim:** `c = 1` eğer `h⊕ > H(A⊕) + ε`, değilse `0` (ε varsayılan 2°).
- **Anlık güç:** `P = 1361 · (1 AB / uzaklık)² · η · S · f`, yatay panelde
  `× sin h☉`, dikey panelde `× cos h☉`.
- **Geri sayım:** seçili andan ileri doğru `f` ve `c` dizilerinde ilk
  geçişe kadar geçen saat.
- **Görev ölçütleri** (`[tL, tL + D]`): ortalama `f` ve `c`, en uzun
  karanlık (`f ≤ 0.5`), en uzun iletişim kesintisi, toplam enerji
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
| [three](https://threejs.org), [@react-three/fiber](https://r3f.docs.pmnd.rs), [@react-three/drei](https://drei.docs.pmnd.rs) | 3B yerel sahne | MIT |
| [postprocessing](https://pmndrs.github.io/postprocessing/), [@react-three/postprocessing](https://react-postprocessing.docs.pmnd.rs) | Bloom (Güneş) ve ACES ton eşlemesi | Zlib / MIT |
| [Inter](https://rsms.me/inter/) (Google Fonts) | Yazı tipi | SIL Open Font License 1.1 |

Grafikler (gökyüzü, zaman çizelgesi, ısı haritası) Canvas 2D ile elle
çizilmiştir; hazır grafik kütüphanesi kullanılmaz.

3B sahne ayrı bir parçadır (≈ 1 MB, gzip ≈ 280 kB) ve yalnız 3B seçilince
indirilir; ana paket değişmez. `d3-scale` kurulu ama kullanılmıyor.

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
CSV export). A 3D local scene (react-three-fiber) shows the real LOLA terrain
of the selected site with the Sun's light and shadows, a far-horizon ring,
Earth, permanently shadowed cells, a compass, camera modes and fullscreen.

> **Data:** NASA NAIF SPICE (DE440, `MOON_ME_DE440_ME421`) ephemeris and
> horizon profiles ray-traced on LRO LOLA (polar, 5–20 m) and SLDEM2015
> (~118 m) terrain, from the team's validated data package; 26 sites, 2027,
> hourly. Visible solar-disc fraction, lit threshold (f > 0.5), Earth margin
> and power follow the package definitions. Validated against the package's
> reference values (all five 2027 scenarios match; 17/17 rise/set events within
> one hour).

Run with `npm install` and `npm run dev`; build with `npm run build`.
Built with React, Vite, Tailwind CSS, Zustand, Framer Motion and d3-geo.
The code was written with the help of Claude (Anthropic); design decisions,
formulas and validation were done by the team, ENRG – Erciyes Neutrino
Research Group.
