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
    hesap.js          f(t), c(t), ortalamalar, puan, geçişler ve geri sayım
    disaAktar.js      CSV metni ve dosya adı (İleri)
    ozelNokta.js      Özel koordinat için yaklaşık veri üretimi
    veri.js           JSON yükleme ve önbellekleme
    sabitler.js       Fiziksel sabitler ve varsayılan parametreler (VARSAYILAN)
    kutupDem.js       Güney kutbu 400 m DEM yükleyici (özel koordinat + 3B ortak önbellek)
    planbModel.js     Paketin model.js'i (src/vendor/planb/, veri:donustur kopyalar); yalnız dinamik yüklenir
    inisIsci.js       Krater kartının iniş olasılığı işçisi (Web Worker; model.js landingOdds + hourly)
    inisPencere.js    Hızlı pencere hesabı ve öneri taraması (işçi ve scripts/inisDogrula.mjs ortak)
  /bilesenler
    GokyuzuGorunumu.jsx
    ZamanCizelgesi.jsx
    IsiHaritasi.jsx
    KutupHaritasi.jsx
    DurumGostergesi.jsx
    GeriSayim.jsx
    AyDunyaKarti.jsx
    Karsilastirma.jsx
    ZamanKaydirici.jsx
    ParametrePaneli.jsx   kapsam='gorev' (Orta) | 'tam' katlanabilir bölümler (İleri)
    AlanListesi.jsx
    OzelKoordinat.jsx     Özel koordinat girişi (yaklaşık veri)
    ModDegistirici.jsx    Temel / Orta / İleri geçişi
    Secenekler.jsx        Parçalı düğme (tek seçim)
    AkanSayi.jsx          Değişirken akan sayı
    GokyuzuKutusu.jsx     Depoya bağlı gökyüzü görünümü + uyarı (Panorama / Kubbe / 3B düğmesi)
    /uc                   3B (react-three-fiber): Ay küresi + yerel sahne; yalnız 3B seçilince yüklenir
      UcBoyut.jsx         Kapsayıcı: küre ↔ yerel seviye, gezinti çubuğu "Ay › alan", geçiş perdesi,
                          tam ekran (F/ESC) ve üst katman (iki seviyede de)
      AyKuresi.jsx        Ay küresi: dokular, Güneş/Dünya ışığı, 26 işaret (DOM), kamera, yaklaşma uçuşu
      ayDokulari.js       Renk 2k/4k, displacement ve normal haritası (16 bit yükseklikten)
      png16.js            16 bit gri PNG çözücü (DecompressionStream)
      kutupYamasi.js      80°G içi 400 m DEM yaması, 80°G'de kesik küre; dikişsiz geçiş
      MlKatmanlari.jsx    v5 ML: NAC fotoğrafı, ML kraterleri (InstancedMesh, güven rengi), 100 m tehlike örtüsü
      KraterKarti.jsx     Tıklanan kraterin kartı (güven, isabet, g, "buraya inersen" başarı)
      inisOlasiligi.js    İniş olasılığı işçisini yönetir (core/inisIsci.js)
      kure.js             Enlem/boylam → küre vektörü, kamera duruşları
      HataSiniri.jsx      WebGL denetimi ve sahne hata sınırı (→ panorama)
      AraziSahnesi.jsx    Yerel sahne: Canvas, HUD, kamera düğmeleri, düşey abartı
      Arazi.jsx           Tek parça kutupsal zemin: LOLA (r 5 km) + etek → ufuk R·tan(H) + koni sacak; never_lit örtüsü
      Gok.jsx             Gök küresinde Güneş (Bloom'lu disk + hale) ve Dünya (c=0: halka); ışık, earthshine, yıldızlar
      Pusula.jsx          Araziye oturan halka, iniş aracı modeli; sahne etiketleri listesi
      EkranEtiketleri.jsx Sahne noktalarını DOM etiketlerine izdüşürür (drei Html yerine); çakışma kaçınması
      Kamera.jsx          Yerden (−3°, FOV 60) / kuş bakışı / Güneş'e bak / Dünya'ya bak; 1 sn geçiş, 2 sn açılış uçuşu
      TamEkran.jsx        Fullscreen API (+ sahte yedek), F/ESC, 3 sn solan katman
      Iskelet.jsx         Yüklenirken iskelet (three içermez)
      veri.js             public/veri/3b/ yükleme, yükseklik ara değeri
      sahne.js            Eksenler, uzaklıklar, yön vektörü
    ZamanCizelgesiKutusu.jsx  Depoya bağlı zaman çizelgesi
    SayisalOzet.jsx       Anlık ve görev aralığı sayıları; kip='tam' İleri özeti
    DisaAktar.jsx         CSV indirme (İleri)
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
  gercekVeriDonustur.mjs  Veri paketi → public/veri/ (alanlar, bolgeler, efemeris)  npm run veri:donustur
  ozetUret.mjs        hesap.js ile ozet.json üretir                              npm run veri:ozet
  ucBoyutVeriHazirla.mjs  Veri paketindeki terrain_*/grid_* → public/veri/3b/    npm run veri:3b
/public
  /veri
    bolgeler.json     Bütün alanların listesi (26)
    efemeris.json     Güneş ve Dünya alt-noktaları + Güneş uzaklığı (bütün alanlar için ortak)
    a3_malapert_massif.json
    apollo11.json
    ...               dosya adı = paketin site kimliği (sites.json "id")
    ozet.json         Isı haritası için önceden hesaplanmış özet
    /3b               3B arazi: alan dosyasıyla aynı ad; moon/, dem_south_400m, artemis_regions
/veri_kaynak/planb    Veri paketi açılmış hâli, v5 (.gitignore'da; zip de depoya girmez)
/src/vendor/planb     model.js (paketten olduğu gibi; elle düzenlenmez)
```

**Kural:** Üç sayfa aynı bileşenleri kullanır. Bileşen kodu asla
kopyalanmaz; sadece hangi bileşenin, hangi boyutta ve hangi sırada
dizildiği değişir.

---

## 4. Veri Sözleşmesi

Arayüz **sadece** aşağıdaki yapıları bilir. Hepsini
`scripts/gercekVeriDonustur.mjs` veri paketinden üretir (bölüm 13).

### 4.1 Alan dosyası — `<dosya_adi>.json`

Her alan için bir dosya. Dosya adı paketin site kimliği: küçük harf,
`_` ile (`a3_malapert_massif.json`, `apollo11.json`, `change4.json`).
Arayüz adı asla dosya adından türetmez; `bolgeler.json` "file" esastır.

```json
{
  "site": "Malapert Massif",
  "name_package": "Malapert Massif (best point)",
  "id": "a3_malapert_massif",
  "lat": -85.96708,
  "lon": 357.7749,
  "ground_m": 4985.7,
  "mast_heights_m": [0, 2, 10],
  "horizon": {
    "0":  [2.1, 2.3, 2.4, "... 720 eleman (0.5° adım)"],
    "2":  [1.9, 2.1, 2.2, "... 720 eleman"],
    "10": [1.4, 1.6, 1.7, "... 720 eleman"]
  },
  "t0": "2027-01-01T00:00:00Z",
  "dt_hours": 1,
  "n": 8760,
  "sun_alt":   [2.1, 2.0, 1.8, "... n eleman"],
  "sun_az":    [147.2, 148.9, "... n eleman"],
  "earth_alt": [-1.2, -1.1, "... n eleman"],
  "earth_az":  [31.5, 31.6, "... n eleman"],
  "sun_au":    [0.98332, "... n eleman, Güneş uzaklığı (AB)"]
}
```

`sun_alt/az` ve `earth_alt/az` paketin `model.js` `basis/azel` fonksiyonlarıyla
hesaplanır (efemeris indeksi 1464 = 2027-01-01). Dünya için gözlemci konumu
zemin + direk yüksekliğidir (topografik paralaks); 0/2/10 m direkler arası fark
en fazla 1.3·10⁻⁶° olduğu için tek dizi (2 m) saklanır. `horizon` paketin
720 elemanlı (0.5°) profilidir, olduğu gibi. `site` arayüzdeki kısa ad
(§10); paketin adı `name_package`'da. Ad yalnız gösterim ve `ozet.json`
anahtarıdır; dosya ve 3B eşleşmesi paket kimliğine (`id`) bağlıdır.

### 4.2 Alan listesi — `bolgeler.json`

```json
[
  {
    "site": "Apollo 11",
    "kategori": "apollo",
    "aciklama": "İlk insanlı iniş, 1969",
    "lat": 0.6734,
    "lon": 23.4731,
    "file": "apollo11.json",
    "id": "apollo11",
    "kaynak": "NASA NSSDC …",
    "arazi": "terrain_global",
    "arazi_cozunurluk_m": 118
  }
]
```

`kategori` değerleri: `artemis`, `apollo`, `clps`, `uluslararasi`. Paketteki
gruptan: Artemis III → `artemis`; South pole missions → `clps`; Apollo →
`apollo`; Other missions → Blue Ghost 1 `clps`, diğerleri `uluslararasi`.
`kaynak` koordinatın kaynağı (sites.json `source`). `arazi`: `terrain` (kutup
LOLA/PGDA 5–20 m) ya da `terrain_global` (SLDEM2015 ≈ 118 m; Chandrayaan-3
LOLA ≈ 237 m → `arazi_cozunurluk_m`). `terrain_global` alanlarda gökyüzü
kutusunun altında solgun not: "Arazi ~118 m çözünürlükte."

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
  "earth_sub_lon": [4.7, "... n eleman, [-180, 180)"],
  "sun_au":        [0.98332, "... n eleman"],
  "earth_dist_km": [384121.5, "... n eleman, Ay merkezinden Dünya merkezine"]
}
```

Paketin `ephem_hourly.json` vektörlerinden (Ay merkezinden Güneş yönü ve
Dünya vektörü, `MOON_ME_DE440_ME421`) hesaplanır. Alt-nokta Ay merkezine göredir;
Dünya için paralaks yüzünden en fazla yaklaşık 0.3° hata verir; özel koordinat
zaten "yaklaşık" işaretli olduğu için kabul edilebilir.

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

### 4.5 3B arazi — `3b/<dosya_adi>.json`

`scripts/ucBoyutVeriHazirla.mjs` ile veri paketinden üretilir; yalnız seçili
alanınki yüklenir (`bilesenler/uc/veri.js`). Gerçek LOLA/SLDEM arazisidir.

```json
{
  "site": "Malapert Massif",
  "source_id": "a3_malapert_massif",
  "dem": "dem20_a3_malapert_massif.tif",
  "n": 201,
  "spacing_m": 50,
  "z0_m": 4985.7,
  "dz_m": ["... n·n eleman, merkez zemine göre metre, tam sayı"],
  "never_lit": { "n": 31, "spacing_m": 100, "values": ["... 0/1, n·n"], "note": "..." }
}
```

Sıra `k = j·n + i`; `j` güneyden kuzeye, `i` batıdan doğuya. `never_lit`
3×3 km'lik merkez ızgaradır (18.6 yılda hiç Güneş almayan hücre = 1); kutup
dışı alanlarda `null`. Sahne eksenleri: +x doğu, −z kuzey, +y yukarı, metre.

**v5 ML katmanı** (10 alan: 7 Artemis bölgesi, IM-2 hedef/iniş, CP-22; Nobile
Rim 2 ve Peak near Cabeus B 84°G'nin kuzeyinde, 1 m mozaik yok): 3B arazi
dosyasında `"ml": { "kraterler": "mlcraters_<dosya>", "foto": "nac_<ad>.png",
"yari_m": 1550, "m_px": 2 }` (yoksa `null`). `mlcraters_<dosya>`:
`craters` = `[doğu m, kuzey m, D m, güven]` (ızgara merkezine göre),
`node` = 31×31, 100 m hücre (`k = j·31 + i`, j güneyden kuzeye):
`haz_frac` (iniş ayağının krater payı; `null` = görüntü karanlık → bilinmiyor),
`dens_km2`, `observable`. `nac_*.png` kuzey yukarı, kenar 3100 m, merkez = ızgara
merkezi = alan noktası = 3B arazinin merkezi (10 alanda 0 m fark doğrulandı).
`ml_calibration.json`: ML'in uzman etiketlerine karşı hatası (kutup: ML 0.208 /
uzman 0.198, kesit başına ±0.09). Yalnız seçili alanınki, katman açılınca iner.

### 4.6 Birim ve yön kuralları

- Bütün açılar **derece** (radyan değil)
- Azimut: `0°` = kuzey, saat yönünde artar, aralık `[0, 360)`
- `horizon` dizileri `0°` azimuttan başlar, `0.5°` adımla ilerler, 720 eleman
  (`sabitler.js` `UFUK_YON_SAYISI`); kod uzunluk varsaymaz, `ufukOku` ile okur
- Yükseklik: ufuk düzleminden yukarısı pozitif
- Zaman dizileri düzgün aralıklı; `t0` ve `dt_hours` ile hesaplanır
- Ondalık: yükseklik/azimut 4, ufuk 3, `sun_au` 6 basamak (Güneş ufukta
  sürünürken `el − H` yalnızca birkaç yüzde bir derecedir)

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
dışa aktarılır. Özel koordinat bunu kullanır.

### 5.2 Güneş diskinin görünen oranı

Ufkun üstünde kalan disk oranı — **daire dilimi** (paketin `diskFraction`'ı).
Güneş'in açısal yarıçapı uzaklıktan: `ρ = asin(695 700 km / (sun_au · 1 AB))`
(0.262°–0.272°; `sun_au` yoksa 0.2666°):

```
d    = clamp( (sun_alt[t] - H(sun_az[t])) / ρ, -1, 1 )
f(t) = 1 - (acos(d) - d·√(1 - d²)) / π
```

**Aydınlık = `f > 0.5`** (disk merkezi ufkun üstünde). Geri sayım, en uzun
karanlık ve "Güneş görünür" bu eşikle. `f_bar` (Güneş %) yine f'nin ortalamasıdır.

### 5.3 İletişim durumu

ε = güvenlik payı (varsayılan 2°):

```
c(t) = earth_alt[t] > H(earth_az[t]) + epsilon  ?  1 : 0
```

### 5.4 Anlık güç

P0 = 1361 W/m² (1 AB'de), η = verim, S = alan, `k = (1 / sun_au)²`:

```
P(t) = 1361 * k * eta * S * f(t)                    // Güneş'i izleyen panel
P(t) = 1361 * k * eta * S * f(t) * sin(sun_alt)     // yatay panel
P(t) = 1361 * k * eta * S * f(t) * cos(sun_alt)     // dikey panel
```

Yatay ve dikey panelde sonuç negatifse 0 alınır.

### 5.5 Geri sayım

`t` anından ileriye doğru tarama:

```
Güneş şu an görünüyorsa (f[t] > 0.5):
    gunBatimi   = f'nin ilk kez ≤ 0.5 olduğu indeks - t      (saat)
Görünmüyorsa:
    gunDogumu   = f'nin ilk kez > 0.5 olduğu indeks - t

Dünya şu an görünüyorsa (c[t] == 1):
    dunyaBatisi = c'nin ilk kez 0 olduğu indeks - t
Görünmüyorsa:
    dunyaDogusu = c'nin ilk kez 1 olduğu indeks - t

Veri aralığında geçiş yoksa: null → arayüzde "veri aralığında değişmiyor"
```

Tarama tek yerdedir: `gecisler(dizi, t, dt, esik) → { sonrakiBatis, sonrakiDogus }`
(saat veya null). `geriSayim` bunu kullanır; İleri özeti dört değeri de gösterir.

Sonuç saat cinsinden döner; arayüz `3 g 7 sa` biçiminde gösterir.

### 5.6 Dönem ölçütleri

`[tL, tL + D]` aralığında:

```
f_bar     = ortalama(f)
c_bar     = ortalama(c)
tau_max   = f ≤ 0.5 olan en uzun ardışık dizi (saat)
sigma_max = c == 0 olan en uzun ardışık dizi (saat)
E         = toplam(P) * dt
puan      = w1*f_bar + w2*c_bar - w3*(tau_max / (D*24))
```

### 5.7 Ufuk okuma

`ufukOku(horizon, az)` — tek fonksiyon; gökyüzü görünümü (panorama ve
kubbe), hesaplar (f, c), ısı haritası özeti, karşılaştırma ve 3B ufuk aynı
fonksiyonu kullanır. `n = horizon.length`, adım `360/n` (veride 720 → 0.5°).
Komşu iki örnek arasında doğrusal ara değer; dizi döngüseldir: `H(359.7°)`
için `horizon[719]` ile `horizon[0]` arasında ara değer alınır. Paketin
`model.js` `horizonAt`'ı ile aynı.

### 5.8 Özel koordinat (`ozelNokta.js`)

Kullanıcı listede olmayan bir koordinat girdiğinde:

1. `efemeris.json` ve `altAz()` ile bütün zaman adımları için
   `sun_alt`, `sun_az`, `earth_alt`, `earth_az` hesaplanır
2. Ufuk iki seviyeli (paket rehberi §5):
   - **enlem ≤ −80°:** 400 m kutup DEM'inden **kaba ufuk** — paketin
     `model.js` `horizonFromDem`'i, 0/2/10 m direk, 720 yön
     (`ufukKaynagi: 'dem400'`). DEM ve model.js yalnız bu durumda dinamik iner.
     Uyarı: **"Kaba tahmin: 400 m arazi; Güneş % ortalama +8 puan fazla
     çıkabilir (RMSE 12)."** (rehber: +7.9 puan, RMSE 11.7). 3B'de arazi de
     DEM'den 10×10 km kesilir, "kaba arazi" notu.
   - **diğer yerler:** ufuk **düz** (bütün diziler 0, `ufukKaynagi: 'duz'`),
     uyarı **"Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler
     farklı olabilir."**
3. Sonuç normal bir alan nesnesi gibi döner, ek olarak `yaklasik: true`
4. Uyarılar tek yerden: `ozelNoktaNotu(alan)` → kısa etiket, uzun uyarı, CSV ilk satırı.

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
  t: 610,                   // zaman dizisindeki indeks: 26 Ocak 10:00 UTC (alan değişince korunur)
                            // Malapert'te Güneş ve Dünya görünür (≈ 53° ayrık), Earthset 16 sa, gün batımı 61 sa
  tL: 0,                    // iniş tarihi indeksi (1 Ocak; t bu 30 günlük görevin içinde)
  D: 30,                    // görev süresi (gün) — sadece 7, 30, 90 veya 180

  // Mühendislik parametreleri
  hm: 2,                    // direk yüksekliği (m) — 0, 2 veya 10
  epsilon: 2,               // iletişim güvenlik payı (derece)
  S: 1,                     // panel alanı (m²)
  eta: 0.30,                // panel verimi
  yonelim: 'izleyen' | 'dikey' | 'yatay',
  w1: 1, w2: 1, w3: 1,      // puan ağırlıkları

  // Krater kartı (3B, ML kraterleri) — sayfalar arası korunur
  kartPencere: 't14',       // 't14' = seçili andan (t) 14 gün; 'gorev' = görev penceresi (tL, D)
  kartBatarya: 50,          // saat — 50, 100 veya 200

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

26 alan; koordinat ve kaynak paketin `sites.json` dosyasından
(`bolgeler.json` "kaynak": LROC, NSSDC, USGS, makale). Ad ve açıklama
`scripts/gercekVeriDonustur.mjs` içindeki `AD` / `ACIKLAMA` tablolarındadır
(eşleme paket kimliğiyle). Boylamlar `[0, 360)`, doğu yönünde artan.

### Artemis III aday bölgeleri (kategori: `artemis`)

Açıklama hepsinde: "Artemis III aday bölgesi · bölgedeki en iyi nokta" (nokta,
bölge taramasındaki en iyi noktadır; paket adı "… (best point)").

| Ad | Kimlik | Enlem | Boylam |
|---|---|---|---|
| Peak near Cabeus B | `a3_peak_near_cabeus_b` | −83.48° | 291.74° |
| Haworth | `a3_haworth` | −86.32° | 336.82° |
| Malapert Massif | `a3_malapert_massif` | −85.97° | 357.77° |
| Mons Mouton | `a3_mons_mouton` | −85.48° | 31.29° |
| Mons Mouton Plateau | `a3_mons_mouton_plateau` | −84.56° | 39.42° |
| Nobile Rim 1 | `a3_nobile_rim_1` | −85.01° | 38.01° |
| Nobile Rim 2 | `a3_nobile_rim_2` | −83.57° | 58.41° |
| de Gerlache Rim 2 | `a3_de_gerlache_rim_2` | −88.44° | 292.08° |
| Slater Plain | `a3_slater_plain` | −87.24° | 127.24° |

### Apollo (kategori: `apollo`)

| Ad | Kimlik | Açıklama |
|---|---|---|
| Apollo 11 | `apollo11` | İlk insanlı iniş, 1969 |
| Apollo 12 | `apollo12` | Oceanus Procellarum, 1969 |
| Apollo 14 | `apollo14` | Fra Mauro, 1971 |
| Apollo 15 | `apollo15` | Hadley-Apennine, 1971 |
| Apollo 16 | `apollo16` | Descartes, 1972 |
| Apollo 17 | `apollo17` | Taurus-Littrow, 1972 |

### CLPS ve güney kutbu görevleri (kategori: `clps`)

| Ad | Kimlik | Açıklama |
|---|---|---|
| IM-1 Odysseus | `im1_odysseus` | Malapert A yakını, 2024 |
| IM-2 Athena (hedef) | `im2_target` | Mons Mouton, 2025 · hedeflenen nokta |
| IM-2 Athena (iniş) | `im2_actual` | Mons Mouton, 2025 · gerçek iniş noktası |
| CP-22 | `cp22_prospect` | Mons Mouton platosu, CLPS aday noktası |
| Blue Ghost 1 | `blueghost1` | Mare Crisium, 2025 |

### Uluslararası (kategori: `uluslararasi`)

| Ad | Kimlik | Açıklama |
|---|---|---|
| Chang'e 3 | `change3` | Mare Imbrium, Çin, 2013 |
| Chang'e 4 | `change4` | Uzak yüz, Çin, 2019 |
| Chang'e 5 | `change5` | Mons Rümker yakını, Çin, 2020 |
| Chang'e 6 | `change6` | Uzak yüz, Çin, 2024 |
| Chandrayaan-3 | `chandrayaan3` | Güney kutbu yakını, Hindistan, 2023 |
| SLIM | `slim` | Shioli krateri, Japonya, 2024 |

**Kutup sınırı:** `|lat| >= 75°` olan alanlar "kutup alanı" sayılır.

---

## 11. Çalışma Kuralları

- **Her adımda git commit at.** Çalışan her hâl kaydedilir.
- **Bir seferde bir bileşen.** Çok sayıda dosya aynı anda değiştirilmez.
- **Veri yalnız paketten.** `public/veri/` elle düzenlenmez; paket
  değişince `npm run veri:donustur && npm run veri:ozet && npm run veri:3b`.
  Her sayının kaynağı veri sözleşmesinde (paket `docs/VERI_SOZLESMESI.md`).
- **Eksen sınırları alana göre.** Gökyüzü görünümünde yükseklik ekseni:
  kutup alanları için `−15°…+15°`, diğerleri için `−90°…+90°`. Bir alan
  içinde eksen sabittir, zaman ilerledikçe oynamaz. Azimut her zaman
  `0°…360°`, puan `0…1`.
- **Gökyüzünde örtme.** Çizim sırası: ızgara → izler → Güneş → Dünya →
  arazi (opaklık 0.8) → iletişim eşiği → etiketler. Örtmeyi arazi yapar.
  **İstisna — yalnızca kubbe:** arazi halkası Güneş diskinden ince olduğu
  için f = 0 iken Güneş diski %25 opaklıkla çizilir. Dünya iki görünümde de
  c = 1 iken dolu disk, c = 0 iken içi boş halka (2px, `--iletisim`).
- **Kubbe ölçeği.** Merkez tepe noktası (90°), dış kenar `altMin`: kutup
  alanında `−15°` (panorama ekseniyle aynı), diğerlerinde `−5°`.
  `r = R · (90 − alt) / (90 − altMin)`; alan içinde sabittir. 0° çemberi ince
  bir çizgi ve "0°" etiketiyle ayrıca gösterilir. Arazi dış kenardan H(A)'ya
  kadar halka, iletişim eşiği H(A)+ε kesikli çizgi. Kenar dışı işaret (nokta +
  "−2.7°") yalnızca `alt < altMin` iken çizilir.
- **3B Ay küresi.** 3B açılınca önce küre (`uc/AyKuresi.jsx`): yarıçap 1,
  256 dilim; LROC WAC renk (2k, yalnız tam ekranda 4k), LOLA 16 bit yükseklikten
  displacement (4×) ve normal haritası. Doku eşdikdörtgen, boylam −180…+180
  soldan sağa; three ekseni: 0° boylam +x, 90°D −z, kuzey +y (`kure.js`;
  Apollo 11 Mare Tranquillitatis'te, Tycho ve Chang'e 4 doğru yerde
  doğrulandı). Işık Güneş alt-noktasından (`efemeris.json`, seçili t; her
  karede yumuşak), gece tarafında yalnız Dünya'ya bakan yüzde hafif
  earthshine; uzakta evreli Dünya. 26 işaret DOM'dadır: artemis daire, clps
  kare, apollo üçgen, uluslararasi elmas; seçili `--gunes` ve büyük; arka
  yüzdekiler gizli; adlar yalnız yakınlaşınca (çakışan ad gizlenir); üzerine
  gelince ad, açıklama ve görev aralığı ölçütleri (`ozet.json`, ε = 2°).
  İşarete tıklama: `alanSec` + kamera 2 sn'de alana yaklaşır → perde → yerel
  sahne açılış uçuşuyla iner. Gezinti çubuğu "Ay › alan": "Ay" yerelden küreye
  geri uçar, alan adı küreden iner. Listeden alan seçimi: kürede kamera döner,
  yerelde yeni alana geçilir (3B, alan verisi yüklenirken de bağlı kalır).
  Küre ve yerel sahne ayrı Canvas; aynı anda biri bağlı, kapanan WebGL bağlamını
  ve dokularını bırakır. Doku kredisi: "NASA's Scientific Visualization Studio".
  Güney kutbu yaması: kamera kutba yaklaşınca ya da kutup alanına (enlem < −75°)
  uçuş/dönüşte bir kez `dem_south_400m.bin` yüklenir; küre 80°G'de kesilir
  (UV enlemden yeniden yazılır) ve 400 m DEM'li yama kutbu tamamlar. Dış halka
  kürenin kenar köşeleriyle aynı yükseklikte (768 = 256 × 3 dilim); 4°'lik
  geçişte yükseklik küreselden DEM'e, normal de kürenin normal haritasından
  geometrik normale karışır — dikiş görünmez. Uzak Dünya'nın gece yüzü çok
  soluk gri-mavi (zayıf öz ışıma).
- **ML katmanları (v5, yerel sahne).** Yalnız ML'li 10 alanda üç düğme:
  "Fotoğraf", "Küçük kraterler (ML)", "Tehlike" — varsayılan kapalı, tam
  ekranda da. Fotoğraf ve tehlike ayrı ağ değil, arazi malzemesinin içinde
  (`MlKatmanlari.useKatmanShader`, dünya x/z'den doku koordinatı): araziye tam
  oturur, delik ve z çakışması yok (sahne logaritmik derinlik kullanır,
  `polygonOffset` orada işlemez). Fotoğraf 3.1 km'lik kare, 150 m kenar geçişi;
  kendi parlaklığıyla: %85 öz ışık (sahne ışığından bağımsız; kutupta Güneş
  birkaç derecede ya da ufkun altında olsa da görünür) + %15 sahne gölgelemesi
  (arazi şekli okunsun). Açılınca kamera kuş bakışına alçalıp kareyi kadraja
  alır (`kamera('foto')`). Kraterler araziye eğimiyle oturan ince halkalar
  (D ≥ 20 m varsayılan, "tümü (≥ 10 m)"); rengi kendi YOLOv8 güven skoruna göre
  (0.2 soluk sarı → 1.0 parlak turuncu-kırmızı; skor KALİBRE DEĞİL), kalınlık
  çapla hafif artar. Krater tıklanınca kart (boşa tıklama ya da ESC kapatır,
  seçili halka beyaz ve kalın): çap; güven skoru yüzde ("ML güven skoru: %22 (olasılık değil)") + çubuk; bu çaptaki
  tespitlerin isabet oranı (`accuracy.polar_GR1_complete` precision, 10–20 m /
  ≥ 20 m); hücre tehlikesi g (null → "bilinmiyor — gölge"); "Buraya inersen:
  başarı %…" — paketin `landingOdds`'u bir Web Worker'da (`core/inisIsci.js`),
  hedef = kraterin 100 m hücresi, σ 100 m, eğim 10°, tampon 24 sa, ground =
  haz_frac (rehber §9). Kartta iki seçici (depoda, sayfalar arası korunur):
  pencere "14 gün (t'den)" (varsayılan; CLPS tipik görev süresi, bir Ay günü)
  | "Görev penceresi (tL, D)"; batarya 50 / 100 / 200 sa (varsayılan 50).
  Altında en büyük başarısızlık payı (krater / eğim / uzun karanlık /
  iletişim kesintisi / ızgara dışı). Sonuç %0 ise gerekçe büyük ve açık yazılır
  ("Uzun karanlık: 50 sa batarya bu pencerede yetmiyor") ve tek satır öneri:
  aynı hücre için bu pencereden sonraki ilk ≥ %50 başarılı 14 günlük başlangıç
  ("9 Eylül'de inersen: %58"); tıklanınca t oraya atlar ve pencere "14 gün
  (t'den)"e geçer. Tarama GÜNLÜK adımla, en fazla 1 yıl (2027 sonu): Haworth'ta
  ≥ %50 başlangıçlar ayda yalnız 1–5 günlük dar aralıklarda (Ağu–Ara) çıkar,
  haftalık adım hepsini kaçırır.
  Hız: landingNodes her pencerede 961 düğüm × saatleri baştan tarar; kart t ile
  kaydığı ve öneri ~350 pencere denediği için `core/inisPencere.js` hedefin
  ± 6 hücre (6σ) komşuluğundaki düğümlerin bütün yılın saatlik aydınlık / Dünya
  bitlerini `Model.hourly` ile bir kez hesaplar (düğüm başına önbellek; kraterler
  açılınca bütün ızgara arka planda, merkezden dışa), her pencerede en uzun
  koşuları sayıp `landingOdds`'u olduğu gibi çağırır. Komşuluk dışı "başarısız"
  sayılır (kütle ~1e-8). `npm run veri:inis` (scripts/inisDogrula.mjs) bunu
  landingNodes ile karşılaştırır: fark ≤ 2e-10. Bunun için `public/veri/3b/`
  altında 10 alanın `izgara_*` (31×31 konum, eğim; ufuk Int16 `.bin`) ve 2027
  efemeris dilimi `efemeris_2027.json` (paketin ham vektörleri, birebir).
  Doğrulama: Haworth, 2027-10-11, 14 gün, merkez hücre → fizik %92.6, + ML
  %66.9 (rehberle aynı; paketin ham dosyalarıyla fark 0; kartta iki kipte de).
  Tehlike: 100 m hücreler, en fazla %55 saydamlık; g < 0.10 neredeyse saydam,
  0.10–0.30 açık turuncu, ≥ 0.30 koyu turuncu-kırmızı (sürekli). Hücre içinin
  %70'i kendi değerini birebir taşır, kenarda 30 m yumuşak geçiş. `null`
  hücreler gri, opak olmayan çapraz tarama (40 m; uzakta düz soluk griye
  söner) "unknown — shadowed, ML can't see" — **asla güvenli gösterilmez,
  hiçbir hücre yeşil değildir.** Açıklama kutusu
  ML cümlesi (sayılar `ml_calibration.json`) ve krediler: "LROC NAC:
  NASA/GSFC/Arizona State University", "Craters: Boazman et al. 2024; SomBench
  NAC (NASA–IBM, CC BY 4.0)", "Not an official NASA product."
- **3B sahne.** Temel'de varsayılan görünüm 3B, Orta/İleri'de panorama;
  üçünde de Panorama / Kubbe / 3B düğmesi var. three.js yalnız 3B
  seçilince iner (React.lazy); WebGL yoksa ya da sahne hata verirse kutu
  kendiliğinden panoramaya döner ve not gösterir.
  Zemin tek parça ve dairesel: gerçek arazi (r ≈ 5 km) → etek → `R = 9 km`'de
  tam olarak `R·tan(H(az))` (uzak ufuk) → dışa koni sacak `y = r·tan(H)`
  (20 km'ye kadar, kararan ton). Güneş ve Dünya sonsuzda değil, aynı merkezli
  gök küresinde (`R × 1.1`); ufkun altına inince zemin onları **derinlik
  testiyle** örter, elle gizleme yok (sacak, yüksek kameradan da örtmeyi
  korur). Disk ve küreler kameradan sabit açısal boyutta çizilir. Güneş halesi
  kamera→Güneş ışınında, zeminin ötesinde: yalnız gökyüzüne karşı görünür,
  Güneş sırtın arkasındayken silüeti belli eder (5°, düşük doygunluk; ekran
  kenarında kesik leke bırakmaz). Etek ufka doğru `(1 − s)^2.2` ile kararır,
  ufukta neredeyse siyah: uzak arazi silüete karışır. Sacak gölge almaz,
  normalleri yukarı (H(az) dilimden dilime değiştiği için hesaplanan normaller
  alçak Güneş'te ışınsal çizgi yapıyordu) ve dışa doğru siyaha kararır.
  Dünya'nın gece yüzü çok soluk gri-mavi. `f ≤ 0.5` iken gökten çok zayıf
  yıldız ışığı (hemisphereLight, en fazla 0.3; f 0.5 → 0 arasında açılır):
  arazi silüeti seçilir, not aynen kalır. Yakın arazi (LOLA 50 m
  ızgara) ile uzak ufuk (paketin 20 m / 80 m ışın izlemesi) aynı DEM'den gelir
  ama farklı çözünürlükte; küçük farklar olabilir. Düşey abartı yalnız araziye uygulanır (ufuk ve
  sacak açısal gerçektir). Güneş ışığı `f` ile ölçeklenir; ortam ışığı
  bilerek çok zayıf (yerden kipte "Ay'da hava olmadığı için gölgeler tam
  karanlık." notu). `f ≤ 0.5` iken üstte "Güneş ufkun altında" ya da "Güneş
  uzaktaki arazinin arkasında" notu. Gölge haritası 4096; ilk ölçümde
  (1.–3. sn) fps < 40 ise sessizce 2048'e iner ve oturum boyunca öyle kalır.
  Kamera 3B ilk açıldığında 2 sn'lik uçuşla iner (oturumda bir kez). Tam ekranda
  `ZamanKaydirici` ikinci kez çizilir; oynatma döngüsünü yalnız sayfadaki
  sürer (`surucu={false}`).
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
2. Efemeris + veri (gerçek veri paketi v4, `gercekVeriDonustur.mjs`) ✓
3. Hesap modülü (geri sayım ve özel nokta dahil) + durum deposu
4. Gökyüzü görünümü ← **en kritik parça**
5. Temel sayfa (geri sayım + Ay–Dünya kartı dahil)
6. Zaman çizelgesi
7. Orta sayfa (özel koordinat dahil)
8. Isı haritası
9. Yan yana karşılaştırma
10. İleri sayfa
11. 3B: Ay küresi (bütün alanlar, tıklayınca iniş) + yerel sahne ✓
12. Giriş ekranı

**Not:** 3B küre bütün alanları tek bakışta gösterebilen tek görünüm
(kutup haritası sadece kutup alanlarını gösterir). Zaman kalırsa
önemlidir, ama asıl bilgi 2B gökyüzü görünümündedir.

---

## 13. Veri Kaynakları ve Doğrulama

Kaynak: ekibin veri paketi **Plan B v5 (15 Kasım 2026)**, `veri_kaynak/planb/`
altına açılır. v5'te v4 verisi (sites, ephem, terrain, grid) bayt bayt aynı;
v5 `model.js` ile `veri:donustur` çıktısı birebir aynı çıktı (git diff boş).
v5'in yenisi: ML küçük krater taraması + NAC fotoğrafları (10 alan),
`landingOdds`/`hdaOdds`/`roverRoute` (bu uygulamada henüz kullanılmıyor). Ayrıntı ve her sayının kaynağı paketin `docs/VERI_SOZLESMESI.md`
ve `docs/FIZIK_VE_DENKLEMLER.md` dosyalarında.

- **Efemeris:** NAIF SPICE, DE440, `MOON_ME_DE440_ME421`, ışık zamanı +
  yıldız sapması düzeltmeli; JPL Horizons ile 0.000°. Saatlik, 2026-11 → 2030.
- **Ufuk:** kutupta LOLA (15 km'ye kadar 20 m, 250 km'ye kadar 80 m; bazı
  alanlarda PGDA 104 5 m), kutup dışında SLDEM2015 (≈ 118 m); 720 yön, Ay
  eğriliği dahil, direk 0/2/10 m.
- **Hesap:** paketin `web/js/model.js`'i Python hattıyla birebir
  (`node web/test/model_check.js`); olay zamanları SPICE 1 dk ile ≤ 0.1 dk
  (`event_check.js`). Dönüştürücü az/el'i model.js ile hesaplar.

Doğrulama (dönüştürme sonrası, `hesap.js` ile; 2027 içindeki referans senaryolar):

| Kontrol | Sonuç |
|---|---|
| Güneş % (ort. f), Dünya %, en uzun karanlık, en uzun Dünya'sız — 5 senaryo | paketle aynı (Güneş % farkı ≤ 0.01 puan, yuvarlama) |
| Geri sayım, 17 referans olay (SPICE 1 dk) | 17/17 ±1 saat içinde (en büyük 0.94 sa; saatlik örnekleme) |
| Ufuk çözünürlüğü | 720 yön şart: 360'a inceltince Güneş'in ufukta süründüğü saatlerde (`el − H` ≈ ±0.02°) durum çeviriyor, 5 olay tutmuyordu |
