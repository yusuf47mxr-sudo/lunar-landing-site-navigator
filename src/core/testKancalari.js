// Test kancaları (window.__durum, window.__yerelIzdusum …): geliştirmede her
// zaman; derlemede yalnız adres "?test" içerirse (tarayıcı testleri derlenmiş
// sürümü de sürebilsin). Normal kullanımda derlemede kapalı.
export const TEST_KANCALARI =
  import.meta.env.DEV || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('test'))
