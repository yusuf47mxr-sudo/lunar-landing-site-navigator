# Claude Code İstemleri — Adım Adım

Her adımı sırayla uygula. Bir adım bitince çalıştır, gör, `git commit` at,
sonra diğerine geç. İstemleri olduğu gibi kopyalayabilirsin.

`CLAUDE.md` proje kök dizininde durduğu sürece Claude Code onu her
oturumda okur; istemlerde yığını, renkleri ve formülleri tekrar yazmana
gerek yok.

**Model önerisi:**

| Adım | Model | Düşünme |
|---|---|---|
| 1, 5, 7, 10, 12 | Fable | Medium |
| 6, 8, 9 | Fable (takılırsan Opus) | Medium |
| 2, 3, 4, 11 | Opus | High |

---

## Adım 1 — İskelet ✓ (tamamlandı)

```
CLAUDE.md dosyasını oku ve ona uygun bir proje iskeleti kur.

Vite + React projesi oluştur. Tailwind CSS kur ve CLAUDE.md bölüm 9'daki
renk paletini tailwind.config.js içinde özel renkler olarak tanımla.
Inter yazı tipini index.html'e ekle.

CLAUDE.md bölüm 3'teki klasör yapısını oluştur; dosyalar şimdilik boş
veya tek satırlık yer tutucu olabilir.

App.jsx içinde koyu zeminli, ortada "Ay İniş Alanı Navigatörü" yazan
basit bir sayfa göster. Yazı tipi ince (font-light), harf aralığı hafif
açık olsun.

Çalıştır ve ekran görüntüsünü tarif et.
```

---

## Adım 2 — Efemeris ve Sahte Veri Üreteci

```
CLAUDE.md güncellendi; önce bölüm 3, 4, 5.1 ve 10'u oku. Yeni klasör
yapısında eksik olan dosyaları (efemeris.js, ozelNokta.js, GeriSayim.jsx,
AyDunyaKarti.jsx, Karsilastirma.jsx, AlanListesi.jsx, OzelKoordinat.jsx,
scripts/) yer tutucu olarak ekle.

Sonra üç dosya yaz:

=== 1) src/core/efemeris.js ===
CLAUDE.md bölüm 5.1'deki formülle:
  altAz(phi, lam, subLat, subLon) → { alt, az }   (tek değer)
  altAzDizi(phi, lam, subLatDizi, subLonDizi) → { alt: Float32Array, az: Float32Array }
Tarayıcıda ve Node'da çalışmalı (saf ES modülü, bağımlılık yok).

=== 2) src/core/sahteVeri.js ===

ZAMAN: t0 = 2027-01-01T00:00:00Z, dt = 1 saat, n = 8760.
t_gun = k / 24   (k = 0 .. n-1)

ALT-NOKTALAR (efemeris.json için):
  sun_sub_lat   = 1.54 * sin(2*PI * t_gun / 346.62)
  sun_sub_lon   = (-360 * t_gun / 29.53)  → [0, 360) aralığına getir
  earth_sub_lat = 6.7 * sin(2*PI * t_gun / 27.21)
  earth_sub_lon = 7.9 * sin(2*PI * t_gun / 27.55)

  Açıklama: 29.53 gün Ay'da bir güneş günü (sinodik ay); 27.32 KULLANMA.
  346.62 gün Güneş'in Ay ekvatoruna göre mevsim döngüsü. 27.21 ve 27.55
  gün Dünya'nın enlem ve boylam librasyonu.

ALAN DİZİLERİ: her alan için altAzDizi ile
  sun_alt, sun_az   ← sun_sub_lat, sun_sub_lon
  earth_alt, earth_az ← earth_sub_lat, earth_sub_lon

UFUK PROFİLİ:
  H(A) = taban + toplam_i  a_i * exp( -d_i^2 / (2 * s_i^2) )
  d_i: A ile A_i arasındaki DÖNGÜSEL fark, [-180, 180] aralığında.
       (Düz fark alınırsa 0°/360° sınırında profil kopar.)
  Kutup alanları (|lat| >= 75): 3-5 tümsek, a_i 0.5-4°, s_i 15-60°
  Diğer alanlar: 2-4 tümsek, a_i 0.2-1.5°, s_i 20-60°
  A_i: 0-360° rastgele.

  taban — TEST İÇİN UYDURULMUŞ DEĞERLER:
    Malapert Massif -3.5    Mons Mouton -3.0     Mons Mouton Plateau -2.5
    Peak near Cabeus B -2.5 IM-2 Athena -2.5     IM-1 Odysseus -2.0
    de Gerlache Rim 2 -1.5  Nobile Rim 1 -1.0    Nobile Rim 2 -1.0
    Slater Plain +1.0       Haworth +2.0         Chang'e 4 +1.0
    Diğer bütün alanlar 0
  (Negatif taban = yüksekte duran nokta; ufku göz hizasının altında görür.)

  Direk yüksekliği: hm=0 → H,  hm=2 → H - 0.1,  hm=10 → H - 0.4

Rastgelelik için tohumlu üreteç kullan (örn. mulberry32); tohum alan
adından türetilsin. Math.random KULLANMA — her çalıştırmada aynı veri
çıkmalı.

Alan listesi, kategorileri ve açıklamaları CLAUDE.md bölüm 10'daki
tablolardan alınacak (24 alan).

=== 3) scripts/sahteVeriUret.mjs ===
public/veri/ altına yazar:
  efemeris.json   — CLAUDE.md bölüm 4.3
  bolgeler.json   — CLAUDE.md bölüm 4.2
  <dosya_adi>.json — her alan için, bölüm 4.1
    Dosya adı: küçük harf, boşluk yerine _, Türkçe karakter ve kesme
    işareti yok. Örn. malapert_massif.json, apollo_11.json, change_4.json
Bütün sayılar 2 ondalığa yuvarlansın.
package.json'a  "veri:uret": "node scripts/sahteVeriUret.mjs"  ekle.

ozet.json bu adımda ÜRETİLMEYECEK (Adım 3'te).

=== DOĞRULAMA: betiği çalıştır, sonuçları tablo olarak yaz ===
 1. Malapert Massif sun_alt min / max        → ≈ -5.5 / +5.5
 2. Malapert Massif earth_alt min / max      → ≈ -2.7 / +10.7
 3. Apollo 11 sun_alt min / max              → ≈ -90 / +90
 4. Apollo 11 earth_alt min / max            → ≈ +58 / +74   (hep tepede)
 5. Chang'e 4 earth_alt min / max            → ≈ -51 / -38   (hiç görünmez)
 6. Chandrayaan-3 earth_alt min / max        → ≈ +11 / +23
 7. Malapert earth_alt dönemi
    (ardışık tepeler arası ortalama süre)     → ≈ 27.2 gün
 8. Malapert sun_az bir tam turu kaç günde?  → ≈ 29.5 gün
 9. Malapert earth_az'ın 0°'dan en büyük döngüsel sapması → ≈ 11° içinde
10. Her dosyada horizon dizileri 360, zaman dizileri 8760 eleman mı?
11. horizon["2"] ortalaması: Malapert ve Haworth
                                             → Malapert negatif, Haworth pozitif
12. Dosya sayısı (24 alan + bolgeler + efemeris = 26) ve toplam boyut

Beklenenle uyuşmayan bir değer varsa düzeltmeye girişmeden önce bana
bildir. Uyuşuyorsa commit at.
```

---

## Adım 3 — Hesap Modülü, Özel Nokta ve Durum Deposu

```
CLAUDE.md bölüm 5 ve 6'yı oku. Şu dosyaları yaz:

=== 1) src/core/hesap.js ===
Bölüm 5.2-5.7'deki bütün formüller:
  ufukOku(horizon, azimut)                 → döngüsel doğrusal ara değer
  gunesOrani(sunAlt, sunAz, horizon)       → f, Float32Array
  iletisimDurumu(earthAlt, earthAz, horizon, epsilon) → c, Float32Array
  guc(f, sunAlt, eta, S, yonelim)          → P, Float32Array
  olcutler(f, c, P, tL, D, dtHours, w1, w2, w3)
      → { fBar, cBar, tauMax, sigmaMax, E, puan }
  geriSayim(f, c, t)
      → { gunes:   { gorunur: bool, saat: number|null },
          dunya:   { gorunur: bool, saat: number|null } }
      gorunur=true ise saat = batışa kalan, false ise doğuşa kalan.
      Geçiş yoksa saat = null.
  saatBicimle(saat) → "3 g 7 sa" / "11 sa" / "45 dk"

Bütün diziler Float32Array. Döngülerde ara nesne yaratma.

=== 2) src/core/ozelNokta.js ===
Bölüm 5.8:
  ozelNoktaOlustur(lat, lon, efemeris) → alan nesnesi
    Bölüm 4.1 yapısında, horizon dizileri sıfır, yaklasik: true

=== 3) src/core/veri.js ===
public/veri/ altından bolgeler.json, efemeris.json ve alan dosyalarını
yükler, bellekte önbellekler. Alan dosyası sadece istendiğinde yüklenir.

=== 4) src/durum/store.js ===
Bölüm 6'daki Zustand deposu. Türetilmiş değerleri SAKLAMA. Bunun yerine
seçili alanın verisini ve parametreleri okuyup hesap.js'i çağıran
kancalar yaz:
  useSeciliAlanVerisi()  → alan nesnesi (ozelNokta doluysa onu üretir)
  useAnlikDurum()        → { f, c, P, sunAlt, sunAz, earthAlt, earthAz } (t anı)
  useOlcutler()          → olcutler() sonucu
  useGeriSayim()         → geriSayim() sonucu

=== 5) scripts/ozetUret.mjs ===
hesap.js'deki fonksiyonları KULLANARAK (formülleri kopyalamadan)
public/veri/ozet.json üretir (bölüm 4.4):
  - İniş tarihleri: t0'dan itibaren haftalık, 52 adet (her 168 saatte bir)
  - hm ∈ {0, 2, 10},  D ∈ {7, 30, 90, 180} gün,  epsilon = 2° sabit
  - Her alan × hm × D için 52 elemanlı f_bar, c_bar, tau_max_h, sigma_max_h
  - tL + D yıl sonunu aşıyorsa o eleman null
  - package.json'a "veri:ozet": "node scripts/ozetUret.mjs" ekle

=== DOĞRULAMA (hm=2, D=180, ilk iniş tarihi) ===
 1. Malapert fBar ≈ 0.6-0.9,  Haworth fBar < 0.2
 2. Apollo 11 fBar ≈ 0.5,  cBar = 1.0
 3. Chang'e 4 cBar = 0
 4. Apollo 11 için Güneş'in göründüğü bir t seç: geriSayim gün batımına
    kalan süreyi 0-355 saat arasında vermeli (bir Ay gündüzü ≈ 354 saat)
 5. ozelNoktaOlustur(0.674, 23.473) sonucunun sun_alt ve earth_alt
    dizileri apollo_11.json ile aynı mı? (Sahte veri aynı efemeristen
    üretildiği için birebir tutmalı; sadece horizon farklı olmalı.)
 6. ozet.json boyutu

Sayılar tam tutmasa da SIRALAMA böyle olmalı. Değilse bana bildir.
Uyuşuyorsa commit at.
```

---

## Adım 4 — Gökyüzü Görünümü (en kritik bileşen)

```
src/bilesenler/GokyuzuGorunumu.jsx yaz. Canvas 2D ile çiz, hazır grafik
kütüphanesi KULLANMA.

GİRDİLER (props):
  horizon     : 360 elemanlı dizi (derece)
  sunAlt, sunAz, earthAlt, earthAz : o anki değerler (derece)
  epsilon     : iletişim güvenlik payı (derece)
  kutup       : bool — |lat| >= 75 ise true
  sunTrail, earthTrail : son 48 saatin [az, alt] çiftleri (isteğe bağlı)
  yaklasik    : bool — özel koordinat ise true

EKSEN:
  Yatay: azimut 0-360°. Altta K / D / G / B etiketleri.
  Dikey: kutup=true ise -15…+15°, değilse -90…+90°.
         Alan değişmedikçe sabit kalır; zaman ilerleyince oynamaz.

ÇİZİM:
  1. Zemin: --zemin.
  2. Hafif ızgara: her 30° azimut; dikeyde kutupta her 5°, diğerinde her 15°.
     --cizgi renginde ince çizgi.
  3. Ufuk çizgisi (yükseklik 0): biraz daha belirgin yatay çizgi.
  4. Ufuk profili H(A): dolu alan, aşağısı tamamen dolu, rengi
     --yuzey-acik, üst kenarı --cizgi.
  5. İletişim eşiği: H(A) + epsilon eğrisini --iletisim renginde ince
     kesikli çizgiyle göster.
  6. Güneş: --gunes renginde dolu daire, yarıçap 10px, etrafında yumuşak
     parlama (radial gradient). Ufkun altındaysa %25 opaklık.
  7. Dünya: --iletisim renginde dolu daire, yarıçap 8px. Eşiğin altındaysa
     %25 opaklık.
  8. Cisim eksen dışına taşıyorsa kenarda küçük ok ve "+23°" gibi etiket.
  9. İzler verilmişse son konumları soluk, incelen çizgiyle bağla.
 10. Sağ üstte küçük açıklama: sarı nokta "Güneş", mavi nokta "Dünya".
 11. yaklasik=true ise sol üstte --uyari renginde küçük etiket:
     "Arazi hesaba katılmadı"

DAVRANIŞ:
  - Kapsayıcıya göre boyutlanır (ResizeObserver), devicePixelRatio'ya uyar.
  - Değerler değişince konumlar 150 ms'lik lerp ile yumuşak geçsin
    (requestAnimationFrame).
  - Fare üzerine gelince o azimuttaki ufuk yüksekliğini küçük etiketle göster.

Bileşeni tek başına test eden geçici bir sayfa yap. Malapert Massif ve
Apollo 11 arasında geçiş yapan bir düğme koy; ikisini de çalıştırıp nasıl
göründüğünü tarif et.
```

---

## Adım 5 — Temel Sayfa

```
src/sayfalar/Temel.jsx ve şu bileşenleri yaz:
AlanListesi.jsx, DurumGostergesi.jsx, GeriSayim.jsx, AyDunyaKarti.jsx,
ZamanKaydirici.jsx.

YERLEŞİM (tek sütun, ortalanmış, maksimum genişlik 900px):

  1. AlanListesi — yatay kaydırılabilir kart şeridi, kategorilere göre
     gruplu (Artemis, Apollo, CLPS, Uluslararası). Kategori başlıkları
     küçük ve solgun. Her kart: alan adı (font-light), altında açıklama
     küçük ve solgun. Seçili kartın kenarlığı --gunes.

  2. GokyuzuGorunumu — yükseklik 380px, tam genişlik.

  3. DurumGostergesi — yan yana iki büyük rozet:
     Güneş: f > 0.5 → --gunes "Güneş görünür"; 0 < f <= 0.5 → soluk sarı
            "Güneş kısmen görünür"; f = 0 → gri "Gölgede"
     İletişim: c = 1 → --iletisim "Dünya ile bağlantı var";
               c = 0 → gri "Bağlantı yok"
     En az 100px yükseklik, 20px yazı.

  4. GeriSayim — rozetlerin hemen altında, büyük ve net:
       "☀ Gün batımına 3 g 7 sa"     veya  "☀ Gün doğumuna 2 g 4 sa"
       "📡 Dünya batışına 11 sa"     veya  "📡 Dünya doğuşuna 5 g"
     Geçiş yoksa: "Bu dönemde batmıyor" / "Bu dönemde görünmüyor".
     Süre 24 saatten azsa --uyari renginde.

  5. ZamanKaydirici — kalın kaydırıcı, solunda oynat/durdur, üstünde
     tarih ("14 Mart 2027, 08:00 UTC").

  6. AyDunyaKarti — en altta, seçili alana göre DEĞİŞEN 3 kısa bilgi:
     - "Burada bir gün 29.5 Dünya günü sürer."
     - "Güneş burada en fazla {maks sun_alt}° yükselir. Dünya'da orta
       enlemlerde yaz öğlesinde bu açı yaklaşık 70°'dir."
     - Dünya hiç görünmüyorsa: "Bu alandan Dünya hiç görünmez — uzak
       yüzdesiniz."
       Görünüyorsa: "Dünya gökte neredeyse sabit durur; sadece
       ±{(maks-min)/2}° salınır."
     - Kutup alanıysa: "Güneş ufka çok yakın dolaştığı için birkaç
       metrelik bir tepe bile uzun gölge yapar."
     Sade, çocuğun anlayacağı dilde. Sayılar veriden hesaplanır.

BAŞKA HİÇBİR ŞEY GÖSTERME. Parametre yok, grafik yok.
Rozet ve sayı geçişleri Framer Motion ile yumuşak olsun.
```

---

## Adım 6 — Zaman Çizelgesi

```
src/bilesenler/ZamanCizelgesi.jsx yaz. Canvas 2D.

GİRDİLER: f, c (Float32Array), t0, dtHours, tSecili, D, tL

ÇİZİM — iki yatay şerit, üst üste:
  "Aydınlanma" (28px): f = 1 → --gunes, f = 0 → --zemin, arası ara renk.
  "İletişim"   (28px): c = 1 → --iletisim, c = 0 → --zemin.
  Etiketler solda, solgun.

  Görev aralığı [tL, tL+D] dışı %30 opaklıkla soluklaşsın.
  Seçili an: dikey beyaz çizgi, üstünde küçük üçgen.
  tauMax ve sigmaMax aralıklarının üstüne ince --uyari çizgisi ve süre
  ("62 sa").
  Alt kenarda ay isimleri (Oca, Şub, ...).

DAVRANIŞ:
  - Tıklayınca o ana atla (t güncellensin), sürükleyince takip etsin.
  - Fare üzerinde ince kılavuz çizgi ve tarih etiketi.
  - Dizi piksel sayısından uzunsa her piksel için aralık ortalaması al.
```

---

## Adım 7 — Orta Sayfa

```
src/sayfalar/Orta.jsx, KutupHaritasi.jsx ve OzelKoordinat.jsx yaz.

YERLEŞİM — iki sütun (sol 380px sabit, sağ esnek):

SOL SÜTUN:
  - AlanListesi (dikey, kategorilere göre gruplu, aranabilir)
  - OzelKoordinat: enlem ve boylam girişi + "Göster" düğmesi.
    Girilince store.ozelNokta dolar, seçili alan özel nokta olur.
    Girişin altında solgun not: "Arazi verisi yalnızca listedeki
    alanlar için var."
  - KutupHaritasi: d3-geo stereografik, güney kutbu merkezli, 75°G'ye
    kadar. Kutup alanları nokta olarak; tıklanınca seçilir. Seçili olan
    --gunes. Kutup dışı bir alan seçiliyse haritanın üstünde "Seçili alan
    kutup bölgesinde değil" notu.
  - Görev süresi D: 7 / 30 / 90 / 180 gün düğmeleri
  - Direk yüksekliği hm: 0 / 2 / 10 m düğmeleri
  - Sayısal özet:
      Güneş yüksekliği      +2.3°
      Dünya yüksekliği      −1.1°
      Gün batımına          3 g 7 sa
      Dünya batışına        11 sa
      Aydınlanma oranı      %82
      İletişim oranı        %91
      En uzun karanlık      62 sa
    Sayılar tabular-nums, değişince Framer Motion ile akarak güncellensin.

SAĞ SÜTUN:
  - GokyuzuGorunumu (340px)
  - ZamanCizelgesi
  - ZamanKaydirici (kalıcı)

Sayfa altında iki boş kutu bırak: Isı haritası (Adım 8) ve
Karşılaştırma (Adım 9).
```

---

## Adım 8 — Isı Haritası

```
src/bilesenler/IsiHaritasi.jsx yaz. Canvas 2D.

VERİ: public/veri/ozet.json
  Store'daki hm ve D değerine göre ilgili diziler seçilir.
  Puan tarayıcıda hesaplanır:
    puan = w1*f_bar + w2*c_bar - w3*(tau_max_h / (D*24))

ÇİZİM:
  Satırlar: alanlar, kategorilere göre gruplu (grup başlıkları solda,
  gruplar arasında ince boşluk). Üstte kategori filtre düğmeleri;
  varsayılan: Artemis + CLPS.
  Sütunlar: 52 haftalık iniş tarihi (altta ay isimleri).
  Hücre rengi: puan → düşük --zemin, yüksek --gunes, sürekli gradyan.
  null hücreler: ince çapraz taralı, boş.
  Seçili hücrenin kenarlığı beyaz.
  Sağ üstte renk ölçeği açıklaması.
  İleri modda epsilon 2°'den farklıysa üstte küçük not:
    "Isı haritası ε = 2° ile önceden hesaplanmıştır."

DAVRANIŞ:
  - Fare üzerinde küçük kutu: alan, tarih, aydınlanma %, iletişim %,
    en uzun karanlık.
  - Tıklayınca seciliAlan ve tL güncellensin.
  - w1, w2, w3, hm veya D değişince yeniden çizilsin.
```

---

## Adım 9 — Yan Yana Karşılaştırma

```
src/bilesenler/Karsilastirma.jsx yaz.

Challenge özellikle iki senaryoyu istiyor: "aynı bölgede alternatif
alanlar" ve "aynı alanda alternatif tarihler". İkisini de destekle.

ÜSTTE sekme: "Alanları karşılaştır" | "Tarihleri karşılaştır"

ALANLARI KARŞILAŞTIR:
  - Kullanıcı en fazla N alan seçer (prop: maks, Orta'da 2, İleri'de 3).
    Seçim store.karsilastirma'da tutulur.
  - Her alan için bir sütun: küçük GokyuzuGorunumu (200px), altında
    geri sayım ve ölçütler.
  - Hepsi aynı t anını ve aynı [tL, tL+D] aralığını kullanır.

TARİHLERİ KARŞILAŞTIR:
  - Tek alan, 2-3 farklı iniş tarihi (tarih seçicileri).
  - Her tarih için bir sütun, aynı düzen.

ALTTA ölçüt tablosu (her iki modda):
  satırlar: Aydınlanma %, İletişim %, En uzun karanlık, En uzun iletişim
  kesintisi, Puan
  Her satırda en iyi değer --gunes renginde, en kötüsü solgun.
  En üstte tek cümlelik sonuç: "Malapert Massif 30 günlük görevde %18
  daha fazla güneş alıyor."

Orta sayfadaki karşılaştırma kutusuna maks=2 ile yerleştir.
```

---

## Adım 10 — İleri Sayfa

```
src/sayfalar/Ileri.jsx ve src/bilesenler/ParametrePaneli.jsx yaz.

YERLEŞİM — sol kenar çubuğu (320px) + orta alan + sağ özet (280px):

SOL KENAR ÇUBUĞU (ParametrePaneli):
  "Konum"    : AlanListesi + OzelKoordinat
  "Zaman"    : iniş tarihi seçici, görev süresi D (7/30/90/180)
  "Donanım"  :
      hm        0 / 2 / 10 m
      epsilon   kaydırıcı 0-10°, adım 0.5
      S         sayı girişi, m²
      eta       kaydırıcı 0.10-0.45
      yonelim   izleyen / dikey / yatay
  "Puanlama" : w1, w2, w3 kaydırıcıları 0-2
  Her parametrenin yanında güncel değer ve birim.
  Bölümler katlanabilir (Framer Motion).

ORTA ALAN:
  GokyuzuGorunumu, ZamanCizelgesi, IsiHaritasi, Karsilastirma (maks=3)

SAĞ ÖZET:
  Geri sayım (gün batımı, gün doğumu, Dünya batışı, Dünya doğuşu)
  Ölçüt tablosu: f_bar, c_bar, tau_max, sigma_max, E (kWh), puan
  "CSV indir": seçili alan için zaman serisi
    (tarih, sun_alt, sun_az, earth_alt, earth_az, f, c, P)

Bilgi yoğunluğu yüksek: 13-14px, dar satır aralığı, az boşluk.
```

---

## Adım 11 — 3B Ay Küresi

```
src/bilesenler/AyKuresi.jsx yaz. react-three-fiber kullan.

SAHNE:
  - Ay küresi: SphereGeometry, yarıçap 1, 64 segment. Doku için NASA
    CGI Moon Kit renk haritası; dosya yoksa gri malzeme ile başla.
  - Yıldız arka planı: 3000 küçük beyaz nokta (Points), farklı parlaklık.
  - Işık: directionalLight; yönü efemeris.json'daki o anki Güneş
    alt-noktasından (sun_sub_lat, sun_sub_lon) hesaplansın. Böylece
    terminatör (gece-gündüz sınırı) doğru yerde olur.
  - Ortam ışığı çok zayıf (0.03).
  - bolgeler.json'daki bütün alanlar küre yüzeyinde küçük işaretçi.
    Seçili olan --gunes renginde ve büyük; diğerleri solgun beyaz.
    Yeni renk EKLEME; kategori farkı işaretçi şekliyle (daire, kare,
    üçgen, elmas) gösterilsin.
  - Varsayılan kamera güney kutbuna baksın.
  - OrbitControls: döndürme ve yakınlaştırma açık, kaydırma kapalı.

EFEKT: @react-three/postprocessing ile hafif Bloom
  (intensity 0.4, luminanceThreshold 0.8).

DAVRANIŞ:
  - İşaretçiye tıklayınca seciliAlan güncellensin.
  - Zaman kaydırıcısı oynadıkça ışık yönü güncellensin.
  - Kamera seçili alana yumuşak geçişle yönelsin.

Performans: 60 fps altına düşerse segment ve yıldız sayısını azalt.
Orta ve İleri sayfalarına küçük bir "3B görünüm" düğmesiyle açılan
panel olarak ekle.
```

---

## Adım 12 — Giriş Ekranı

```
src/sayfalar/Giris.jsx yaz.

TAM EKRAN, ortalanmış:
  Arka planda AyKuresi yavaşça dönsün; üstüne koyu katman
  (opaklık 0.5) binsin ki metin okunsun.

  Ortada:
    Başlık: "Ay İniş Alanı Navigatörü" — büyük, font-light
    Alt başlık: "Güneş ve Dünya, Ay'ın neresinden nasıl görünür?"

  Altında yan yana üç kart (her biri 280px):
    1. "Keşfetmek istiyorum"
       Ay'da güneş ve iletişim koşullarını basitçe görün.   → temel
    2. "Ders anlatıyorum"
       Alanları ve zamanları karşılaştırarak öğretin.        → orta
    3. "Görev planlıyorum"
       Donanım parametreleriyle alan ve tarih değerlendirin. → ileri

  Kartlar: --yuzey arkaplan, ince kenarlık; üzerine gelince hafif
  yükselsin, kenarlık --gunes olsun (Framer Motion).
  Seçilince mod store'a yazılsın, ilgili sayfaya yumuşak geçiş.

Her sayfanın sağ üst köşesine küçük mod değiştirme düğmesi ekle —
giriş ekranına dönmeden mod değiştirilebilsin.
```

---

## Son Adım — Dağıtım

```
Projeyi üretim için derle ve Vercel'e dağıtıma hazırla.

- vite.config.js'de base yolunu ayarla
- public/veri/ altındaki JSON dosyalarının doğru servis edildiğini
  kontrol et
- README.md yaz: projenin ne yaptığı, nasıl çalıştırılacağı, kullanılan
  NASA veri kaynakları ve kütüphaneler
- Space Apps kuralları gereği kullanılan bütün kaynakları README'de
  listele (NASA SPICE, LOLA DEM, CGI Moon Kit, Three.js, D3 ...)
- Yapay zekâ kullanımını README'de belirt
- Sahte veri hâlâ kullanılıyorsa arayüzde ve README'de açıkça belirt

Derleme boyutunu ve varsa uyarıları söyle.
```

---

## Gerçek Veri Geldiğinde

Arkadaşından istenecekler (CLAUDE.md bölüm 4'e birebir uyacak):

- 24 alan dosyası (bölüm 4.1) — bölüm 10'daki alanlar için
- `efemeris.json` (bölüm 4.3) — SPICE `subpnt` ile Güneş ve Dünya
  alt-noktaları
- `bolgeler.json` (bölüm 4.2) — doğrulanmış koordinatlarla

```
Hesap ekibinden gelen gerçek dosyaları public/veri/ altına koy
(sahte dosyaların üstüne).

Sonra şu doğrulamayı yap ve sonucu söyle:
  - Açılar derece mi (radyan değil)?
  - Azimut 0-360 aralığında mı?
  - horizon dizileri 360, zaman dizileri n elemanlı mı?
  - Malapert Massif için bir yıllık earth_alt: yaklaşık 27 günlük
    salınım ve çoğunlukla ufkun üstünde mi?
  - Apollo 11 earth_alt her zaman yüksek (≈ +55° üstü) mi?
  - Chang'e 4 earth_alt her zaman negatif mi?
  - ozelNoktaOlustur(0.674, 23.473) ile apollo_11.json'ın sun_alt
    değerleri arasındaki en büyük fark kaç derece? (1°'nin altında
    olmalı; Güneş paralaksı ihmal edilebilir.)

Sonra npm run veri:ozet ile ozet.json'u gerçek veriden yeniden üret.
```
