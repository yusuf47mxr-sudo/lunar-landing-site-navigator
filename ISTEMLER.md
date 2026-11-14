# Claude Code İstemleri — Adım Adım

Her adımı sırayla uygula. Bir adım bitince çalıştır, gör, `git commit` at,
sonra diğerine geç. İstemleri olduğu gibi kopyalayabilirsin.

**Başlamadan önce:** `CLAUDE.md` dosyasını proje kök dizinine koy. Claude
Code her oturumda onu okuyacak, bu yüzden istemlerde yığını ve renkleri
tekrar yazmana gerek yok.

---

## Adım 1 — İskelet

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

## Adım 2 — Sahte Veri Üreteci

```
src/core/sahteVeri.js dosyasını yaz.

CLAUDE.md bölüm 10'daki 9 aday bölge için, bölüm 4'teki veri sözleşmesine
tam uyan JSON nesneleri üretecek. Veri rastgele değil, fiziksel olarak
gerçekçi olacak:

GÜNEŞ YÜKSEKLİĞİ:
  delta_sun(t) = 1.54 * sin(2*PI*t / 346.6_gun)
  H(t) = 2*PI*t / 27.32_gun + lon_radyan
  sun_alt = asin( sin(lat)*sin(delta_sun) + cos(lat)*cos(delta_sun)*cos(H) )

GÜNEŞ AZİMUTU: standart altazimut dönüşümü, 0=kuzey, saat yönünde artan.

DÜNYA YÜKSEKLİĞİ (librasyon):
  delta_earth(t) = 6.7 * sin(2*PI*t / 27.2_gun)
  lambda_earth(t) = 7.9 * sin(2*PI*t / 27.5_gun)
  earth_alt = asin( sin(lat)*sin(delta_earth)
                    + cos(lat)*cos(delta_earth)*cos(lambda_earth - lon) )

DÜNYA AZİMUTU: aynı dönüşüm.

UFUK PROFİLİ H(A), her mast_height için ayrı:
  3-5 adet Gauss tümsekinin toplamı,
  H(A) = toplam_i( a_i * exp( -(A - A_i)^2 / (2*sigma_i^2) ) )
  a_i: 1-6 derece arası, A_i: rastgele azimut, sigma_i: 20-60 derece.
  Her bölge için sabit bir tohum (seed) kullan ki her çalıştırmada aynı
  profil çıksın. mast_height arttıkça profil hafifçe alçalsın
  (10 m için yaklaşık %30 düşük).

Zaman aralığı: 2027-01-01'den başlayarak 8760 saat (1 yıl), dt = 1 saat.

Ayrıca ozet.json üretecek bir fonksiyon yaz: haftalık iniş tarihleri
(52 adet) ve D=30 gün için her bölgenin f_bar, c_bar, tau_max_h
değerlerini hesaplasın.

Çıktıları public/veri/ altına yazan bir node betiği de ekle.
Betiği çalıştır ve üretilen dosyaların boyutunu söyle.
```

---

## Adım 3 — Hesap Modülü ve Durum Deposu

```
İki dosya yaz:

1) src/core/hesap.js
   CLAUDE.md bölüm 5'teki bütün formülleri uygula:
   - ufukOku(horizon, azimut)  → döngüsel doğrusal ara değer
   - gunesOrani(sunAlt, sunAz, horizon)  → f(t), Float32Array döner
   - iletisimDurumu(earthAlt, earthAz, horizon, epsilon)  → c(t)
   - guc(f, sunAlt, eta, S, yonelim)  → P(t)
   - olcutler(f, c, P, tL, D, dt, w1, w2, w3)
     → { fBar, cBar, tauMax, sigmaMax, E, puan }

   Bütün diziler Float32Array olsun. Döngülerde ara nesne yaratma.

2) src/durum/store.js
   CLAUDE.md bölüm 6'daki şemaya göre Zustand deposu.
   Türetilmiş değerleri SAKLAMA; bunun yerine seçili alanın verisini ve
   parametreleri okuyup hesap.js'i çağıran bir useOlcutler() kancası yaz.

src/core/veri.js de yaz: public/veri/ altından JSON yükler, yüklenen
alanları bellekte önbellekler.

Konsola Malapert Massif için fBar, cBar ve tauMax değerlerini yazdıran
küçük bir test ekle ve sonucu söyle. Beklenen: fBar 0.6-0.9 arası,
cBar 0.7-1.0 arası.
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
  sunTrail, earthTrail : son 48 saatin [az, alt] çiftleri (isteğe bağlı)

ÇİZİM:
  Yatay eksen: azimut 0-360 derece. Altta N / D / G / B etiketleri.
  Dikey eksen: yükseklik -15 ile +15 derece. Sol kenarda derece etiketleri.

  1. Zemin: --zemin rengi.
  2. Hafif ızgara: her 30 derece azimut, her 5 derece yükseklik,
     --cizgi renginde ince çizgi.
  3. Ufuk çizgisi (yükseklik 0): biraz daha belirgin yatay çizgi.
  4. Ufuk profili H(A): dolu alan olarak çiz, aşağısı tamamen dolu,
     rengi --yuzey-acik, üst kenarı --cizgi.
  5. Güneş: --gunes renginde dolu daire, yarıçap 10px, etrafında yumuşak
     parlama (radial gradient). Ufkun altındaysa %25 opaklıkla çiz.
  6. Dünya: --iletisim renginde dolu daire, yarıçap 8px. Ufkun
     altındaysa %25 opaklık.
  7. İzler verilmişse: her ikisinin son konumlarını soluk, incelen
     çizgiyle bağla.
  8. Sağ üstte küçük açıklama: sarı nokta "Güneş", mavi nokta "Dünya".

DAVRANIŞ:
  - Kapsayıcıya göre boyutlanır (ResizeObserver), devicePixelRatio'ya
    uyar, yüksek çözünürlükte bulanık olmaz.
  - Değerler değişince yumuşak geçsin: konumları 150 ms'lik lerp ile
    takip et, requestAnimationFrame kullan.
  - Fare üzerine gelince o noktadaki azimut ve ufuk yüksekliğini küçük
    bir etiketle göster.

Bileşeni tek başına test eden geçici bir sayfa yap, sahte veriyle
çalıştır ve nasıl göründüğünü tarif et.
```

---

## Adım 5 — Temel Sayfa

```
src/sayfalar/Temel.jsx yaz.

YERLEŞİM (tek sütun, ortalanmış, maksimum genişlik 900px):

  1. Üstte: 9 bölge için yatay kaydırılabilir kart şeridi.
     Her kart: bölge adı (font-light), altında enlem/boylam küçük ve
     solgun. Seçili kartın kenarlığı --gunes rengi.

  2. Ortada: GokyuzuGorunumu, yüksekliği 380px, tam genişlik.

  3. Altında: yan yana iki büyük rozet.
     Sol rozet — Güneş:
       f > 0.5 ise: --gunes rengi, "Güneş görünür"
       0 < f <= 0.5 ise: soluk sarı, "Güneş kısmen görünür"
       f = 0 ise: gri, "Gölgede"
     Sağ rozet — İletişim:
       c = 1 ise: --iletisim rengi, "Dünya ile bağlantı var"
       c = 0 ise: gri, "Bağlantı yok"
     Rozetler büyük olsun: en az 100px yükseklik, 20px yazı.

  4. En altta: kalın zaman kaydırıcısı. Solunda oynat/durdur düğmesi,
     üstünde o anki tarih (örn. "14 Mart 2027, 08:00 UTC").

BAŞKA HİÇBİR ŞEY GÖSTERME. Sayı yok, parametre yok, grafik yok.

Rozet renk geçişleri Framer Motion ile yumuşak olsun.
```

---

## Adım 6 — Zaman Çizelgesi

```
src/bilesenler/ZamanCizelgesi.jsx yaz. Canvas 2D.

GİRDİLER: f (Float32Array), c (Float32Array), t0, dtHours, tSecili, D, tL

ÇİZİM — iki yatay şerit, üst üste:

  Üst şerit "Aydınlanma", yükseklik 28px:
    Her zaman adımı bir dikey piksel sütunu.
    f = 1 → --gunes, f = 0 → --zemin, arası ara renk.

  Alt şerit "İletişim", yükseklik 28px:
    c = 1 → --iletisim, c = 0 → --zemin.

  Şeritlerin solunda etiketler, solgun renkte.

  Görev aralığı [tL, tL+D] dışındaki kısım %30 opaklıkla soluklaşsın.

  Seçili an tSecili: dikey beyaz çizgi, üstünde küçük üçgen işaret.

  En uzun karanlık (tauMax) ve en uzun iletişim kesintisi (sigmaMax)
  aralıklarının üstüne ince --uyari renginde çizgi çek ve süreyi yaz
  (örn. "62 sa").

  Alt kenarda ay isimleri (Oca, Şub, ...).

DAVRANIŞ:
  - Tıklayınca o ana atla (tSecili güncellensin).
  - Sürükleyince takip etsin.
  - Fare üzerinde ince dikey kılavuz çizgi ve tarih etiketi.

Dizi uzunluğu piksel sayısından büyükse, her piksel için o aralığın
ortalamasını al (downsampling).
```

---

## Adım 7 — Orta Sayfa

```
src/sayfalar/Orta.jsx yaz.

YERLEŞİM — iki sütun (sol 380px sabit, sağ esnek):

SOL SÜTUN:
  - Bölge listesi (dikey, 9 bölge, seçilebilir)
  - Görev süresi D: 7 / 30 / 90 / 180 gün düğmeleri
  - Direk yüksekliği hm: 0 / 2 / 10 m düğmeleri
  - Sayısal özet kutusu:
      Güneş yüksekliği      +2.3°
      Dünya yüksekliği      −1.1°
      Aydınlanma oranı      %82
      İletişim oranı        %91
      En uzun karanlık      62 sa
    Sayılar tabular-nums, değişince Framer Motion ile akarak güncellensin.

SAĞ SÜTUN:
  - GokyuzuGorunumu (yükseklik 340px)
  - ZamanCizelgesi (altında)
  - ZamanKaydirici (en altta, kalıcı)

Sayfa altında tam genişlikte IsiHaritasi için yer ayır; şimdilik boş
kutu bırak, Adım 8'de doldurulacak.
```

---

## Adım 8 — Isı Haritası

```
src/bilesenler/IsiHaritasi.jsx yaz. Canvas 2D.

VERİ: public/veri/ozet.json

ÇİZİM:
  Satırlar: 9 bölge (solda isimleri)
  Sütunlar: 52 haftalık iniş tarihi (altta ay isimleri)
  Hücre rengi: puan değerine göre.

  Renk ölçeği: düşük puan --zemin, yüksek puan --gunes.
  Sürekli bir gradyan kullan, 5-6 basamaklı değil.

  Hücreye fare gelince: o bölge ve tarih için küçük bir kutu çıksın —
  bölge adı, tarih, aydınlanma %, iletişim %, en uzun karanlık.

  Hücreye tıklayınca: seciliAlan ve tL güncellensin, diğer bileşenler
  o duruma geçsin.

  Seçili hücrenin kenarlığı beyaz.

  Sağ üstte renk ölçeği açıklaması (düşük → yüksek).

Puan hesabı store'daki w1, w2, w3 ağırlıklarıyla anlık yapılsın;
ağırlıklar değişince ısı haritası yeniden çizilsin.
```

---

## Adım 9 — İleri Sayfa

```
src/sayfalar/Ileri.jsx ve src/bilesenler/ParametrePaneli.jsx yaz.

YERLEŞİM — sol kenar çubuğu (320px) + orta alan + sağ özet (280px):

SOL KENAR ÇUBUĞU (ParametrePaneli):
  Bölüm "Konum"   : bölge listesi, ayrıca enlem/boylam elle girişi
  Bölüm "Zaman"   : iniş tarihi seçici, görev süresi D
  Bölüm "Donanım" :
      hm        0 / 2 / 10 m düğmeleri
      epsilon   kaydırıcı 0-10°, adım 0.5
      S         sayı girişi, m²
      eta       kaydırıcı 0.10-0.45
      yonelim   izleyen / dikey / yatay
  Bölüm "Puanlama":
      w1, w2, w3 kaydırıcıları 0-2 arası

  Her parametrenin yanında güncel değeri ve birimi yazsın.
  Bölümler katlanabilir olsun (Framer Motion ile açılıp kapansın).

ORTA ALAN:
  GokyuzuGorunumu, ZamanCizelgesi, IsiHaritasi alt alta.

SAĞ ÖZET:
  Bütün ölçütler tablo hâlinde:
    f_bar, c_bar, tau_max, sigma_max, E (kWh), puan
  Altında "CSV indir" düğmesi: seçili alan için zaman serisini
  (tarih, sun_alt, sun_az, earth_alt, earth_az, f, c, P) dışa aktarsın.

Bilgi yoğunluğu yüksek olsun: küçük punto (13-14px), dar satır aralığı,
az boşluk. Temel sayfanın tersi bir karakter.
```

---

## Adım 10 — 3B Ay Küresi

```
src/bilesenler/AyKuresi.jsx yaz. react-three-fiber kullan.

SAHNE:
  - Ay küresi: SphereGeometry, yarıçap 1, 64 segment.
    Doku için NASA CGI Moon Kit renk haritasını kullan; dosya yoksa
    gri bir malzeme ve basit normal map ile başla, sonra eklenir.
  - Yıldız arka planı: 3000 adet rastgele konumlu Points, küçük beyaz
    noktalar, hafif farklı parlaklıklarda.
  - Işık: directionalLight, yönü store'daki o anki Güneş azimut ve
    yüksekliğinden hesaplansın. Böylece terminatör (gece-gündüz sınırı)
    gerçek konumda olur.
  - Ortam ışığı çok zayıf (0.03) olsun ki gece tarafı gerçekten karanlık
    görünsün.
  - 9 aday bölge için küre yüzeyinde küçük işaretçiler. Seçili olan
    --gunes renginde ve biraz büyük, diğerleri solgun.
  - Kamera varsayılan olarak güney kutbuna baksın.
  - OrbitControls: döndürme ve yakınlaştırma açık, kaydırma kapalı.

EFEKT:
  @react-three/postprocessing ile hafif Bloom ekle (intensity 0.4,
  luminanceThreshold 0.8). Abartma.

DAVRANIŞ:
  - İşaretçiye tıklayınca seciliAlan güncellensin.
  - Zaman kaydırıcısı oynadıkça ışık yönü güncellensin, terminatör
    yüzeyde ilerlesin.
  - Kamera seçili bölgeye yumuşak geçişle yönelsin.

Performans: 60 fps altına düşerse segment sayısını ve yıldız sayısını
azalt.
```

---

## Adım 11 — Giriş Ekranı

```
src/sayfalar/Giris.jsx yaz.

TAM EKRAN, ortalanmış:

  Arka planda AyKuresi yavaşça dönsün, üstüne koyu bir katman binsin
  (opaklık 0.5) ki metin okunsun.

  Ortada:
    Başlık: "Ay İniş Alanı Navigatörü" — büyük, font-light
    Alt başlık: tek cümlelik açıklama, solgun renk

  Altında yan yana üç kart (her biri 280px):

    1. "Keşfetmek istiyorum"
       Ay'ın güney kutbunda güneş ve iletişim koşullarını basitçe görün.
       → temel modu

    2. "Ders anlatıyorum"
       Aydınlanma ve iletişim pencerelerini zaman içinde karşılaştırın.
       → orta modu

    3. "Görev planlıyorum"
       Donanım parametreleriyle alanları ve tarihleri değerlendirin.
       → ileri modu

  Kartlar: --yuzey arkaplan, ince kenarlık, üzerine gelince hafif
  yükselsin ve kenarlığı --gunes olsun. Framer Motion ile.

  Kart seçilince mod store'a yazılsın ve ilgili sayfaya yumuşak geçişle
  gidilsin.

Ayrıca her sayfanın sağ üst köşesine küçük bir mod değiştirme düğmesi
ekle — giriş ekranına dönmeden mod değiştirilebilsin.
```

---

## Son Adım — Dağıtım

```
Projeyi üretim için derle ve Vercel'e dağıtıma hazırla.

- vite.config.js'de base yolunu ayarla
- Büyük JSON dosyalarının public/ altından doğru servis edildiğini
  kontrol et
- README.md yaz: projenin ne yaptığı, nasıl çalıştırılacağı, kullanılan
  NASA veri kaynakları ve kütüphaneler
- Space Apps kuralları gereği kullanılan bütün kaynakları README'de
  listele (NASA SPICE, LOLA DEM, CGI Moon Kit, Three.js, D3 ...)
- Yapay zekâ kullanımını da README'de belirt

Derleme boyutunu ve varsa uyarıları söyle.
```

---

## Gerçek Veri Geldiğinde

```
Hesap ekibinden gelen gerçek JSON dosyalarını public/veri/ altına koy.

src/core/veri.js içinde sahteVeri.js yerine gerçek dosyaları okuyacak
şekilde tek satırlık değişiklik yap.

Sonra şu doğrulamayı yap ve sonucu söyle:
  Malapert Massif için bir yıllık earth_alt grafiğini çiz.
  Dünya'nın yaklaşık 27 günlük dönemle salınması ve çoğunlukla ufkun
  üstünde kalması bekleniyor. Böyle değilse veride sorun var demektir.

Ayrıca kontrol et:
  - Açılar derece mi (radyan değil)?
  - Azimut 0-360 aralığında mı?
  - horizon dizileri 360 elemanlı mı?
  - Zaman dizilerinin uzunluğu n ile uyuşuyor mu?
```
