// Plan B veri paketinin hesap kütüphanesi (web/js/model.js), olduğu gibi.
// npm run veri:donustur her çalıştığında paketteki sürüm src/vendor/planb/'ye
// kopyalanır. Ana iş parçacığı (özel koordinatın kaba ufku) ve iniş olasılığı
// işçisi (inisIsci.js) AYNI yoldan, bu modülden alır.
//
// Dosya bir UMD sarmalayıcısıdır:
//   if (typeof module !== "undefined") module.exports = M; else g.Model = M;
// Geliştirmede (Vite dev) dosya düz ES modülü olarak sunulur: `module` yok →
// globalThis.Model (ana iş parçacığında window, işçide self) kurulur.
// Derlemede ise Rolldown dosyayı CommonJS sayıp sarmalayıcıya bir `module`
// verir → M yalnız module.exports'a gider, globalThis.Model HİÇ kurulmaz.
// İkisini de karşılamak için: varsayılan dışa aktarım (CommonJS birlikte
// çalışması) varsa o, yoksa globalThis.Model.

import * as paket from '../vendor/planb/model.js'

const Model = paket.default ?? globalThis.Model
if (typeof Model?.loadEphem !== 'function') {
  throw new Error('planb model.js could not be loaded (neither module.exports nor globalThis.Model)')
}
export default Model
