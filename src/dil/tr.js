// Türkçe sözlük. Anahtarlar ad alanlarına göre (bileşen / konu). Değer metin
// ("{ad}" yer tutuculu) ya da fonksiyon (params, b, t) → metin olabilir;
// b = dil/index.js bicim('tr'). en.js ile aynı anahtarları taşır.

import { AY_BULUNMA, adEki, basHarfBuyuk, bulunmaEki, yuzdeIyelik, yuzdeYonelme } from './ekler.js'

export default {
  uygulama: {
    baslik: 'Ay İniş Alanı Navigatörü',
    yukleniyor: 'Yükleniyor…',
  },
  dil: {
    etiket: 'Dil',
  },
  ortak: {
    gunes: 'Güneş',
    dunya: 'Dünya',
    ay: 'Ay',
    // Pusula yönleri (kısa)
    yonler: { K: 'K', D: 'D', G: 'G', B: 'B', KD: 'KD', GD: 'GD', GB: 'GB', KB: 'KB' },
    kapat: 'Kapat',
    yok: '—',
  },
  kategori: {
    artemis: 'Artemis',
    clps: 'CLPS',
    apollo: 'Apollo',
    uluslararasi: 'Uluslararası',
    ozel: 'Özel nokta',
  },
  geriSayim: {
    gunBatimi: 'Gün batımına',
    gunDogumu: 'Gün doğumuna',
    dunyaBatisi: 'Dünya batışına',
    dunyaDogusu: 'Dünya doğuşuna',
    batmiyor: 'Bu dönemde batmıyor',
    dogmuyor: 'Bu dönemde doğmuyor',
    dunyaIletisim: 'Dünya ile iletişim',
  },
  hata: {
    inisHesaplanamadi: 'Başarı olasılığı şu an hesaplanamıyor.',
    yuklenemedi: '{dosya} yüklenemedi (HTTP {durum})',
    dosyaYok: 'bolgeler.json\'da "{site}" için "file" yok',
    pencereTasiyor: 'Pencere 2027 verisinin dışına taşıyor',
    gecersizEnlem: 'Geçersiz enlem: {deger}',
    gecersizBoylam: 'Geçersiz boylam: {deger}',
  },
  ozel: {
    ad: 'Özel nokta ({lat}°, {lon}°)',
    adKisa: 'Özel nokta',
    duz: {
      kisa: 'Arazi hesaba katılmadı',
      uzun: 'Arazi hesaba katılmadı — ufuk düz kabul edildi. Gerçek değerler farklı olabilir.',
      csv: '# Arazi hesaba katılmadı',
    },
    kaba: {
      kisa: 'Kaba ufuk (400 m arazi)',
      uzun: 'Kaba tahmin: 400 m arazi; Güneş % ortalama +8 puan fazla çıkabilir (RMSE 12).',
      csv: '# Kaba ufuk: 400 m kutup DEM (Güneş % ort. +8 puan fazla, RMSE 12)',
    },
  },
  // --- Sayfalar, alan listesi, zaman kaydırıcı, gökyüzü kutusu, dışa aktarma ---
  sayfa: {
    gokyuzu: 'Gökyüzü',
    zamanCizelgesi: 'Zaman çizelgesi',
    isiHaritasi: 'Isı haritası',
    karsilastirma: 'Karşılaştırma',
    ozet: 'Özet',
    disaAktar: 'Dışa aktar',
    parametreler: 'Parametreler',
    inisAlani: 'İniş alanı',
    kutupHaritasi: 'Güney kutbu haritası',
    ozelKoordinat: 'Özel koordinat',
    gorevAyarlari: 'Görev ayarları',
    sayisalOzet: 'Sayısal özet',
    ayarlar: 'Mod ve dil',
  },
  mod: {
    etiket: 'Mod',
    temel: 'Temel',
    orta: 'Orta',
    ileri: 'İleri',
  },
  alanListesi: {
    yuklenemedi: 'Alan listesi yüklenemedi.',
    liste: 'İniş alanları',
    eslesmeYok: 'Eşleşen alan yok.',
    aramaIpucu: 'Alan ara (ad veya açıklama)',
    aramaEtiket: 'Alan ara',
  },
  ozelKoordinat: {
    enlem: 'Enlem (°)',
    boylam: 'Boylam (°)',
    enlemHata: 'Enlem −90 ile 90 arasında olmalı.',
    boylamHata: 'Boylam 0…360 ya da −180…180 arasında olmalı.',
    goster: 'Göster',
    not: "80°G'nin güneyinde ufuk 400 m kutup arazisinden kaba olarak hesaplanır; diğer yerlerde düz kabul edilir. Doğru arazi yalnızca listedeki alanlarda var.",
  },
  disaAktar: {
    kapsam: {
      gorev: 'Görev aralığı',
      yil: 'Tüm yıl',
    },
    kapsamEtiket: 'CSV kapsamı',
    indir: 'CSV indir',
    tasiyor: 'Görev veri aralığının dışına taşıyor.',
    satir: '{n} satır + başlık',
    ilkSatir: 'Dosyanın ilk satırı: “{not}”',
  },
  gokyuzuKutusu: {
    baslik: 'Gökyüzü',
    gorunumEtiket: 'Gökyüzü görünümü',
    gorunum: {
      panorama: 'Panorama',
      kubbe: 'Kubbe',
      '3b': '3B',
    },
    veriYuklenemedi: 'Veri yüklenemedi: {hata}',
    ucAcilamadi: '3B açılamadı',
    ucNot: '3B görünüm açılamadı ({hata}); panorama gösteriliyor.',
    araziNotu: 'Arazi ~{m} m çözünürlükte.',
  },
  zamanKaydirici: {
    oynat: 'Oynat',
    durdur: 'Durdur',
    zaman: 'Zaman',
  },
  durum: {
    gunesGorunur: 'Güneş görünür',
    gunesKismen: 'Güneş kısmen görünür',
    golgede: 'Gölgede',
    baglanti: 'Dünya ile bağlantı var',
    baglantiYok: 'Bağlantı yok',
    iletisim: 'İletişim',
    yukseklik: 'Yükseklik {deger}',
    dunyaYukseklik: 'Dünya yüksekliği {deger}',
  },
  // --- Grafikler: gökyüzü, zaman çizelgesi, ısı haritası, kutup haritası ---
  gokyuzu: {
    aria: 'Gökyüzü görünümü: Güneş yüksekliği {gunesAlt}, azimut {gunesAz}; Dünya yüksekliği {dunyaAlt}, azimut {dunyaAz}',
    // Panorama fare etiketi: o azimuttaki ufuk yüksekliği
    ufukIpucu: 'Az {az}° · ufuk {ufuk}',
    // Kubbe fare etiketi: imlecin altındaki noktanın yüksekliği
    yukseklikIpucu: 'Az {az}° · yük. {yukseklik}',
  },
  zamanCizelgesi: {
    aydinlanma: 'Aydınlanma',
    iletisim: 'İletişim',
    aria: 'Zaman çizelgesi: aydınlanma ve iletişim',
    // "14 Mar, 08:00"
    kisaTarih: ({ d }, b) => `${d.getUTCDate()} ${b.ayKisa(d)}, ${b.saat(d)}`,
  },
  isiHaritasi: {
    baslik: 'Isı haritası',
    ozet: ({ D, hm }, b) => `Görev: ${b.gunSayisi(D)} · Direk: ${hm} m`,
    olcekAria: 'Renk ölçeği: koyu düşük puan, parlak yüksek puan',
    dusuk: 'düşük',
    yuksek: 'yüksek',
    filtreAria: 'Kategori filtresi',
    aciklama: 'Her sütun bir iniş haftası. Parlak hücre: daha çok güneş ve iletişim, daha kısa karanlık. Beyaz nokta: satırın en iyi haftası.',
    yuklenemedi: 'Isı haritası verisi yüklenemedi.',
    bos: 'Gösterilecek alan yok — yukarıdan bir kategori seçin.',
    canvasAria: 'Isı haritası: {alan} alan, {hafta} haftalık iniş tarihi. Hücreye tıklamak alanı ve iniş tarihini seçer.',
    inis: 'İniş: {tarih}',
    tasiyor: 'Görev veri aralığının dışına taşıyor.',
    aydinlanma: 'Aydınlanma',
    iletisim: 'İletişim',
    enUzunKaranlik: 'En uzun karanlık',
    puan: 'Puan',
    shiftIpucu: 'Shift+tıklama: karşılaştırmaya ekle',
    epsilonNot: 'Isı haritası ε = {eps}° ile önceden hesaplanmıştır.',
  },
  kutupHaritasi: {
    dunyaYonu: '0° · Dünya yönü',
    kuzeyde: 'Seçili alan kuzey kutup bölgesinde — bu harita güneyi gösterir',
    kutupDisi: 'Seçili alan kutup bölgesinde değil',
    aria: 'Güney kutbu haritası, {enlem}° güney enlemine kadar. Alan seçmek için noktaya, özel nokta için boş bir yere tıklayın.',
  },
  // --- Karşılaştırma, sayısal özet, parametreler, Ay–Dünya kartı ---
  karsilastirma: {
    baslik: 'Karşılaştırma',
    turEtiket: 'Karşılaştırma türü',
    sekme: { alan: 'Alanları karşılaştır', tarih: 'Tarihleri karşılaştır' },
    // Sütunun cümledeki adları. p: { tur: 'alan'|'tarih', ad, ozel, gun }
    // ozne: "Malapert Massif" / "2 Temmuz inişi"; tamlayan (yönelme): "Haworth'a" / "1 Ocak inişine";
    // bulunma: "Haworth'ta" / "1 Ocak inişinde". "özel nokta" cins ad: kesme işareti yok.
    ozne: (p, b, t) => (p.tur === 'tarih' ? `${p.gun} inişi` : p.ozel ? t('ozel.adKisa') : p.ad),
    tamlayan: (p) => (p.tur === 'tarih' ? `${p.gun} inişine` : p.ozel ? 'özel noktaya' : `${p.ad}'${adEki(p.ad || 'a')}`),
    bulunma: (p) => (p.tur === 'tarih' ? `${p.gun} inişinde` : p.ozel ? 'özel noktada' : `${p.ad}'${bulunmaEki(p.ad || 'a')}`),
    // Sonuç cümlesi. iyi / diger: sütun adı parametreleri (yukarıdaki p)
    cumle: {
      alanEkle: 'Karşılaştırmak için bir alan daha ekleyin.',
      tarihSec: 'Karşılaştırmak için ikinci bir tarih seçin.',
      tasiyor: 'Görev veri aralığının dışına taşıyor; karşılaştırma yapılamıyor.',
      farkYok: 'Seçenekler arasında belirgin fark yok.',
      // { iyi, diger, once, sonra } — saatler tam sayı
      karanlik: ({ iyi, diger, once, sonra }, b, t) =>
        `${t('karsilastirma.ozne', iyi)}, ${t('karsilastirma.tamlayan', diger)} göre en uzun karanlığı ${once} saatten ${sonra} saate indiriyor.`,
      // { iyi, diger, saat }
      hicKaranlik: ({ iyi, diger, saat }, b, t) =>
        `${basHarfBuyuk(t('karsilastirma.bulunma', iyi))} görev boyunca hiç karanlık yaşanmıyor (${t('karsilastirma.bulunma', diger)} en uzun karanlık ${saat} saat).`,
      hicKesinti: ({ iyi, diger, saat }, b, t) =>
        `${basHarfBuyuk(t('karsilastirma.bulunma', iyi))} görev boyunca hiç iletişim kesintisi yok (${t('karsilastirma.bulunma', diger)} en uzun iletişim kesintisi ${saat} saat).`,
      // { iyi, diger, D, fark, x, y } — x, y: 0…1 oran
      gunes: ({ iyi, diger, D, fark, x, y }, b, t) =>
        `${t('karsilastirma.ozne', iyi)}, ${D} günlük görevde ${t('karsilastirma.tamlayan', diger)} göre ${fark} puan daha fazla güneş alıyor (${yuzdeYonelme(Math.round(x * 100))} karşı ${b.yuzde(y)}).`,
      iletisim: ({ iyi, diger, D, fark, x, y }, b, t) =>
        `${t('karsilastirma.ozne', iyi)}, ${D} günlük görevde ${t('karsilastirma.tamlayan', diger)} göre ${fark} puan daha fazla iletişim süresi sağlıyor (${yuzdeYonelme(Math.round(x * 100))} karşı ${b.yuzde(y)}).`,
    },
    olcut: {
      fBar: 'Aydınlanma',
      cBar: 'İletişim',
      tauMax: 'En uzun karanlık',
      sigmaMax: 'En uzun iletişim kesintisi',
      puan: 'Puan',
    },
    gorevGunu: 'Görevin {n}. günü',
    inisKalan: 'İnişe {n} gün var',
    alanEkle: '+ Alan ekle',
    alanEkleAria: 'Karşılaştırmaya alan ekle',
    tarihAria: '{sira}. iniş tarihi',
    inisSecenek: '{gun} inişi',
    kaldir: 'Kaldır',
    kaldirAria: '{ad} alanını karşılaştırmadan kaldır',
    yuklenemedi: 'Veri yüklenemedi.',
    olcutAria: '{ozne}: {D} günlük görev ölçütleri',
    gorevBaslik: '{D} günlük görev',
  },
  sayisalOzet: {
    gunesYuksekligi: 'Güneş yüksekliği',
    dunyaYuksekligi: 'Dünya yüksekliği',
    aydinlanmaOrani: 'Aydınlanma oranı',
    iletisimOrani: 'İletişim oranı',
    enUzunKaranlik: 'En uzun karanlık',
    enUzunKesinti: 'En uzun iletişim kesintisi',
    tasiyor: 'Görev veri aralığının dışına taşıyor.',
    sonDortSatir: 'Son dört satır görev aralığı içindir.',
    geriSayim: 'Geri sayım',
    gecis: {
      gunBatimi: 'Gün batımı',
      gunDogumu: 'Gün doğumu',
      dunyaBatisi: 'Dünya batışı',
      dunyaDogusu: 'Dünya doğuşu',
    },
    veriYok: 'veri aralığında yok',
    sonra: 'sonra',
    anlikGuc: 'Anlık güç',
    gorevAraligi: 'Görev aralığı · {D} gün',
    toplamEnerji: 'Toplam enerji E',
    ortalamaGuc: 'Ortalama güç',
    puan: 'Puan',
  },
  parametre: {
    inisTarihi: 'İniş tarihi',
    gorevSuresi: 'Görev süresi',
    direkYuksekligi: 'Direk yüksekliği',
    yonelim: { izleyen: 'İzleyen', dikey: 'Dikey', yatay: 'Yatay' },
    panelYonelimi: 'Panel yönelimi',
    epsilon: 'İletişim güvenlik payı ε',
    panelAlani: 'Panel alanı S',
    panelAlaniAria: 'Panel alanı (m²)',
    alanAralik: '{min} ile {max} m² arasında olmalı.',
    panelVerimi: 'Panel verimi η',
    farkli: '{n} parametre varsayılandan farklı',
    varsayilanaDon: 'Varsayılana dön',
    bolum: {
      konum: 'Konum',
      harita: 'Kutup haritası',
      gorev: 'Görev',
      donanim: 'Donanım',
      puanlama: 'Puanlama',
    },
    w1: 'w1 · Aydınlanma',
    w2: 'w2 · İletişim',
    w3: 'w3 · Karanlık cezası',
    formul: 'puan = w1·aydınlanma + w2·iletişim − w3·(en uzun karanlık ÷ görev süresi)',
  },
  ayDunya: {
    baslik: "Ay'da gökyüzü neden farklı?",
    gun: 'Burada bir gün, yani güneşin doğup tekrar doğması, 29.5 Dünya günü sürer.',
    gunesYukselir: "Güneş burada en fazla {derece}° yükselir. Dünya'da orta enlemlerde yaz öğlesinde bu açı yaklaşık 70°'dir.",
    dunyaGorunmez: "Bu alandan Dünya hiç görünmez — Ay'ın uzak yüzündesiniz. Haberleşme için uydu gerekir.",
    dunyaSalinir: 'Dünya gökte neredeyse yerinden kıpırdamaz; yalnızca ±{derece}° salınır.',
    buyukluk: "Ay'dan bakınca Dünya, Güneş'ten yaklaşık {oran} kat büyük görünür ({dunya}° / {gunes}°).",
    tepe: 'Güneş ufka çok yakın dolaştığı için birkaç metrelik bir tepe bile kilometrelerce gölge yapar.',
  },
  // --- 3B yerel sahne, ML katmanları, krater kartı, pusula ---
  // 3B yerel sahne (AraziSahnesi)
  sahne: {
    kamera: {
      etiket: 'Kamera',
      yerden: 'Yerden',
      kus: 'Kuş bakışı',
      gunes: "Güneş'e bak",
      dunya: "Dünya'ya bak",
    },
    abarti: 'Düşey abartı',
    abartiOneri: 'kutupta 2× önerilir',
    mlKatmanlari: 'ML katmanları',
    katman: {
      foto: 'Fotoğraf',
      krater: 'Küçük kraterler (ML)',
      tehlike: 'Tehlike',
    },
    kraterBoyutu: 'Krater boyutu',
    kraterTumu: 'tümü (≥ 10 m)',
    yerdenNot: "Ay'da hava olmadığı için gölgeler tam karanlık.",
    karanlik: {
      ufukAltinda: 'Güneş ufkun altında',
      araziArkasinda: 'Güneş uzaktaki arazinin arkasında',
    },
    yukleniyor: 'Arazi verisi yükleniyor…',
    yuklenemedi: 'Arazi verisi yüklenemedi',
    araziYuklenemedi: '3B arazi yüklenemedi (HTTP {durum})',
    neverLit: '18 yılda hiç güneş almayan bölge',
    duz: 'Arazi verisi yok: düz zemin',
    kaba: "Kaba arazi: 400 m kutup DEM'i (küçük tepeler görünmez)",
    fotoAciklama: 'LROC NAC fotoğrafı (ışık fotoğraftan, sahne ışığından bağımsız)',
    kraterAciklama: 'ML kraterleri ({esik}, {sayi}) · tıklayın: ayrıntı',
    guvenSkoru: 'ML güven skoru',
    tehlikeAciklama: 'Tehlike: iniş ayağının krater payı g (100 m hücre)',
    tehlikeOlcek: 'g < 0.10 neredeyse saydam · 0.10–0.30 açık turuncu · ≥ 0.30 koyu turuncu-kırmızı',
    bilinmiyor: "unknown — shadowed, ML can't see (bilinmiyor, güvenli değil)",
  },
  // Tıklanan ML kraterinin kartı (KraterKarti)
  kraterKarti: {
    aria: 'Krater bilgisi',
    baslik: 'Krater · D ≈ {cap} m',
    kapat: 'Kapat (ESC)',
    guven: (p, b) => `ML güven skoru: ${b.yuzde(p.guven)} (olasılık değil)`,
    isabet: (p) => `Bu boyuttaki tespitlerin ~${yuzdeIyelik(p.yuzde)} gerçek krater (kutup testi, ${p.aralik})`,
    hucreTehlikesi: 'Hücre tehlikesi',
    bilinmiyorGolge: 'bilinmiyor — gölge',
    pencere: {
      etiket: 'İniş penceresi',
      t14: "{gun} gün (t'den)",
      gorev: 'Görev penceresi (tL, D)',
    },
    batarya: 'Batarya',
    hesaplanamadi: 'Hesaplanamadı: {hata}',
    hesaplaniyor: 'Buraya inersen: başarı hesaplanıyor…',
    basari: 'Buraya inersen: başarı',
    neden: {
      ground: 'krater',
      slope: 'eğim',
      dark: 'uzun karanlık',
      noEarth: 'iletişim kesintisi',
      outside: 'ızgara dışına düşme',
    },
    // %0 durumunda gerekçenin açık cümlesi
    nedenUzun: {
      dark: (p, b) => `Uzun karanlık: ${b.tamSaat(p.batarya)} batarya bu pencerede yetmiyor`,
      noEarth: (p, b) => `İletişim kesintisi: Dünya ${b.tamSaat(p.tampon)} tampondan uzun görünmüyor`,
      slope: "Eğim: çevredeki zemin {egim}°'den dik",
      ground: 'Krater riski: çevre küçük kraterlerle dolu',
      outside: 'Hedef ızgara kenarına çok yakın: iniş dışarı düşüyor',
    },
    araniyor: 'Daha iyi bir tarih aranıyor…',
    oneriBaslik: (p, b) => `${b.tarih(p.tarih)} başlangıçlı ${b.gunSayisi(p.gun)} — zamanı oraya taşı`,
    // "→ 9 Eylül'de inersen:"
    oneri: (p, b) => `→ ${p.tarih.getUTCDate()} ${b.ay(p.tarih)}'${AY_BULUNMA[p.tarih.getUTCMonth()]} inersen:`,
    oneriYok: (p, b) => `2027 sonuna kadar ${b.yuzdeSayi(50)}'yi geçen ${p.gun} günlük başlangıç yok${p.bataryaOner ? '; daha büyük batarya dene.' : '.'}`,
    basarisizlik: (p, b) => `başarısızlığın çoğu: ${p.neden} (${b.yuzde(p.pay)})`,
    dipnot: (p, b) =>
      `Hedef bu 100 m hücre; ${p.bas} + ${b.gunSayisi(p.gun)}, σ ${p.sigma} m, eğim ≤ ${p.egim}°, tampon ${b.tamSaat(p.tampon)}, ML krater riski dahil.`,
    uyari: 'Güven skoru olasılık değildir; model kalibre edilmedi.',
  },
  // ML katmanları açıklaması (MlKatmanlari.mlAciklamasi)
  ml: {
    aciklamaKisa: 'ML: YOLOv8, 1 m LROC NAC, D ≥ {dMin} m. Kalıcı gölgede görüntü yok → bilinmiyor.',
    aciklama:
      'ML: YOLOv8, 1 m LROC NAC, D ≥ {dMin} m. Bölge ortalamasında güvenilir (ML {ml} / uzman {uzman}), tek hücrede kaba (±{mae}). Kalıcı gölgede görüntü yok → bilinmiyor.',
  },
  // Sahne içi etiketler (Pusula.sahneEtiketleri)
  pusula: {
    dunyaYonu: 'Dünya yönü',
    ufkunAltinda: '(ufkun altında)',
    inisNoktasi: 'İniş noktası',
  },
  // --- 3B Ay küresi, 3B kabuğu, tam ekran ---
  kure: {
    yukleniyor: 'Ay yükleniyor…',
    dokuYuklenemedi: 'Ay dokusu yüklenemedi',
    sahneYukleniyor: '3B sahne yükleniyor…',
    artemisIII: 'Artemis III',
    ozelAciklama: 'Özel koordinat (arazi düz kabul edilir)',
    inisAria: '{ad}: yerel sahneye in',
    gorev: '{gun} günlük görev',
    kredi: "Ay dokusu: NASA's Scientific Visualization Studio",
    ipucu: 'Bir alana tıklayın: yerel sahneye inilir',
    hata: {
      yukseklik: 'Ay yükseklik haritası yüklenemedi (HTTP {durum})',
      doku: 'Ay dokusu yüklenemedi: {dosya}',
      pngDegil: 'PNG değil',
      pngBicim: 'Yalnız 16 bit gri, taramasız PNG desteklenir',
      pngEksik: 'PNG verisi eksik',
      pngFiltre: 'Bilinmeyen PNG filtresi {filtre}',
    },
  },
  ucBoyut: {
    gezinti: '3B gezinti',
    inis: 'Yerel sahneye in',
    tamEkran: 'Tam ekran (F)',
    tamEkranCik: 'Tam ekrandan çık (ESC)',
    hata: {
      webglYok: 'WebGL yok',
    },
  },
}
