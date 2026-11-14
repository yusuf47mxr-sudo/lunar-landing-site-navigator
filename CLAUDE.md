# Ay İniş Alanı Navigatörü — Proje Kuralları

Bu dosya projenin kalıcı kurallarını içerir. Her oturumda okunur ve
burada yazanlara uyulur.

---

## 1. Proje Nedir

NASA Space Apps Challenge 2026 — "Landing Site Navigator" (Ay İniş Sitesi
Navigatörü) meydan okuması için geliştirilen web uygulaması.

**Amaç:** Seçilen iniş alanı ve tarihte Güneş ve Dünya'nın ufka göre
konumunu görselleştirmek. Kullanıcı şu sorulara hızlıca cevap bulur:

1. **Enerji:** Güneş ufkun üstünde mi, kaç derece yükseklikte, ne kadar
   güç üretilir?
2. **İletişim:** Dünya görünüyor mu? Doğrudan radyo bağlantısı var mı?
3. **Zamanlama:** Gün batımına ve Dünya batışına (Earthset) ne kadar
   kaldı? Challenge bunu "kritik operasyonel bilgi" olarak iki kez vurgular.
4. **Karşılaştırma:** Başka bir alan veya başka bir tarih seçilse ne değişir?

**Alan kapsamı:** Ağırlık Ay'ın güney kutbunda, ama liste Apollo alanlarını,
CLPS görevlerini ve diğer ülkelerin iniş alanlarını da içerir. Kullanıcı
kendi koordinatını da girebilir. Ekvator ile kutup arasındaki fark, kutbun
neden zor olduğunu en iyi gösteren şeydir.

**Hedef kitle:** Görev planlayıcıları, eğitimciler ve meraklılar (çocuklar
dahil). Bu yüzden uygulamanın üç ayrı modu vardır.

**Challenge'ın asıl şikâyeti:** Quickmap, Moon Trek ve JPL Horizons gibi
araçlar güçlü ama uzman olmayanlar için kullanımı zor. Bu projenin katkısı
yeni bir hesap yöntemi değil, **anlaşılır bir arayüzdür.** Her tasarım
kararında bu hatırlanmalı.

---

## 2. Teknoloji Yığını

| Katman | Seçim |
|---|---|
| Çatı | React + Vite |
| Stil | Tailwind CSS 3 |
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
    efemeris.js       altAz(): alt-noktadan yükseklik/azimut hesabı
    hesap.js          f(t), c(t), ortalamalar, puan, geri sayım
    ozelNokta.js      Özel koordinat için yaklaşık veri üretimi
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
    GeriSayim.jsx
    AyDunyaKarti.jsx
    Karsilastirma.jsx
    ZamanKaydirici.jsx
    ParametrePaneli.jsx
    AlanListesi.jsx
    OzelKoordinat.jsx     Özel koordinat girişi (yaklaşık veri)
    ModDegistirici.jsx    Temel / Orta / İleri geçişi
    Secenekler.jsx        Parçalı düğme (tek seçim)
    AkanSayi.jsx          Değişirken akan sayı
    GokyuzuKutusu.jsx     Depoya bağlı gökyüzü görünümü + uyarı
    SayisalOzet.jsx       Anlık ve görev aralığı sayıları
    tuval.js              Canvas bileşenlerinin ortak yardımcıları
  /sayfalar
    Giris.jsx
    Temel.jsx
    Orta.jsx
    Ileri.jsx
  /durum
    store.js          Zustand deposu
  App.jsx
  main.jsx
/scripts
  sahteVeriUret.mjs   Test verisini public/veri/ altına yazar
  ozetUret.mjs        hesap.js ile ozet.json üretir
/public
  /veri
    bolgeler.json     Bütün alanların listesi
    efemeris.json     Güneş ve Dünya alt-noktaları (bütün alanlar için ortak)
    malapert_massif.json
    apollo_11.json
    ...
    ozet.json         Isı haritası için önceden hesaplanmış özet
```

**Kural:** Üç sayfa aynı bileşenleri kullanır. Bileşen kodu asla
kopyalanmaz; sadece hangi bileşenin, hangi boyutta ve hangi sırada
dizildiği değişir.

---

## 4. Veri Sözleşmesi

Arayüz **sadece** aşağıdaki yapıları bilir. Hem sahte veri üreteci hem
gerçek veri hattı bu yapıları birebir üretir.

### 4.1 Alan dosyası — `<dosya_adi>.json`

Her alan için bir dosya. Dosya adı: küçük harf, boşluk yerine `_`,
Türkçe karakter ve kesme işareti yok (`malapert_massif.json`,
`apollo_11.json`, `change_4.json`).

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

### 4.2 Alan listesi — `bolgeler.json`

```json
[
  {
    "site": "Apollo 11",
    "kategori": "apollo",
    "aciklama": "İlk insanlı iniş, 1969",
    "lat": 0.674,
    "lon": 23.473,
    "file": "apollo_11.json"
  }
]
```

`kategori` değerleri: `artemis`, `apollo`, `clps`, `uluslararasi`.

### 4.3 Ortak efemeris — `efemeris.json`

Güneş ve Dünya'nın Ay üzerindeki **alt-noktaları** (tam tepede göründükleri
yüzey noktası), `MOON_ME` çerçevesinde. Bütün alanlar için ortaktır.
Özel koordinatta Güneş ve Dünya konumu buradan hesaplanır.

```json
{
  "t0": "2027-01-01T00:00:00Z",
  "dt_hours": 1,
  "n": 8760,
  "sun_sub_lat":   [1.2, "... n eleman"],
  "sun_sub_lon":   [178.4, "... n eleman, [0, 360)"],
  "earth_sub_lat": [-3.1, "... n eleman"],
  "earth_sub_lon": [4.7, "... n eleman, [-180, 180)"]
}
```

Gerçek veride SPICE `subpnt` fonksiyonuyla üretilir. Dünya için bu yöntem
paralaks yüzünden en fazla yaklaşık 0.3° hata verir; özel koordinat zaten
"yaklaşık" işaretli olduğu için kabul edilebilir.

### 4.4 Özet — `ozet.json`

Isı haritası için. `scripts/ozetUret.mjs` hesap modülüyle önceden üretir.
`epsilon` 2° sabittir. Puan burada saklanmaz; ağırlıklar değişebildiği
için tarayıcıda hesaplanır.

```json
{
  "t0": "2027-01-01T00:00:00Z",
  "landing_step_h": 168,
  "landing_count": 52,
  "epsilon_deg": 2,
  "sites": {
    "Malapert Massif": {
      "2": {
        "30": {
          "f_bar":       [0.72, 0.74, "... 52 eleman"],
          "c_bar":       [0.85, 0.83, "..."],
          "tau_max_h":   [48, 42, "..."],
          "sigma_max_h": [60, 66, "..."]
        },
        "7": { "...": "..." }, "90": { "...": "..." }, "180": { "...": "..." }
      },
      "0": { "...": "..." }, "10": { "...": "..." }
    }
  }
}
```

Anahtarlar: önce direk yüksekliği `hm` (0, 2, 10), sonra görev süresi
`D` (7, 30, 90, 180 gün). Görev yıl sonunu aşan hücreler `null` olur.

### 4.5 Birim ve yön kuralları

- Bütün açılar **derece** (radyan değil)
- Azimut: `0°` = kuzey, saat yönünde artar, aralık `[0, 360)`
- `horizon` dizileri `0°` azimuttan başlar, `1°` adımla ilerler, 360 eleman
- Yükseklik: ufuk düzleminden yukarısı pozitif
- Zaman dizileri düzgün aralıklı; `t0` ve `dt_hours` ile hesaplanır
- Sayılar 2 ondalığa yuvarlanır

---

## 5. Hesap Formülleri

Tarayıcıda hesaplanır. Sunucuya istek atılmaz.

### 5.1 Alt-noktadan yükseklik ve azimut (`efemeris.js`)

Gözlemci enlemi φ, boylamı λ; alt-nokta enlemi δ, boylamı λ_s.
Saat açısı `H = λ - λ_s`. Hepsi radyana çevrilerek:

```
sin_h = sin(φ)·sin(δ) + cos(φ)·cos(δ)·cos(H)
alt   = asin(sin_h)
kuzey = cos(φ)·sin(δ) - sin(φ)·cos(δ)·cos(H)
dogu  = -cos(δ)·sin(H)
az    = atan2(dogu, kuzey)  → dereceye çevir → [0, 360)
```

Bu fonksiyon `altAz(phi, lam, subLat, subLon) → { alt, az }` olarak
dışa aktarılır. Hem sahte veri üreteci hem özel koordinat bunu kullanır.

### 5.2 Güneş diskinin görünen oranı

ρ = 0.266° (Güneş açısal yarıçapı):

```
f(t) = clamp( (sun_alt[t] + 0.266 - H(sun_az[t])) / 0.532, 0, 1 )
```

### 5.3 İletişim durumu

ε = güvenlik payı (varsayılan 2°):

```
c(t) = earth_alt[t] > H(earth_az[t]) + epsilon  ?  1 : 0
```

### 5.4 Anlık güç

P0 = 1361 W/m², η = verim, S = alan:

```
P(t) = 1361 * eta * S * f(t)                    // Güneş'i izleyen panel
P(t) = 1361 * eta * S * f(t) * sin(sun_alt)     // yatay panel
P(t) = 1361 * eta * S * f(t) * cos(sun_alt)     // dikey panel
```

Yatay ve dikey panelde sonuç negatifse 0 alınır.

### 5.5 Geri sayım

`t` anından ileriye doğru tarama:

```
Güneş şu an görünüyorsa (f[t] > 0):
    gunBatimi   = f'nin ilk kez 0 olduğu indeks - t      (saat)
Görünmüyorsa:
    gunDogumu   = f'nin ilk kez > 0 olduğu indeks - t

Dünya şu an görünüyorsa (c[t] == 1):
    dunyaBatisi = c'nin ilk kez 0 olduğu indeks - t
Görünmüyorsa:
    dunyaDogusu = c'nin ilk kez 1 olduğu indeks - t

Veri aralığında geçiş yoksa: null → arayüzde "veri aralığında değişmiyor"
```

Sonuç saat cinsinden döner; arayüz `3 g 7 sa` biçiminde gösterir.

### 5.6 Dönem ölçütleri

`[tL, tL + D]` aralığında:

```
f_bar     = ortalama(f)
c_bar     = ortalama(c)
tau_max   = f == 0 olan en uzun ardışık dizi (saat)
sigma_max = c == 0 olan en uzun ardışık dizi (saat)
E         = toplam(P) * dt
puan      = w1*f_bar + w2*c_bar - w3*(tau_max / (D*24))
```

### 5.7 Ufuk okuma

Azimut kesirli olabilir; iki komşu derece arasında doğrusal ara değer.
Dizi döngüseldir: `H(359.5°)` için `horizon[359]` ile `horizon[0]`
arasında ara değer alınır.

### 5.8 Özel koordinat (`ozelNokta.js`)

Kullanıcı listede olmayan bir koordinat girdiğinde:

1. `efemeris.json` ve `altAz()` ile bütün zaman adımları için
   `sun_alt`, `sun_az`, `earth_alt`, `earth_az` hesaplanır
2. Ufuk **düz** kabul edilir: bütün `horizon` dizileri 0
3. Sonuç normal bir alan nesnesi gibi döner, ek olarak `yaklasik: true`
4. Arayüz bu alanda her zaman görünür bir uyarı gösterir:
   **"Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler
   farklı olabilir."**

Bu ileride önceden hesaplanmış bir ızgarayla değiştirilebilir; arayüz
değişmez.

### 5.9 Performans

Bütün hesaplar `Float32Array` üzerinde. `hm` dışındaki hiçbir parametre
ufuk profilini değiştirmez; parametre değişince veri yeniden yüklenmez,
sadece diziler yeniden taranır.

---

## 6. Durum Şeması (Zustand)

```js
{
  // Mod
  mod: 'temel' | 'orta' | 'ileri',

  // Bağımsız değişkenler
  seciliAlan: 'Malapert Massif',
  ozelNokta: null,          // { lat, lon } veya null
  karsilastirma: [],        // en fazla 3 alan adı
  t: 0,                     // zaman dizisindeki indeks
  tL: 0,                    // iniş tarihi indeksi
  D: 30,                    // görev süresi (gün) — sadece 7, 30, 90 veya 180

  // Mühendislik parametreleri
  hm: 2,                    // direk yüksekliği (m) — 0, 2 veya 10
  epsilon: 2,               // iletişim güvenlik payı (derece)
  S: 1,                     // panel alanı (m²)
  eta: 0.30,                // panel verimi
  yonelim: 'izleyen' | 'dikey' | 'yatay',
  w1: 1, w2: 1, w3: 1,      // puan ağırlıkları

  // Oynatma
  oynatiliyor: false,
  hiz: 1,
}
```

**Türetilmiş değerler saklanmaz.** `f(t)`, `c(t)`, ortalamalar, puan ve
geri sayım her render'da hesaplanır.

---

## 7. Üç Mod

Giriş ekranında kullanıcı birini seçer. Sonradan üst köşedeki düğmeyle
değiştirilebilir; giriş ekranına dönmek gerekmez.

| Özellik | Temel | Orta | İleri |
|---|:--:|:--:|:--:|
| Kategoriye göre alan listesi | ✓ | ✓ | ✓ |
| Gökyüzü görünümü | ✓ | ✓ | ✓ |
| Zaman kaydırıcısı + oynat | ✓ | ✓ | ✓ |
| Durum göstergesi | sözel | sayısal | sayısal |
| **Gün batımı / Dünya batışı geri sayımı** | ✓ büyük | ✓ | ✓ |
| Ay–Dünya karşılaştırma kartı | ✓ | — | — |
| Özel koordinat girişi | — | ✓ | ✓ |
| Kutup haritası | — | ✓ | ✓ |
| Zaman çizelgesi | — | ✓ | ✓ |
| Isı haritası | — | ✓ | ✓ |
| Yan yana karşılaştırma | — | 2 alan | 3 alan |
| Görev süresi `D` | — | ✓ | ✓ |
| Direk yüksekliği `hm` | — | ✓ | ✓ |
| `epsilon`, `S`, `eta`, yönelim | — | — | ✓ |
| Puan ağırlıkları `w1,w2,w3` | — | — | ✓ |
| CSV indirme | — | — | ✓ |

**Sayfa karakterleri:**

- **Temel** — Tek sütun, büyük puntolar, bol boşluk. Dev gökyüzü görünümü,
  altında iki büyük rozet ve geri sayım, en altta Ay–Dünya kartı.
- **Orta** — İki sütun. Solda alan listesi, harita ve seçimler; sağda
  gökyüzü görünümü ve zaman çizelgesi. Altta ısı haritası ve karşılaştırma.
- **İleri** — Sol kenar çubuğunda bütün parametreler, ortada grafikler,
  sağda sayısal özet ve dışa aktarma. Bilgi yoğunluğu yüksek.

---

## 8. Tasarım İlkeleri

NASA Eyes on the Solar System'ın görsel dilinden esinlenilmiştir.

1. **Sahne önce, panel sonra.** Görsel ekranı kaplar; kontroller üstüne
   yarı saydam katman olarak biner.
2. **Zaman her zaman görünür.** Zaman kaydırıcısı ve geri sayım kalıcıdır,
   hiçbir panelin içine gizlenmez.
3. **Renk az, vurgu tek.** Koyu zemin, gri-beyaz metin, iki vurgu rengi
   (Güneş ve iletişim). Üçüncü renk sadece uyarı için.
4. **Geçişler yumuşak.** Değerler zıplamaz, akar. Framer Motion kullanılır.
5. **Bilgi kademeli.** Önce isim, tıklayınca özet, sonra ayrıntı.
6. **Tipografi ince.** Başlıklarda `font-light`, harf aralığı biraz açık.
7. **Uç farkları göster.** Ay ile Dünya arasındaki farklar (29.5 günlük
   gün, ufukta sürünen Güneş, gökte sabit duran Dünya) somut sayılarla
   gösterilir. Kullanıcı küçük bir tarih ya da konum değişikliğinin neden
   büyük fark yarattığını görebilmeli.

---

## 9. Renk Paleti

```css
--zemin:          #070B14   /* en arka plan */
--yuzey:          #0E1524   /* panel arkaplanı */
--yuzey-acik:     #16203A   /* kart, hover */
--cizgi:          #1F2B45   /* kenarlık, ızgara */
--metin:          #E6EDF7   /* ana metin */
--metin-solgun:   #8A97AC   /* ikincil metin, etiket */

--gunes:          #F5A524   /* Güneş, aydınlanma, enerji */
--gunes-soluk:    #6B4A12   /* aydınlık şerit arkaplanı */
--iletisim:       #22D3EE   /* Dünya, iletişim penceresi */
--iletisim-soluk: #0E4A55

--uyari:          #EF4444   /* kritik durum, uzun karanlık, yaklaşık veri */
```

**Tipografi:** Başlıklar için `Inter`, sayılar için tabular (sabit
genişlikli) rakam ayarı. Sayılar değişirken genişlik oynamamalı.

---

## 10. İniş Alanları

**Koordinatlar yaklaşıktır ve hafızadan yazılmıştır.** Özellikle Artemis
bölgeleri NASA'nın yayımladığı haritadan doğrulanmalıdır. Gerçek veri
geldiğinde JSON dosyalarındaki değerler esastır. Boylamlar `[0, 360)`
aralığında, doğu yönünde artan.

### Artemis III aday bölgeleri (kategori: `artemis`)

| Bölge | Enlem | Boylam |
|---|---|---|
| Peak near Cabeus B | −82.2° | 326.0° |
| Haworth | −87.5° | 355.0° |
| Malapert Massif | −86.0° | 2.7° |
| Mons Mouton | −84.6° | 31.0° |
| Mons Mouton Plateau | −84.3° | 28.0° |
| Nobile Rim 1 | −85.4° | 38.0° |
| Nobile Rim 2 | −84.8° | 60.0° |
| de Gerlache Rim 2 | −88.5° | 290.0° |
| Slater Plain | −88.1° | 105.0° |

### Apollo (kategori: `apollo`)

| Görev | Enlem | Boylam | Açıklama |
|---|---|---|---|
| Apollo 11 | 0.674° | 23.473° | İlk insanlı iniş, 1969 |
| Apollo 12 | −3.012° | 336.578° | Oceanus Procellarum, 1969 |
| Apollo 14 | −3.645° | 342.529° | Fra Mauro, 1971 |
| Apollo 15 | 26.132° | 3.634° | Hadley-Apennine, 1971 |
| Apollo 16 | −8.973° | 15.500° | Descartes, 1972 |
| Apollo 17 | 20.191° | 30.772° | Taurus-Littrow, 1972 |

### CLPS (kategori: `clps`)

| Görev | Enlem | Boylam | Açıklama |
|---|---|---|---|
| IM-1 Odysseus | −80.13° | 1.44° | Malapert A yakını, 2024 |
| IM-2 Athena | −84.8° | 29.2° | Mons Mouton, 2025 |
| Blue Ghost 1 | 18.56° | 61.81° | Mare Crisium, 2025 |

### Uluslararası (kategori: `uluslararasi`)

| Görev | Enlem | Boylam | Açıklama |
|---|---|---|---|
| Chang'e 3 | 44.12° | 340.49° | Mare Imbrium, Çin, 2013 |
| Chang'e 4 | −45.44° | 177.60° | Uzak yüz, Çin, 2019 |
| Chang'e 5 | 43.06° | 308.08° | Mons Rümker yakını, Çin, 2020 |
| Chang'e 6 | −41.63° | 206.01° | Uzak yüz, Çin, 2024 |
| Chandrayaan-3 | −69.37° | 32.32° | Güney kutbu yakını, Hindistan, 2023 |
| SLIM | −13.3° | 25.25° | Shioli krateri, Japonya, 2024 |

**Kutup sınırı:** `|lat| >= 75°` olan alanlar "kutup alanı" sayılır.

---

## 11. Çalışma Kuralları

- **Her adımda git commit at.** Çalışan her hâl kaydedilir.
- **Bir seferde bir bileşen.** Çok sayıda dosya aynı anda değiştirilmez.
- **Sahte veriyle geliştir.** `sahteVeri.js` gerçek verinin yerine geçer;
  gerçek dosyalar gelince sadece `veri.js` içindeki yol değişir.
- **Eksen sınırları alana göre.** Gökyüzü görünümünde yükseklik ekseni:
  kutup alanları için `−15°…+15°`, diğerleri için `−90°…+90°`. Bir alan
  içinde eksen sabittir, zaman ilerledikçe oynamaz. Azimut her zaman
  `0°…360°`, puan `0…1`.
- **Türkçe isimlendirme.** Bileşen ve değişken adları Türkçe; JSON alan
  adları İngilizce (veri sözleşmesi öyle kararlaştırıldı).
- **Dosya boyutu.** Her alan ayrı JSON; sadece seçili alan yüklenir.
  Isı haritası `ozet.json`'dan beslenir.
- **Yaklaşık veri işaretlenir.** `yaklasik: true` olan her alanda uyarı
  görünür. Kullanıcıyı yanıltabilecek hiçbir sonuç uyarısız gösterilmez.

---

## 12. Öncelik Sırası

Süre biterse listenin sonundakiler eksik kalır, gerisi ayakta durur.

1. İskelet (Vite + React + Tailwind, koyu tema) ✓
2. Efemeris + sahte veri üreteci
3. Hesap modülü (geri sayım ve özel nokta dahil) + durum deposu
4. Gökyüzü görünümü ← **en kritik parça**
5. Temel sayfa (geri sayım + Ay–Dünya kartı dahil)
6. Zaman çizelgesi
7. Orta sayfa (özel koordinat dahil)
8. Isı haritası
9. Yan yana karşılaştırma
10. İleri sayfa
11. 3B Ay küresi
12. Giriş ekranı

**Not:** 3B küre bütün alanları tek bakışta gösterebilen tek görünüm
(kutup haritası sadece kutup alanlarını gösterir). Zaman kalırsa
önemlidir, ama asıl bilgi 2B gökyüzü görünümündedir.
