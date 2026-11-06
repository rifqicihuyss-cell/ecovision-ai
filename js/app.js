/* ===== KONFIGURASI ===== */
// Tempel URL model Teachable Machine di antara tanda kutip. Harus diakhiri "/".
// Contoh: "https://teachablemachine.withgoogle.com/models/AbCdEf123/"
const MODEL_URL = "";
const MAX_MB = 8;

const $ = (s) => document.querySelector(s);
const KATEGORI = ["organik", "nonorganik", "b3"];

/* ===== NAVIGASI ===== */
function go() {
  const pages = [...document.querySelectorAll(".page")];
  let id = location.hash.slice(1);
  if (!pages.some((p) => p.id === id)) id = "dashboard";
  pages.forEach((p) => p.classList.toggle("show", p.id === id));
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === id));
  window.scrollTo(0, 0);
  renderStats();
}

/* ===== DATA LOKAL (EcoPoints & statistik) ===== */
function loadData() {
  try { return JSON.parse(localStorage.getItem("ecovision")) || {}; }
  catch { return {}; }
}
function renderStats() {
  const d = loadData();
  const s = d.stats || {};
  const total = KATEGORI.reduce((sum, k) => sum + (s[k] || 0), 0);
  $("#pointsValue").textContent = d.points || 0;
  $("#totalScan").textContent = total;
  KATEGORI.forEach((k) => {
    $("#n-" + k).textContent = s[k] || 0;
    $("#b-" + k).style.width = total ? ((s[k] || 0) / total) * 100 + "%" : "0%";
  });
}

/* ===== STATUS MODEL & PESAN ===== */
function updateModelStatus() {
  const el = $("#modelStatus");
  el.className = "alert ok";
  el.innerHTML = "🤖 <b>Mode model siap pakai (MobileNet).</b> Mengenali buah, makanan, botol, kantong plastik, kardus, kain, dan elektronik. Baterai belum dikenali. Butuh internet.";
}
function showMsg(html, type = "warn") {
  const r = $("#result");
  r.className = "alert " + type;
  r.innerHTML = html;
  r.hidden = false;
}

/* ===== UPLOAD & PRATINJAU FOTO ===== */
const preview = $("#preview");
function setImage(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return showMsg("❌ File harus berupa gambar (JPG, PNG, atau WEBP).");
  if (file.size > MAX_MB * 1048576) return showMsg(`❌ Ukuran foto maksimal ${MAX_MB} MB.`);
  if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  $("#dropHint").hidden = true;
  $("#analyzeBtn").disabled = false;
  $("#result").hidden = true;
}
["#fileInput", "#cameraInput"].forEach((id) =>
  $(id).addEventListener("change", (e) => {
    setImage(e.target.files[0]);
    e.target.value = "";
  })
);

const dz = $("#dropzone");
["dragenter", "dragover"].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); })
);
["dragleave", "drop"].forEach((ev) =>
  dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); })
);
dz.addEventListener("drop", (e) => setImage(e.dataTransfer.files[0]));

/* ===== MODEL SIAP PAKAI (MobileNet / ImageNet) ===== */
// Format: "label ImageNet": ["nama Indonesia", "kategori"]
const KAMUS = {
  // Organik
  "banana":["Pisang","organik"],"orange":["Jeruk","organik"],"lemon":["Lemon","organik"],
  "strawberry":["Stroberi","organik"],"pineapple":["Nanas","organik"],"pomegranate":["Delima","organik"],
  "fig":["Buah ara","organik"],"jackfruit":["Nangka","organik"],"granny smith":["Apel","organik"],
  "broccoli":["Brokoli","organik"],"cauliflower":["Kembang kol","organik"],"head cabbage":["Kubis","organik"],
  "cucumber":["Mentimun","organik"],"bell pepper":["Paprika","organik"],"mushroom":["Jamur","organik"],
  "zucchini":["Zukini","organik"],"hay":["Jerami","organik"],"pizza":["Sisa makanan (pizza)","organik"],
  "cheeseburger":["Sisa makanan (burger)","organik"],"hotdog":["Sisa makanan (hotdog)","organik"],
  "french loaf":["Roti","organik"],"bagel":["Roti","organik"],"mashed potato":["Sisa makanan (kentang)","organik"],
  // Non-organik
  "water bottle":["Botol minum","nonorganik"],"pop bottle":["Botol plastik","nonorganik"],
  "beer bottle":["Botol kaca","nonorganik"],"wine bottle":["Botol kaca","nonorganik"],
  "plastic bag":["Kantong plastik","nonorganik"],"carton":["Kardus atau kemasan","nonorganik"],
  "packet":["Bungkus atau kemasan","nonorganik"],"paper towel":["Tisu atau kertas","nonorganik"],
  "envelope":["Amplop atau kertas","nonorganik"],"toilet tissue":["Tisu","nonorganik"],
  "binder":["Map atau kertas","nonorganik"],"book jacket":["Sampul buku atau kertas","nonorganik"],
  "comic book":["Buku atau kertas","nonorganik"],"bottlecap":["Tutup botol","nonorganik"],
  "milk can":["Kaleng","nonorganik"],"cup":["Gelas","nonorganik"],"coffee mug":["Gelas atau mug","nonorganik"],
  "beer glass":["Gelas kaca","nonorganik"],"water jug":["Botol atau jeriken","nonorganik"],
  "jersey":["Kain atau baju","nonorganik"],"sweatshirt":["Kain atau baju","nonorganik"],"sock":["Kain (kaus kaki)","nonorganik"],
  // B3
  "cellular telephone":["Ponsel","b3"],"remote control":["Remote (berisi baterai)","b3"],
  "laptop":["Laptop","b3"],"mouse":["Mouse komputer","b3"],"computer keyboard":["Keyboard","b3"],
  "monitor":["Monitor","b3"],"ipod":["Perangkat elektronik","b3"],"hard disc":["Hard disk","b3"],
  "modem":["Modem","b3"],"radio":["Radio","b3"],"table lamp":["Lampu","b3"],"torch":["Senter","b3"],
  "digital clock":["Jam digital","b3"],"digital watch":["Jam digital","b3"],"lighter":["Korek api gas","b3"]
};
const NAMA_KAT = { organik: "Organik", nonorganik: "Non-organik", b3: "B3 (Berbahaya dan Beracun)" };
const REKOMENDASI = {
  organik: "Buang ke tempat sampah organik atau olah menjadi kompos.",
  nonorganik: "Bersihkan dan keringkan, lalu pisahkan untuk bank sampah atau daur ulang.",
  b3: "Jangan dicampur dengan sampah biasa. Simpan di wadah tertutup dan serahkan ke titik pengumpulan B3 atau Dinas Lingkungan Hidup."
};
const BATAS_YAKIN = 0.15;
let model = null;

async function muatModel() {
  if (model) return model;
  if (typeof mobilenet === "undefined") throw new Error("library AI tidak termuat");
  model = await mobilenet.load();
  return model;
}

// Cari label teratas yang ada di KAMUS. Tidak ada yang cocok = null (tidak ada hasil palsu).
function cari(preds) {
  for (const p of preds) {
    for (const t of p.className.toLowerCase().split(",")) {
      const hit = KAMUS[t.trim()];
      if (hit) return { nama: hit[0], kat: hit[1], conf: p.probability, label: p.className.split(",")[0] };
    }
  }
  return null;
}

function catat(kat) {
  try {
    const d = loadData();
    d.stats = d.stats || {};
    d.stats[kat] = (d.stats[kat] || 0) + 1;
    d.points = (d.points || 0) + 10;
    localStorage.setItem("ecovision", JSON.stringify(d));
  } catch { /* penyimpanan tidak tersedia */ }
}

function tampilkan(r, preds) {
  if (!r || r.conf < BATAS_YAKIN) {
    const top = preds.map((p) => `${p.className.split(",")[0]} (${Math.round(p.probability * 100)}%)`).join(", ");
    return showMsg(`🤷 <b>Belum bisa dikategorikan.</b> Model siap pakai belum mengenali barang ini. Tebakan terdekat: ${top}.`);
  }
  catat(r.kat);
  showMsg(
    `<b>${r.nama}</b><br>Kategori: <b>${NAMA_KAT[r.kat]}</b><br>Keyakinan AI: <b>${Math.round(r.conf * 100)}%</b><br>` +
    `${r.kat === "b3" ? "⚠️ " : "♻️ "}${REKOMENDASI[r.kat]}<br><small>Label model: ${r.label} · +10 EcoPoints</small>`,
    r.kat === "b3" ? "warn" : "ok"
  );
}

$("#analyzeBtn").addEventListener("click", async () => {
  const btn = $("#analyzeBtn");
  btn.disabled = true;
  showMsg("⏳ Memuat model AI dan menganalisis. Pertama kali bisa beberapa detik.", "ok");
  try {
    const m = await muatModel();
    const preds = await m.classify(preview, 5);
    tampilkan(cari(preds), preds);
  } catch (err) {
    showMsg("❌ Gagal menjalankan model AI (" + err.message + "). Pastikan internet aktif lalu coba lagi.");
  }
  btn.disabled = false;
});

/* ===== MULAI ===== */
addEventListener("hashchange", go);
updateModelStatus();
go();

