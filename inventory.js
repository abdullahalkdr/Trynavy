/* inventory.js — NAVY lightweight Inventory Plugin (LocalStorage)
   مفاتيح التخزين:
   - navy_inventory     : مصفوفة المنتجات {id, sku, name, priceKwd, stock, size, color, image}
   - navy_inventory_log : سجل الحركات
*/
const Inventory = (() => {
  const INV_KEY = 'navy_inventory';
  const LOG_KEY = 'navy_inventory_log';

  // --- Utils ---
  const load = () => JSON.parse(localStorage.getItem(INV_KEY) || '[]');
  const save = (arr) => localStorage.setItem(INV_KEY, JSON.stringify(arr));
  const loadLog = () => JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  const saveLog = (arr) => localStorage.setItem(LOG_KEY, JSON.stringify(arr));
  const now = () => new Date().toISOString();

  // Seed once (تقدر تشيلها بعد أول تشغيل)
  function seedIfEmpty() {
    const cur = load();
    if (cur.length) return;
    const sample = [
      { id:'p-1001', sku:'TSH-001', name:'تيشيرت أبيض',  priceKwd:7.000,  stock:25, size:'M',  color:'White', image:'https://picsum.photos/600/700?random=1' },
      { id:'p-1002', sku:'SRT-220', name:'شورت صيفي',    priceKwd:5.500,  stock:18, size:'L',  color:'Beige', image:'https://picsum.photos/600/700?random=2' },
      { id:'p-1003', sku:'JOG-777', name:'بنطلون رياضي', priceKwd:8.000,  stock:12, size:'XL', color:'Black', image:'https://picsum.photos/600/700?random=3' },
    ];
    save(sample);
    log({ type:'seed', items: sample.length });
  }

  function log(entry) {
    const lg = loadLog();
    lg.push({ ts: now(), ...entry });
    saveLog(lg);
  }

  // --- Core API ---
  function all() { return load(); }
  function findById(id) { return load().find(p => p.id === id) || null; }
  function upsert(product) {
    const arr = load();
    const i = arr.findIndex(p => p.id === product.id);
    if (i === -1) { arr.push(product); log({ type:'create', id:product.id, delta:+product.stock || 0 }); }
    else {
      const prev = arr[i];
      arr[i] = { ...prev, ...product };
      log({ type:'update', id:product.id });
    }
    save(arr);
    return arr[i === -1 ? arr.length - 1 : i];
  }

  function adjustStock(id, delta) {
    const arr = load();
    const i = arr.findIndex(p => p.id === id);
    if (i === -1) throw new Error('Product not found');
    const next = Math.max(0, Number(arr[i].stock || 0) + Number(delta || 0));
    arr[i].stock = next;
    save(arr);
    log({ type:'adjust', id, delta:Number(delta || 0), stock:next });
    return next;
  }

  function setStock(id, qty) {
    const arr = load();
    const i = arr.findIndex(p => p.id === id);
    if (i === -1) throw new Error('Product not found');
    const prev = Number(arr[i].stock || 0);
    arr[i].stock = Math.max(0, Number(qty || 0));
    save(arr);
    log({ type:'set', id, from:prev, to:arr[i].stock });
    return arr[i].stock;
  }

  // تحقّق المخزون قبل إضافة السلة
  function canFulfill(id, qty) {
    const p = findById(id);
    return !!p && Number(p.stock || 0) >= Number(qty || 1);
  }

  // خصم مخزون بناءً على عناصر سلة
  // cartLines: [{id, qty}]
  function reserveForCart(cartLines=[]) {
    const arr = load();
    // تحقق أولاً
    for (const line of cartLines) {
      const p = arr.find(x => x.id === line.id);
      if (!p || p.stock < line.qty) {
        return { ok:false, reason:`Out of stock: ${line.id}` };
      }
    }
    // خصم
    cartLines.forEach(line => {
      const i = arr.findIndex(x => x.id === line.id);
      arr[i].stock -= Number(line.qty||1);
      log({ type:'reserve', id:line.id, qty:Number(line.qty||1) });
    });
    save(arr);
    return { ok:true };
  }

  // استرجاع المخزون (مثلاً إذا لغى الطلب)
  function release(cartLines=[]) {
    cartLines.forEach(line => adjustStock(line.id, Number(line.qty||1)));
    log({ type:'release', items: cartLines.length });
  }

  // سجل الحركات
  function history(limit=100) {
    const lg = loadLog();
    return lg.slice(-limit).reverse();
  }

  // تهيئة أولية
  seedIfEmpty();

  return {
    all, findById, upsert, setStock, adjustStock,
    canFulfill, reserveForCart, release, history
  };
})();
