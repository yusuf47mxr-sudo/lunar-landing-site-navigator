# Ay İniş Alanı Navigatörü — Proje Kuralları

Bu dosya projenin kalıcı kurallarını içerir. Her oturumda okunur ve
burada yazanlara uyulur.

---

## 1. Proje Nedir

NASA Space Apps Challenge 2026 — "Landing Site Navigator" (Ay İniş Sitesi
Navigatörü) meydan okuması için geliştirilen web uygulaması.

**Amaç:** Ay'ın güney kutbundaki aday iniş alanları için, seçilen konum ve
tarihte Güneş ve Dünya'nın ufka göre konumunu görselleştirmek. Böylece
kullanıcı iki soruya cevap bulur:

1. **Enerji:** Güneş ufkun üstünde mi? Ne kadar güç üretilir?
2. **İletişim:** Dünya görünüyor mu? Doğrudan radyo bağlantısı kurulabilir mi?

**Hedef kitle:** Görev planlayıcıları, eğitimciler ve meraklılar. Bu yüzden
uygulama üç ayrı moda sahiptir.

**Challenge'ın asıl şikâyeti:** Mevcut araçlar güçlü ama arayüzleri karmaşık.
Bu projenin katkısı yeni bir hesap yöntemi değil, **anlaşılır bir arayüzdür.**
Her tasarım kararında bu hatırlanmalı.

---

## 2. Teknoloji Yığını

| Katman | Seçim |
|---|---|
| Çatı | React + Vite |
| Stil | Tailwind CSS |
| Durum yönetimi | Zustand |
| 3B | react-three-fiber (@react-three/fiber, @react-three/drei) |
| 3B efekt | @react-three/postprocessing (bloom) |
| 2B çizim | Canvas 2D API ve/veya D3 |
| Harita projeksiyonu | d3-geo (stereografik) |
| Animasyon | Framer Motion |
| Dağıtım | Vercel veya GitHub Pages |

**Kullanılmayacaklar:** Plotly, Chart.js veya benzeri hazır grafik
kütüphaneleri. Grafikler özel çizimdir, tam kontrol gerekir.

---

## 3. Klasör Yapısı

```
/src
  /core
    hesap.js          f(t), c(t), ortalamalar, puan hesabı
    veri.js           JSON yükleme ve önbellekleme
    sahteVeri.js      Test için fiziksel olarak gerçekçi veri üretimi
    sabitler.js       Fiziksel sabitler ve varsayılan parametreler
  /bilesenler
    GokyuzuGorunumu.jsx
    ZamanCizelgesi.jsx
    IsiHaritasi.jsx
    KutupHaritasi.jsx
    AyKuresi.jsx
    DurumGostergesi.jsx
    ZamanKaydirici.jsx
    ParametrePaneli.jsx
    AlanKarti.jsx
  /sayfalar
    Giris.jsx
    Temel.jsx
    Orta.jsx
    Ileri.jsx
  /durum
    store.js          Zustand deposu
  App.jsx
  main.jsx
/public
  /veri
    malapert_massif.json
    haworth.json
    ...
    ozet.json         Isı haritası için önceden hesaplanmış özet
```

**Kural:** Üç sayfa aynı bileşenleri kullanır. Bileşen kodu asla
kopyalanmaz; sadece hangi bileşenin, hangi boyutta ve hangi sırada
dizildiği değişir.

---

## 4. Veri Sözleşmesi

Hesap ekibi her aday alan için şu yapıda bir JSON dosyası üretir.
Arayüz **sadece** bu yapıyı bilir.

```json
{
  "site": "Malapert Massif",
  "lat": -86.0,
  "lon": 2.7,
  "mast_heights_m": [0, 2, 10],
  "horizon": {
    "0":  [2.1, 2.3, 2.4, "... 360 eleman"],
    "2":  [1.9, 2.1, 2.2, "... 360 eleman"],
    "10": [1.4, 1.6, 1.7, "... 360 eleman"]
  },
  "t0": "2027-01-01T00:00:00Z",
  "dt_hours": 1,
  "n": 8760,
  "sun_alt":   [2.1, 2.0, 1.8, "... n eleman"],
  "sun_az":    [147.2, 148.9, "... n eleman"],
  "earth_alt": [-1.2, -1.1, "... n eleman"],
  "earth_az":  [31.5, 31.6, "... n eleman"]
}
```

**Birim ve yön kuralları:**

- Bütün açılar **derece** cinsindendir (radyan değil)
- Azimut: `0°` = kuzey, saat yönünde artar, aralık `[0, 360)`
- `horizon` dizileri `0°` azimuttan başlar, `1°` adımla ilerler, 360 eleman
- Yükseklik (altitude): ufuk düzleminden yukarısı pozitif
- Zaman dizileri düzgün aralıklıdır; `t0` ve `dt_hours` ile hesaplanır

**Özet dosyası** (`ozet.json`) ısı haritası için:

```json
{
  "landing_dates": ["2027-01-01", "2027-01-08", "..."],
  "mission_days": 30,
  "sites": {
    "Malapert Massif": {
      "f_bar": [0.82, 0.84, "..."],
      "c_bar": [0.91, 0.90, "..."],
      "tau_max_h": [48, 42, "..."]
    }
  }
}
```

---

## 5. Hesap Formülleri

Arayüz tarafında, tarayıcıda hesaplanır. Sunucuya istek atılmaz.

**Güneş diskinin görünen oranı** (ρ = 0.266° Güneş açısal yarıçapı):

```
f(t) = clamp( (sun_alt[t] + 0.266 - H(sun_az[t])) / 0.532, 0, 1 )
```

**İletişim durumu** (ε = kullanıcının ayarladığı güvenlik payı):

```
c(t) = earth_alt[t] > H(earth_az[t]) + epsilon  ?  1 : 0
```

**Anlık güç** (P0 = 1361 W/m², η = verim, S = alan):

```
P(t) = 1361 * eta * S * f(t)            // Güneş'i izleyen panel
P(t) = 1361 * eta * S * f(t) * sin(h)   // yatay panel
P(t) = 1361 * eta * S * f(t) * cos(h)   // dikey panel
```

**Dönem ölçütleri**, `[tL, tL + D]` aralığında:

```
f_bar     = ortalama(f)
c_bar     = ortalama(c)
tau_max   = f == 0 olan en uzun ardışık dizi uzunluğu (saat)
sigma_max = c == 0 olan en uzun ardışık dizi uzunluğu (saat)
E         = toplam(P) * dt
puan      = w1*f_bar + w2*c_bar - w3*(tau_max / (D*24))
```

**H(A) okuması:** Azimut kesirli olabilir; iki komşu derece arasında
doğrusal ara değer kullanılır. Dizi döngüseldir: `H(359.5°)` için
`horizon[359]` ve `horizon[0]` arasında ara değer alınır.

**Performans kuralı:** Bütün hesaplar `Float32Array` üzerinde yapılır.
`mast_height` dışındaki hiçbir parametre ufuk profilini değiştirmez; o
yüzden parametre oynatıldığında veri yeniden yüklenmez, sadece diziler
yeniden taranır.

---

## 6. Durum Şeması (Zustand)

```js
{
  // Mod
  mod: 'temel' | 'orta' | 'ileri',

  // Bağımsız değişkenler
  seciliAlan: 'Malapert Massif',
  t: 0,              // zaman dizisindeki indeks
  tL: 0,             // iniş tarihi indeksi
  D: 30,             // görev süresi (gün)

  // Mühendislik parametreleri
  hm: 2,             // direk yüksekliği (m) — 0, 2 veya 10
  epsilon: 2,        // iletişim güvenlik payı (derece)
  S: 1,              // panel alanı (m²)
  eta: 0.30,         // panel verimi
  yonelim: 'izleyen' | 'dikey' | 'yatay',
  w1: 1, w2: 1, w3: 1,   // puan ağırlıkları

  // Oynatma
  oynatiliyor: false,
  hiz: 1,
}
```

**Türetilmiş değerler saklanmaz.** `f(t)`, `c(t)`, ortalamalar ve puan her
render'da hesaplanır. 8760 elemanlı dizide bu işlem milisaniyeler sürer.

---

## 7. Üç Mod

Giriş ekranında kullanıcı birini seçer. Sonradan üst köşedeki düğmeyle
değiştirilebilir — giriş ekranına dönmek gerekmez.

| Özellik | Temel | Orta | İleri |
|---|:--:|:--:|:--:|
| Hazır alan listesi (9 bölge) | ✓ | ✓ | ✓ |
| Gökyüzü görünümü | ✓ | ✓ | ✓ |
| Zaman kaydırıcısı | ✓ | ✓ | ✓ |
| Durum göstergesi | sözel | sayısal | sayısal |
| Haritadan serbest nokta seçimi | — | ✓ | ✓ |
| Zaman çizelgesi | — | ✓ | ✓ |
| Isı haritası | — | ✓ | ✓ |
| Görev süresi `D` | — | ✓ | ✓ |
| Direk yüksekliği `hm` | — | ✓ | ✓ |
| `epsilon`, `S`, `eta`, yönelim | — | — | ✓ |
| Puan ağırlıkları `w1,w2,w3` | — | — | ✓ |
| CSV indirme | — | — | ✓ |

**Sayfa karakterleri:**

- **Temel** — Tek sütun, büyük puntolar, bol boşluk. Dev gökyüzü görünümü,
  altında iki büyük rozet. Başka hiçbir şey yok.
- **Orta** — İki sütun. Solda harita ve seçimler, sağda gökyüzü görünümü ve
  zaman çizelgesi. Altta ısı haritası.
- **İleri** — Sol kenar çubuğunda bütün parametreler, ortada grafikler,
  sağda sayısal özet ve dışa aktarma. Bilgi yoğunluğu yüksek.

---

## 8. Tasarım İlkeleri

NASA Eyes on the Solar System'ın görsel dilinden esinlenilmiştir.

1. **Sahne önce, panel sonra.** Görsel ekranı kaplar; kontroller üstüne
   yarı saydam katman olarak biner, yan yana durmaz.
2. **Zaman her zaman görünür.** Zaman kaydırıcısı kalıcıdır, hiçbir
   panelin içine gizlenmez.
3. **Renk az, vurgu tek.** Koyu zemin, gri-beyaz metin, iki vurgu rengi
   (Güneş ve iletişim). Üçüncü renk kullanılmaz.
4. **Geçişler yumuşak.** Değerler zıplamaz, akar. Framer Motion kullanılır.
5. **Bilgi kademeli.** Önce isim, tıklayınca özet, sonra ayrıntı.
6. **Tipografi ince.** Başlıklarda `font-light`, harf aralığı biraz açık.
   Kalın yazı tipi kullanılmaz.

---

## 9. Renk Paleti

```css
--zemin:        #070B14   /* en arka plan */
--yuzey:        #0E1524   /* panel arkaplanı */
--yuzey-acik:   #16203A   /* kart, hover */
--cizgi:        #1F2B45   /* kenarlık, ızgara */
--metin:        #E6EDF7   /* ana metin */
--metin-solgun: #8A97AC   /* ikincil metin, etiket */

--gunes:        #F5A524   /* Güneş, aydınlanma, enerji */
--gunes-soluk:  #6B4A12   /* aydınlık şerit arkaplanı */
--iletisim:     #22D3EE   /* Dünya, iletişim penceresi */
--iletisim-soluk: #0E4A55

--uyari:        #EF4444   /* kritik durum, uzun karanlık */
```

**Tipografi:** Başlıklar için `Inter` veya `Space Grotesk`, sayılar için
tabular (sabit genişlikli) rakam ayarı. Sayılar değişirken genişlik
oynamamalı.

---

## 10. Aday İniş Bölgeleri

NASA'nın Artemis III için açıkladığı 9 bölge. Koordinatlar yaklaşıktır,
gerçek veri geldiğinde JSON dosyalarındaki değerler esastır.

| Bölge | Enlem | Boylam |
|---|---|---|
| Peak near Cabeus B | −82.2° | 326.0° |
| Haworth | −87.5° | 355.0° |
| Malapert Massif | −86.0° | 2.7° |
| Mons Mouton | −84.3° | 160.0° |
| Mons Mouton Plateau | −84.6° | 161.0° |
| Nobile Rim 1 | −85.4° | 32.0° |
| Nobile Rim 2 | −84.8° | 50.0° |
| de Gerlache Rim 2 | −88.5° | 290.0° |
| Slater Plain | −88.1° | 5.0° |

---

## 11. Çalışma Kuralları

- **Her adımda git commit at.** Çalışan her hâl kaydedilir.
- **Bir seferde bir bileşen.** Çok sayıda dosya aynı anda değiştirilmez.
- **Sahte veriyle geliştir.** `sahteVeri.js` gerçek verinin yerine geçer;
  gerçek dosyalar gelince sadece `veri.js` içindeki yol değişir.
- **Eksen sınırları sabit.** Yükseklik ekseni `−15°…+15°`, azimut
  `0°…360°`, puan `0…1`. Gerçek veri gelince ölçek sürprizi olmaz.
- **Türkçe isimlendirme.** Bileşen ve değişken adları Türkçe; JSON alan
  adları İngilizce (veri sözleşmesi öyle kararlaştırıldı).
- **Dosya boyutu.** Her alan ayrı JSON; sadece seçili alan yüklenir.
  Isı haritası `ozet.json`'dan beslenir.

---

## 12. Öncelik Sırası

Süre biterse listenin sonundakiler eksik kalır, gerisi ayakta durur.

1. İskelet (Vite + React + Tailwind, koyu tema)
2. Sahte veri üreteci
3. Durum deposu (Zustand)
4. Gökyüzü görünümü ← **en kritik parça**
5. Temel sayfa
6. Zaman çizelgesi
7. Orta sayfa
8. Isı haritası
9. İleri sayfa
10. 3B Ay küresi
11. Giriş ekranı

**Not:** 3B küre listenin sonundadır. Etkileyicidir ama zorunlu değildir;
asıl bilgi 2B gökyüzü görünümünde verilir.
