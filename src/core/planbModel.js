// Plan B veri paketinin hesap kütüphanesi (web/js/model.js), olduğu gibi.
// npm run veri:donustur her çalıştığında paketteki sürüm src/vendor/planb/'ye
// kopyalanır. Dosya bir IIFE'dir: ES modülünde `module` olmadığı için
// window.Model (Node'da globalThis.Model) olarak kurulur; buradan dışa verilir.
// Bu uygulamada yalnız özel koordinatın kaba ufku (horizonFromDem) kullanılır.

import '../vendor/planb/model.js'

const Model = globalThis.Model
export default Model
