import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const DB = {
  get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.error("Storage error:", e); } },
};

const SEED_PLANTS = [
  { id: "p1", name: "Japanese Maple", category: "Trees", size: '5 gal', price: 45.00, quantity: 24, packSize: 1, comments: "Fall color specimen", variety: "Bloodgood" },
  { id: "p2", name: "Lavender", category: "Perennials", size: '1 gal', price: 8.50, quantity: 120, packSize: 18, comments: "Fragrant, drought tolerant", variety: "Hidcote" },
  { id: "p3", name: "Knockout Rose", category: "Shrubs", size: '3 gal', price: 22.00, quantity: 56, packSize: 8, comments: "Disease resistant, reblooming", variety: "Double Red" },
  { id: "p4", name: "Blue Fescue", category: "Grasses", size: '1 gal', price: 6.00, quantity: 200, packSize: 32, comments: "Silver-blue foliage", variety: "Elijah Blue" },
  { id: "p5", name: "Dwarf Alberta Spruce", category: "Trees", size: '5 gal', price: 38.00, quantity: 18, packSize: 1, comments: "Slow growing, conical form", variety: "Conica" },
  { id: "p6", name: "Hosta", category: "Perennials", size: '1 gal', price: 12.00, quantity: 80, packSize: 12, comments: "Giant chartreuse leaves", variety: "Sum & Substance" },
  { id: "p7", name: "Crepe Myrtle", category: "Trees", size: '15 gal', price: 89.00, quantity: 8, packSize: 1, comments: "White blooms, exfoliating bark", variety: "Natchez" },
  { id: "p8", name: "Boxwood", category: "Shrubs", size: '3 gal', price: 18.50, quantity: 0, packSize: 10, comments: "Dense, formal hedging", variety: "Green Velvet" },
  { id: "p9", name: "Daylily", category: "Perennials", size: '1 gal', price: 7.00, quantity: 150, packSize: 18, comments: "Reblooming yellow", variety: "Stella de Oro" },
  { id: "p10", name: "Maiden Grass", category: "Grasses", size: '3 gal', price: 16.00, quantity: 45, packSize: 6, comments: "Graceful plumes in fall", variety: "Gracillimus" },
  { id: "p11", name: "Hydrangea", category: "Shrubs", size: '3 gal', price: 28.00, quantity: 35, packSize: 6, comments: "Reblooming, color-changing", variety: "Endless Summer" },
  { id: "p12", name: "Japanese Maple", category: "Trees", size: '15 gal', price: 125.00, quantity: 6, packSize: 1, comments: "Weeping form, red lace-leaf", variety: "Crimson Queen" },
  { id: "p13", name: "Salvia", category: "Perennials", size: '1 gal', price: 7.50, quantity: 90, packSize: 18, comments: "Long blooming, hummingbird magnet", variety: "May Night" },
  { id: "p14", name: "Arborvitae", category: "Trees", size: '5 gal', price: 32.00, quantity: 40, packSize: 4, comments: "Fast growing privacy screen", variety: "Green Giant" },
  { id: "p15", name: "Knockout Rose", category: "Shrubs", size: '3 gal', price: 22.00, quantity: 42, packSize: 8, comments: "Disease resistant", variety: "Pink" },
  { id: "p16", name: "Black-Eyed Susan", category: "Perennials", size: '1 gal', price: 6.50, quantity: 110, packSize: 18, comments: "Native wildflower, drought tolerant", variety: "Goldsturm" },
  { id: "p17", name: "Fountain Grass", category: "Grasses", size: '3 gal', price: 14.00, quantity: 60, packSize: 8, comments: "Burgundy foliage, annual in cold zones", variety: "Rubrum" },
  { id: "p18", name: "Azalea", category: "Shrubs", size: '3 gal', price: 19.00, quantity: 3, packSize: 6, comments: "Spring bloomer, evergreen", variety: "Encore Autumn Amethyst" },
];

const SEED_ORDERS = [
  { id: "ord-001", customerName: "Valley Landscaping", customerEmail: "info@valleylandscaping.com", customerPhone: "(209) 555-0142", notes: "Will pick up Friday AM", status: "pending", items: [{ plantId: "p1", plantName: "Japanese Maple - Bloodgood", quantity: 3, unitPrice: 45.00 }, { plantId: "p3", plantName: "Knockout Rose - Double Red", quantity: 12, unitPrice: 22.00 }], createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "ord-002", customerName: "Sara Mitchell", customerEmail: "sara.m@email.com", customerPhone: "(209) 555-0298", notes: "", status: "confirmed", items: [{ plantId: "p6", plantName: "Hosta - Sum & Substance", quantity: 6, unitPrice: 12.00 }], createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const Icon = ({ name, size = 20 }) => {
  const s = { width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    search: <svg {...s} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>,
    cart: <svg {...s} viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a1 1 0 001 .61h9.72a1 1 0 001-.76L23 6H6"/></svg>,
    x: <svg {...s} viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
    upload: <svg {...s} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
    download: <svg {...s} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
    leaf: <svg {...s} viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34M17 8A5 5 0 006 13M17 8l4-4"/></svg>,
    box: <svg {...s} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>,
    clipboard: <svg {...s} viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg>,
    check: <svg {...s} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
    arrowLeft: <svg {...s} viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
    mail: <svg {...s} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>,
    settings: <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    trash: <svg {...s} viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
    edit: <svg {...s} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    minus: <svg {...s} viewBox="0 0 24 24"><path d="M5 12h14"/></svg>,
    plus: <svg {...s} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
    chevronUp: <svg {...s} viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>,
    chevronDown: <svg {...s} viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>,
  };
  return icons[name] || null;
};

const fmt = (n) => "$" + Number(n).toFixed(2);
const genId = () => "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const CATEGORIES = ["All", "Trees", "Shrubs", "Perennials", "Grasses", "Annuals", "Vines", "Groundcovers", "Succulents", "Other"];

export default function App() {
  const [view, setView] = useState("shop");
  const [plants, setPlants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let p = DB.get("plants");
    let o = DB.get("orders");
    if (!p) { p = SEED_PLANTS; DB.set("plants", p); }
    if (!o) { o = SEED_ORDERS; DB.set("orders", o); }
    setPlants(p); setOrders(o); setLoaded(true);
  }, []);

  const savePlants = useCallback((p) => { setPlants(p); DB.set("plants", p); }, []);
  const saveOrders = useCallback((o) => { setOrders(o); DB.set("orders", o); }, []);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const updateCartQty = (plantId, qty) => {
    if (qty <= 0) { setCart(prev => prev.filter(c => c.plantId !== plantId)); return; }
    const plant = plants.find(p => p.id === plantId);
    if (!plant || plant.quantity <= 0) return;
    const clampedQty = Math.min(qty, plant.quantity);
    setCart(prev => {
      const existing = prev.find(c => c.plantId === plantId);
      if (existing) return prev.map(c => c.plantId === plantId ? { ...c, quantity: clampedQty } : c);
      return [...prev, { plantId: plant.id, plantName: `${plant.name}${plant.variety ? ' - ' + plant.variety : ''}`, quantity: clampedQty, unitPrice: plant.price }];
    });
  };

  const removeFromCart = (plantId) => setCart(prev => prev.filter(c => c.plantId !== plantId));

  const submitOrder = (customerInfo) => {
    const updatedPlants = plants.map(p => {
      const cartItem = cart.find(c => c.plantId === p.id);
      if (cartItem) return { ...p, quantity: Math.max(0, p.quantity - cartItem.quantity) };
      return p;
    });
    const newOrder = { id: "ord-" + genId(), ...customerInfo, status: "pending", items: cart.map(c => ({ ...c })), createdAt: new Date().toISOString() };
    savePlants(updatedPlants); saveOrders([newOrder, ...orders]); setCart([]);
    showToast("Order submitted! A confirmation email would be sent in production.");
    return newOrder;
  };

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#f7f5f0" }}>
      <div style={{ textAlign: "center", color: "#6b7c5e" }}><Icon name="leaf" size={40} /><div style={{ marginTop: 12, fontSize: 14, letterSpacing: 2 }}>LOADING...</div></div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#f7f5f0", color: "#2c2c2c" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {toast && <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "error" ? "#c0392b" : "#4a6741", color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "slideIn .3s ease" }}>{toast.msg}</div>}
      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, textarea, button { font-family: inherit; }
        button { cursor: pointer; border: none; background: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #c4bfb4; border-radius: 3px; }
        .row-hover:hover { background: #f5f3ed !important; }
        .order-input:focus { outline: 2px solid #4a6741; outline-offset: -1px; }
        .order-input { transition: background .15s; }
      `}</style>
      {view === "shop" ? (
        <ShopView plants={plants} cart={cart} updateCartQty={updateCartQty} removeFromCart={removeFromCart} submitOrder={submitOrder} showToast={showToast} onGoAdmin={() => setView("admin")} />
      ) : (
        <AdminView plants={plants} orders={orders} savePlants={savePlants} saveOrders={saveOrders} showToast={showToast} onGoShop={() => setView("shop")} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── SHOP VIEW ────────────────────────────
// ═══════════════════════════════════════════
function ShopView({ plants, cart, updateCartQty, removeFromCart, submitOrder, showToast, onGoAdmin }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderConfirm, setOrderConfirm] = useState(null);
  const [sortCol, setSortCol] = useState("category");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  let filtered = plants.filter(p => {
    if (category !== "All" && p.category !== category) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.variety || "").toLowerCase().includes(s) || (p.comments || "").toLowerCase().includes(s) || p.category.toLowerCase().includes(s);
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const handleCheckout = (info) => { const order = submitOrder(info); setCheckoutOpen(false); setCartOpen(false); setOrderConfirm(order); };
  const getCartQty = (plantId) => { const item = cart.find(c => c.plantId === plantId); return item ? item.quantity : ""; };

  const columns = [
    { key: "order", label: "Order Qty", width: 70, align: "center", noSort: true },
    { key: "category", label: "Category", width: null },
    { key: "size", label: "Size", width: 70 },
    { key: "name", label: "Name", width: null, wrap: true },
    { key: "variety", label: "Color / Variety", width: null, wrap: true },
    { key: "price", label: "Price", width: 75, align: "right" },
    { key: "quantity", label: "Avail.", width: 60, align: "center" },
    { key: "packSize", label: "Pack", width: 55, align: "center" },
    { key: "comments", label: "Comments", width: null, wrap: true },
  ];

  const thBase = {
    padding: "10px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1,
    textTransform: "uppercase", color: "#fff", background: "#4a6741",
    position: "sticky", top: 0, zIndex: 2, cursor: "pointer",
    userSelect: "none", borderRight: "1px solid rgba(255,255,255,.15)",
  };
  const tdBase = {
    padding: "7px 10px", fontSize: 13, borderBottom: "1px solid #e8e4dc",
    borderRight: "1px solid #f0ede6", verticalAlign: "top",
  };

  return (
    <div>
      <header style={{
        background: "linear-gradient(135deg, #4a6741 0%, #5c7a52 50%, #6b8c5e 100%)",
        color: "#fff", position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 20px rgba(74,103,65,.3)",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="leaf" size={26} />
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}>Park Greenhouse</div>
              <div style={{ fontSize: 10, opacity: .75, letterSpacing: 2, textTransform: "uppercase" }}>Wholesale Nursery — Current Availability</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onGoAdmin} style={{ color: "#fff", opacity: .6, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", padding: "5px 10px" }}
              onMouseOver={e => e.target.style.opacity = 1} onMouseOut={e => e.target.style.opacity = .6}>Admin</button>
            <button onClick={() => setCartOpen(true)} style={{
              position: "relative", color: "#fff", background: "rgba(255,255,255,.15)",
              padding: "7px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="cart" size={18} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(cartTotal)}</span>
              {cartCount > 0 && <span style={{
                position: "absolute", top: -6, right: -6, background: "#e67e22",
                color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "14px 24px 0" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", width: 240 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999" }}><Icon name="search" size={16} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plants..."
              style={{ width: "100%", padding: "8px 10px 8px 34px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, background: "#fff", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["All", ...Array.from(new Set(plants.map(p => p.category).filter(Boolean))).sort()].map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500,
                background: category === cat ? "#4a6741" : "#fff",
                color: category === cat ? "#fff" : "#666",
                border: `1px solid ${category === cat ? "#4a6741" : "#ddd"}`,
              }}>{cat}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#999" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            {cartCount > 0 && <span style={{ marginLeft: 12, color: "#4a6741", fontWeight: 600 }}>{cartCount} in cart</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 24px 30px" }}>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #ddd", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              {columns.map(col => (
                <col key={col.key} style={col.width ? { width: col.width } : {}} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}
                    onClick={() => !col.noSort && toggleSort(col.key)}
                    style={{
                      ...thBase,
                      textAlign: col.align || "left",
                      cursor: col.noSort ? "default" : "pointer",
                      background: col.key === "order" ? "#3a5534" : "#4a6741",
                    }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      {col.label}
                      {sortCol === col.key && !col.noSort && (
                        <span style={{ opacity: .8 }}>{sortDir === "asc" ? <Icon name="chevronUp" size={11} /> : <Icon name="chevronDown" size={11} />}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((plant, i) => {
                const outOfStock = plant.quantity <= 0;
                const lowStock = plant.quantity > 0 && plant.quantity <= 5;
                const orderQty = getCartQty(plant.id);
                const isInCart = orderQty !== "";
                return (
                  <tr key={plant.id} className="row-hover" style={{
                    background: isInCart ? "#f4faf1" : i % 2 === 0 ? "#fff" : "#fafaf7",
                    opacity: outOfStock ? 0.5 : 1, transition: "background .15s",
                  }}>
                    {/* ORDER QTY — first column */}
                    <td style={{ ...tdBase, textAlign: "center", borderRight: "2px solid #e0ddd4", padding: "5px 6px", background: isInCart ? "#eaf5e4" : "transparent" }}>
                      {!outOfStock ? (
                        <input className="order-input" type="number" min="0" max={plant.quantity} placeholder="—"
                          value={orderQty}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "" || val === "0") { removeFromCart(plant.id); return; }
                            updateCartQty(plant.id, parseInt(val, 10) || 0);
                          }}
                          style={{
                            width: "100%", maxWidth: 54, padding: "5px 2px", border: "1px solid #ccc", borderRadius: 5,
                            fontSize: 14, textAlign: "center", background: isInCart ? "#ddf2d5" : "#fafaf8",
                            fontWeight: isInCart ? 700 : 400, color: isInCart ? "#2d6a4f" : "#333",
                          }} />
                      ) : <span style={{ color: "#ccc", fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ ...tdBase, fontWeight: 500 }}>
                      <span style={{
                        display: "inline-block", width: 7, height: 7, borderRadius: "50%", marginRight: 5, verticalAlign: "middle",
                        background: plant.category === "Trees" ? "#2d6a4f" : plant.category === "Shrubs" ? "#588157" : plant.category === "Perennials" ? "#a7c957" : plant.category === "Grasses" ? "#dda15e" : "#bc6c25",
                      }} />
                      {plant.category}
                    </td>
                    <td style={{ ...tdBase, color: "#666" }}>{plant.size}</td>
                    <td style={{ ...tdBase, fontWeight: 600, whiteSpace: "normal", wordWrap: "break-word", lineHeight: 1.3 }}>{plant.name}</td>
                    <td style={{ ...tdBase, color: "#777", fontStyle: "italic", whiteSpace: "normal", wordWrap: "break-word", lineHeight: 1.3 }}>{plant.variety || "—"}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 600 }}>{fmt(plant.price)}</td>
                    <td style={{ ...tdBase, textAlign: "center", fontWeight: 700, color: outOfStock ? "#c0392b" : lowStock ? "#e67e22" : "#333" }}>
                      {outOfStock ? <span style={{ fontSize: 10, fontWeight: 600 }}>OUT</span> : plant.quantity}
                    </td>
                    <td style={{ ...tdBase, textAlign: "center", color: "#888" }}>{plant.packSize || 1}</td>
                    <td style={{ ...tdBase, color: "#888", fontSize: 12, whiteSpace: "normal", wordWrap: "break-word", lineHeight: 1.3, borderRight: "none" }}>{plant.comments || "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#999" }}>No plants match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {cartCount > 0 && (
          <div style={{
            position: "sticky", bottom: 0, marginTop: 12,
            background: "linear-gradient(135deg, #3a5534, #4a6741)", color: "#fff",
            borderRadius: 10, padding: "14px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 -2px 20px rgba(0,0,0,.15)", animation: "fadeUp .3s ease",
            flexWrap: "wrap", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{cartCount} item{cartCount !== 1 ? "s" : ""} selected</span>
              <span style={{ fontSize: 12, opacity: .7 }}>{cart.map(c => `${c.plantName} ×${c.quantity}`).join("  ·  ")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{fmt(cartTotal)}</span>
              <button onClick={() => setCartOpen(true)}
                style={{ background: "#fff", color: "#4a6741", padding: "8px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
                Review &amp; Checkout</button>
            </div>
          </div>
        )}
      </div>

      {cartOpen && <CartDrawer cart={cart} plants={plants} cartTotal={cartTotal} updateCartQty={updateCartQty} removeFromCart={removeFromCart} onClose={() => setCartOpen(false)}
        onCheckout={() => { if (cart.length > 0) setCheckoutOpen(true); else showToast("Cart is empty", "error"); }} />}
      {checkoutOpen && <CheckoutModal cart={cart} cartTotal={cartTotal} onSubmit={handleCheckout} onClose={() => setCheckoutOpen(false)} />}
      {orderConfirm && <OrderConfirmModal order={orderConfirm} onClose={() => setOrderConfirm(null)} />}
    </div>
  );
}

function CartDrawer({ cart, plants, cartTotal, updateCartQty, removeFromCart, onClose, onCheckout }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)" }} onClick={onClose} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "min(440px, 92vw)",
        background: "#fff", boxShadow: "-4px 0 30px rgba(0,0,0,.15)",
        display: "flex", flexDirection: "column", animation: "slideIn .3s ease",
      }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22 }}>Your Order</h2>
          <button onClick={onClose} style={{ color: "#999" }}><Icon name="x" size={24} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 24px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}><Icon name="cart" size={40} /><p style={{ marginTop: 12 }}>Your cart is empty</p></div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "2px solid #e8e4dc" }}>
                <th style={{ padding: "8px 0", textAlign: "left", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Item</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, width: 80 }}>Qty</th>
                <th style={{ padding: "8px 0", textAlign: "right", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, width: 80 }}>Total</th>
                <th style={{ width: 30 }}></th>
              </tr></thead>
              <tbody>{cart.map(item => {
                const plant = plants.find(p => p.id === item.plantId);
                const maxQ = plant ? plant.quantity : 99;
                return (
                  <tr key={item.plantId} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 0" }}><div style={{ fontWeight: 600, fontSize: 13 }}>{item.plantName}</div><div style={{ color: "#888", fontSize: 12 }}>{fmt(item.unitPrice)} ea</div></td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <button onClick={() => updateCartQty(item.plantId, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: 4, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="minus" size={12} /></button>
                        <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.plantId, Math.min(item.quantity + 1, maxQ))} style={{ width: 24, height: 24, borderRadius: 4, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={12} /></button>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, fontSize: 14 }}>{fmt(item.quantity * item.unitPrice)}</td>
                    <td><button onClick={() => removeFromCart(item.plantId)} style={{ color: "#c0392b" }}><Icon name="trash" size={14} /></button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 18, fontWeight: 700 }}><span>Total</span><span style={{ color: "#4a6741" }}>{fmt(cartTotal)}</span></div>
            <button onClick={onCheckout} style={{ width: "100%", padding: "12px", background: "#4a6741", color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 600 }}>Proceed to Checkout</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, cartTotal, onSubmit, onClose }) {
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const handle = () => { if (!form.customerName || !form.customerEmail || !form.customerPhone) return; setSubmitting(true); onSubmit(form); setSubmitting(false); };
  const inp = { width: "100%", padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, background: "#fafaf8", outline: "none" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 32, animation: "fadeUp .3s ease" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, color: "#999" }}><Icon name="x" size={22} /></button>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 4 }}>Place Order</h2>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>{cart.length} item{cart.length !== 1 ? "s" : ""} · {fmt(cartTotal)} total</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4, display: "block" }}>Name *</label><input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} style={inp} placeholder="Your name or business" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4, display: "block" }}>Email *</label><input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail: e.target.value })} style={inp} placeholder="email@example.com" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4, display: "block" }}>Phone *</label><input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} style={inp} placeholder="(555) 555-0100" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 4, display: "block" }}>Notes (optional)</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inp, height: 70, resize: "vertical" }} placeholder="Pickup time, special requests..." /></div>
          <button onClick={handle} disabled={submitting || !form.customerName || !form.customerEmail || !form.customerPhone}
            style={{ width: "100%", padding: 14, marginTop: 4, background: (!form.customerName || !form.customerEmail || !form.customerPhone) ? "#ccc" : "#4a6741", color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="mail" size={18} /> {submitting ? "Submitting..." : "Submit Order"}</button>
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: "#aaa", textAlign: "center" }}>Your order will be emailed to the office. No payment is collected online.</p>
      </div>
    </div>
  );
}

function OrderConfirmModal({ order, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, maxWidth: 440, width: "100%", padding: 32, textAlign: "center", animation: "fadeUp .3s ease" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e8f5e3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#4a6741" }}><Icon name="check" size={28} /></div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 8 }}>Order Submitted!</h2>
        <p style={{ color: "#777", fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>Order <b>{order.id}</b> has been received. A confirmation email will be sent to <b>{order.customerEmail}</b>.</p>
        <div style={{ background: "#f7f5f0", borderRadius: 10, padding: 16, textAlign: "left", marginBottom: 20 }}>
          {order.items.map(item => (
            <div key={item.plantId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
              <span>{item.plantName} × {item.quantity}</span><span style={{ fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid #ddd", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}>
            <span>Total</span><span style={{ color: "#4a6741" }}>{fmt(order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "#4a6741", color: "#fff", padding: "12px 32px", borderRadius: 10, fontSize: 15, fontWeight: 600 }}>Continue Shopping</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── ADMIN VIEW ───────────────────────────
// ═══════════════════════════════════════════
function AdminView({ plants, orders, savePlants, saveOrders, showToast, onGoShop }) {
  const [tab, setTab] = useState("inventory");
  return (
    <div>
      <header style={{ background: "#2c2c2c", color: "#fff", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Icon name="settings" size={22} /><span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600 }}>Admin Dashboard</span></div>
          <button onClick={onGoShop} style={{ color: "#fff", opacity: .7, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}><Icon name="arrowLeft" size={16} /> Back to Shop</button>
        </div>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", display: "flex" }}>
          {[{ key: "inventory", label: "Inventory", icon: "box" }, { key: "orders", label: "Orders", icon: "clipboard" }, { key: "upload", label: "Upload / Download", icon: "upload" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#fff",
              opacity: tab === t.key ? 1 : .5, borderBottom: tab === t.key ? "2px solid #fff" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Icon name={t.icon} size={16} /> {t.label}
              {t.key === "orders" && orders.filter(o => o.status === "pending").length > 0 && (
                <span style={{ background: "#e67e22", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 4 }}>{orders.filter(o => o.status === "pending").length}</span>
              )}
            </button>
          ))}
        </div>
      </header>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {tab === "inventory" && <InventoryTab plants={plants} savePlants={savePlants} showToast={showToast} />}
        {tab === "orders" && <OrdersTab orders={orders} saveOrders={saveOrders} plants={plants} savePlants={savePlants} showToast={showToast} />}
        {tab === "upload" && <UploadTab plants={plants} savePlants={savePlants} showToast={showToast} />}
      </div>
    </div>
  );
}

function InventoryTab({ plants, savePlants, showToast }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const filtered = plants.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.variety || "").toLowerCase().includes(search.toLowerCase()));
  const lowStock = plants.filter(p => p.quantity > 0 && p.quantity <= 5);
  const outOfStock = plants.filter(p => p.quantity <= 0);
  const startEdit = (p) => { setEditing(p.id); setEditForm({ ...p }); };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };
  const saveEdit = () => { savePlants(plants.map(p => p.id === editing ? { ...editForm, price: Number(editForm.price), quantity: Number(editForm.quantity), packSize: Number(editForm.packSize) || 1 } : p)); setEditing(null); showToast("Plant updated"); };
  const deletePlant = (id) => { savePlants(plants.filter(p => p.id !== id)); showToast("Plant removed"); };
  const cellStyle = { padding: "8px 10px", fontSize: 12, borderBottom: "1px solid #f0ede6" };
  const thStyle = { ...cellStyle, fontWeight: 600, color: "#888", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", background: "#faf8f4", position: "sticky", top: 0 };
  const editInp = { padding: "5px 6px", border: "1px solid #ddd", borderRadius: 5, fontSize: 12, width: "100%", background: "#fff" };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[{ label: "Total Plants", value: plants.length, color: "#4a6741" }, { label: "In Stock", value: plants.filter(p => p.quantity > 0).length, color: "#27ae60" }, { label: "Low Stock", value: lowStock.length, color: "#e67e22" }, { label: "Out of Stock", value: outOfStock.length, color: "#c0392b" }].map(s => (
          <div key={s.label} style={{ background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #e8e4dc" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
          </div>
        ))}
      </div>
      {lowStock.length > 0 && <div style={{ background: "#fef9e7", border: "1px solid #f4d03f", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}><b style={{ color: "#e67e22" }}>Low stock:</b> {lowStock.map(p => `${p.name} ${p.variety ? '(' + p.variety + ')' : ''} — ${p.quantity}`).join(", ")}</div>}
      <div style={{ marginBottom: 10, position: "relative", width: 240 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#999" }}><Icon name="search" size={14} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." style={{ width: "100%", padding: "7px 7px 7px 30px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, background: "#fff" }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e4dc", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead><tr>
            {["Name", "Variety", "Category", "Size", "Pack", "Price", "Qty", "Comments", "Actions"].map(h => (
              <th key={h} style={{ ...thStyle, textAlign: ["Price", "Qty", "Pack"].includes(h) ? "right" : "left" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(plant => editing === plant.id ? (
              <tr key={plant.id} style={{ background: "#fffff5" }}>
                <td style={cellStyle}><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={editInp} /></td>
                <td style={cellStyle}><input value={editForm.variety || ""} onChange={e => setEditForm({ ...editForm, variety: e.target.value })} style={editInp} /></td>
                <td style={cellStyle}><select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={editInp}>{CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}</select></td>
                <td style={cellStyle}><input value={editForm.size} onChange={e => setEditForm({ ...editForm, size: e.target.value })} style={{ ...editInp, width: 60 }} /></td>
                <td style={{ ...cellStyle, textAlign: "right" }}><input type="number" value={editForm.packSize} onChange={e => setEditForm({ ...editForm, packSize: e.target.value })} style={{ ...editInp, width: 50, textAlign: "right" }} /></td>
                <td style={{ ...cellStyle, textAlign: "right" }}><input type="number" step=".01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={{ ...editInp, width: 70, textAlign: "right" }} /></td>
                <td style={{ ...cellStyle, textAlign: "right" }}><input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ ...editInp, width: 60, textAlign: "right" }} /></td>
                <td style={cellStyle}><input value={editForm.comments || ""} onChange={e => setEditForm({ ...editForm, comments: e.target.value })} style={editInp} /></td>
                <td style={cellStyle}><div style={{ display: "flex", gap: 4 }}><button onClick={saveEdit} style={{ color: "#27ae60" }}><Icon name="check" size={16} /></button><button onClick={cancelEdit} style={{ color: "#999" }}><Icon name="x" size={16} /></button></div></td>
              </tr>
            ) : (
              <tr key={plant.id}>
                <td style={{ ...cellStyle, fontWeight: 600 }}>{plant.name}</td>
                <td style={{ ...cellStyle, color: "#777", fontStyle: "italic" }}>{plant.variety || "—"}</td>
                <td style={cellStyle}><span style={{ fontSize: 10, background: "#f0ede6", padding: "1px 6px", borderRadius: 3 }}>{plant.category}</span></td>
                <td style={cellStyle}>{plant.size}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{plant.packSize || 1}</td>
                <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{fmt(plant.price)}</td>
                <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: plant.quantity <= 0 ? "#c0392b" : plant.quantity <= 5 ? "#e67e22" : "#333" }}>{plant.quantity}</td>
                <td style={{ ...cellStyle, color: "#888", fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plant.comments}</td>
                <td style={cellStyle}><div style={{ display: "flex", gap: 4 }}><button onClick={() => startEdit(plant)} style={{ color: "#4a6741" }}><Icon name="edit" size={14} /></button><button onClick={() => deletePlant(plant.id)} style={{ color: "#c0392b" }}><Icon name="trash" size={14} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersTab({ orders, saveOrders, plants, savePlants, showToast }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const updateStatus = (orderId, newStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (newStatus === "cancelled" && order && order.status !== "cancelled") savePlants(plants.map(p => { const item = order.items.find(i => i.plantId === p.id); return item ? { ...p, quantity: p.quantity + item.quantity } : p; }));
    saveOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    showToast(`Order ${newStatus}`);
  };
  const sc = { pending: { bg: "#fef9e7", text: "#e67e22", border: "#f4d03f" }, confirmed: { bg: "#e8f8f5", text: "#1abc9c", border: "#76d7c4" }, fulfilled: { bg: "#e8f5e3", text: "#27ae60", border: "#82e0aa" }, cancelled: { bg: "#fdedec", text: "#c0392b", border: "#f5b7b1" } };
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "pending", "confirmed", "fulfilled", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: 500, background: filter === f ? "#2c2c2c" : "#fff", color: filter === f ? "#fff" : "#666", border: `1px solid ${filter === f ? "#2c2c2c" : "#ddd"}`, textTransform: "capitalize" }}>{f} {f !== "all" && `(${orders.filter(o => o.status === f).length})`}</button>
        ))}
      </div>
      {filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#999" }}>No orders found.</div> :
        filtered.map(order => {
          const colors = sc[order.status] || sc.pending;
          const total = order.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
          return (
            <div key={order.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e4dc", padding: 18, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#999" }}>{order.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{order.customerName}</div>
                  <div style={{ fontSize: 12, color: "#777" }}>{order.customerEmail} · {order.customerPhone}</div>
                  {order.notes && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 2 }}>"{order.notes}"</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 16, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, textTransform: "capitalize" }}>{order.status}</span>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{new Date(order.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                {order.items.map(item => (
                  <div key={item.plantId} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 13 }}>
                    <span>{item.plantName} <span style={{ color: "#999" }}>× {item.quantity}</span></span><span style={{ fontWeight: 600 }}>{fmt(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, marginTop: 6, borderTop: "1px solid #f0f0f0", fontWeight: 700, fontSize: 15 }}><span>Total</span><span style={{ color: "#4a6741" }}>{fmt(total)}</span></div>
              </div>
              {order.status !== "fulfilled" && order.status !== "cancelled" && (
                <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                  {order.status === "pending" && <button onClick={() => updateStatus(order.id, "confirmed")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#1abc9c", color: "#fff" }}>Confirm</button>}
                  {(order.status === "pending" || order.status === "confirmed") && <button onClick={() => updateStatus(order.id, "fulfilled")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#4a6741", color: "#fff" }}>Mark Fulfilled</button>}
                  <button onClick={() => updateStatus(order.id, "cancelled")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#fff", color: "#c0392b", border: "1px solid #c0392b" }}>Cancel</button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

function UploadTab({ plants, savePlants, showToast }) {
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("merge");
  const fileRef = useRef();
  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      let rows = [];
      if (file.name.endsWith(".csv")) { rows = Papa.parse(await file.text(), { header: true, skipEmptyLines: true }).data; }
      else { const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); }
      const normalized = rows.map(row => {
        const r = {}; Object.entries(row).forEach(([k, v]) => { r[k.trim().toLowerCase().replace(/[^a-z0-9]/g, "")] = v; });
        return { name: r.name || r.plantname || r.plant || "", variety: r.variety || r.color || r.colorvariety || r.cultivar || "", category: r.category || r.type || r.cat || "Other", size: r.size || r.potsize || r.containersize || "", price: parseFloat(r.price || r.unitprice || r.cost || 0), quantity: parseInt(r.quantity || r.qty || r.stock || r.available || 0, 10), packSize: parseInt(r.packsize || r.pack || r.traysize || 1, 10) || 1, comments: r.comments || r.notes || r.description || r.comment || "" };
      }).filter(r => r.name);
      setPreview(normalized); showToast(`Parsed ${normalized.length} plants from ${file.name}`);
    } catch (err) { showToast("Error: " + err.message, "error"); }
  };
  const applyUpload = () => {
    if (!preview) return;
    let updated;
    if (mode === "replace") updated = preview.map(p => ({ ...p, id: genId() }));
    else { updated = [...plants]; preview.forEach(incoming => { const idx = updated.findIndex(p => p.name.toLowerCase() === incoming.name.toLowerCase() && (p.variety || "").toLowerCase() === (incoming.variety || "").toLowerCase()); if (idx >= 0) updated[idx] = { ...updated[idx], ...incoming }; else updated.push({ ...incoming, id: genId() }); }); }
    savePlants(updated); setPreview(null); if (fileRef.current) fileRef.current.value = ""; showToast(`Inventory updated: ${updated.length} plants`);
  };
  const downloadCSV = () => { const csv = Papa.unparse(plants.map(p => ({ Name: p.name, "Color / Variety": p.variety || "", Category: p.category, Size: p.size, Price: p.price, Quantity: p.quantity, "Pack Size": p.packSize, Comments: p.comments }))); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `plant-inventory-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
  const downloadXLSX = () => { const ws = XLSX.utils.json_to_sheet(plants.map(p => ({ Name: p.name, "Color / Variety": p.variety || "", Category: p.category, Size: p.size, Price: p.price, Quantity: p.quantity, "Pack Size": p.packSize, Comments: p.comments }))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventory"); XLSX.writeFile(wb, `plant-inventory-${new Date().toISOString().slice(0, 10)}.xlsx`); };
  const cellStyle = { padding: "6px 8px", fontSize: 11, borderBottom: "1px solid #f0ede6" };
  const thStyle = { ...cellStyle, fontWeight: 600, fontSize: 10, color: "#888", background: "#faf8f4", textTransform: "uppercase", letterSpacing: 1 };
  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e4dc", padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4 }}>Upload Inventory</h3>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 14 }}>Upload a CSV or XLSX. Expected columns: Name, Color/Variety, Category, Size, Price, Quantity, Pack Size, Comments.</p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ fontSize: 12 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} /> Merge</label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace</label>
        </div>
        {mode === "replace" && <p style={{ fontSize: 11, color: "#c0392b", background: "#fdedec", padding: "6px 10px", borderRadius: 5, marginBottom: 10 }}>Replace mode removes ALL existing plants.</p>}
        {preview && (
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Preview ({preview.length})</h4>
            <div style={{ maxHeight: 250, overflow: "auto", borderRadius: 6, border: "1px solid #e8e4dc" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead><tr>{["Name", "Variety", "Category", "Size", "Price", "Qty", "Pack", "Comments"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{preview.slice(0, 50).map((p, i) => (
                  <tr key={i}><td style={{ ...cellStyle, fontWeight: 600 }}>{p.name}</td><td style={{ ...cellStyle, fontStyle: "italic" }}>{p.variety}</td><td style={cellStyle}>{p.category}</td><td style={cellStyle}>{p.size}</td><td style={{ ...cellStyle, textAlign: "right" }}>{fmt(p.price)}</td><td style={{ ...cellStyle, textAlign: "right" }}>{p.quantity}</td><td style={{ ...cellStyle, textAlign: "right" }}>{p.packSize}</td><td style={{ ...cellStyle, color: "#888" }}>{p.comments}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={applyUpload} style={{ padding: "8px 20px", background: "#4a6741", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={14} /> Apply</button>
              <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ padding: "8px 20px", background: "#fff", color: "#666", borderRadius: 6, fontSize: 13, border: "1px solid #ddd" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e4dc", padding: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4 }}>Download Current Inventory</h3>
        <p style={{ color: "#888", fontSize: 12, marginBottom: 14 }}>Export {plants.length} plants as a spreadsheet.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={downloadCSV} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #4a6741", color: "#4a6741", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="download" size={14} /> CSV</button>
          <button onClick={downloadXLSX} style={{ padding: "8px 16px", background: "#4a6741", color: "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="download" size={14} /> XLSX</button>
        </div>
      </div>
    </div>
  );
}
