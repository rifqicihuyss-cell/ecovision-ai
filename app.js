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
  el.innerHTML = "🤖 <b>Model siap pakai CLIP (tanpa pelatihan).</b> Unduhan pertama cukup besar, lalu tersimpan di browser. Taruh barang di tengah foto dengan latar polos. Butuh internet.";
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

/* ===== MODEL SIAP PAKAI: CLIP zero-shot (Transformers.js) ===== */
// AI mencocokkan foto dengan daftar deskripsi di bawah. Tambah atau ubah baris sesuai kebutuhan.
const LIB_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.4";
const MODEL_ID = "Xenova/clip-vit-base-patch32";
// [deskripsi untuk AI (bahasa Inggris), nama Indonesia, kategori]
const ITEMS = [
  ["a banana peel or fruit peel","Kulit buah","organik"],
  ["leftover food scraps","Sisa makanan","organik"],
  ["dry leaves","Daun kering","organik"],
  ["green leaves","Daun","organik"],
  ["twigs and branches","Ranting","organik"],
  ["fresh fruit","Buah","organik"],
  ["fresh vegetables","Sayuran","organik"],
  ["a plastic bottle","Botol plastik","nonorganik"],
  ["a plastic bag","Kantong plastik","nonorganik"],
  ["a snack wrapper","Bungkus snack","nonorganik"],
  ["a plastic cup","Gelas plastik","nonorganik"],
  ["a styrofoam food box","Styrofoam","nonorganik"],
  ["a sheet of paper","Kertas","nonorganik"],
  ["a cardboard box","Kardus","nonorganik"],
  ["a paper food wrapper","Kertas bungkus makanan","nonorganik"],
  ["a metal can","Kaleng","nonorganik"],
  ["a glass bottle","Botol kaca","nonorganik"],
  ["a piece of cloth","Kain","nonorganik"],
  ["a battery","Baterai","b3"],
  ["a light bulb","Lampu","b3"],
  ["medicine pills","Obat","b3"],
  ["a paint can","Cat","b3"],
  ["broken electronics and cables","Elektronik rusak","b3"],
  // bukan sampah: membantu AI tidak asal menebak
  ["a human hand","","none"],["a table","","none"],["a wall","","none"],["a floor","","none"],["a person","","none"]
];
const NAMA_KAT = { organik: "Organik", nonorganik: "Non-organik", b3: "B3 (Berbahaya dan Beracun)" };
const REKOMENDASI = {
  organik: "Buang ke tempat sampah organik atau olah menjadi kompos.",
  nonorganik: "Bersihkan dan keringkan, lalu pisahkan untuk bank sampah atau daur ulang.",
  b3: "Jangan dicampur dengan sampah biasa. Simpan di wadah tertutup dan serahkan ke titik pengumpulan B3 atau Dinas Lingkungan Hidup."
};
const BATAS_YAKIN = 0.5;
let clip = null;

function progres(p) {
  if (p.status === "progress") {
    showMsg(`⏳ Mengunduh model AI: ${p.file.split("/").pop()} ${Math.round(p.progress)}%. Hanya sekali, berikutnya tersimpan di browser.`, "ok");
  }
}
async function muatModel() {
  if (clip) return clip;
  const { pipeline } = await import(LIB_URL);
  clip = await pipeline("zero-shot-image-classification", MODEL_ID, { progress_callback: progres });
  return clip;
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

// Skor tiap kategori = jumlah skor semua deskripsi di kategori itu (lebih stabil daripada 1 tebakan).
function tampilkan(out) {
  out.sort((a, b) => b.score - a.score);
  const total = { organik: 0, nonorganik: 0, b3: 0, none: 0 };
  const items = [];
  for (const o of out) {
    const it = ITEMS.find((i) => i[0] === o.label);
    if (!it) continue;
    total[it[2]] += o.score;
    if (it[2] !== "none") items.push({ nama: it[1], kat: it[2], skor: o.score });
  }
  const kat = Object.keys(total).sort((a, b) => total[b] - total[a])[0];
  if (kat === "none") {
    return showMsg("🙈 <b>Tidak ada sampah terdeteksi.</b> Taruh barang di tengah foto dengan latar polos, lalu coba lagi.");
  }
  const conf = total[kat];
  const utama = items.find((i) => i.kat === kat);
  const lain = items.filter((i) => i !== utama).slice(0, 2).map((i) => `${i.nama} ${Math.round(i.skor * 100)}%`).join(", ");
  const yakin = conf >= BATAS_YAKIN;
  if (yakin) catat(kat);
  showMsg(
    `<b>${utama.nama}</b><br>Kategori: <b>${NAMA_KAT[kat]}</b><br>Keyakinan AI: <b>${Math.round(conf * 100)}%</b>` +
    (yakin ? "" : "<br>🤔 Kurang yakin. Coba foto lebih dekat dan terang.") +
    `<br>${kat === "b3" ? "⚠️ " : "♻️ "}${REKOMENDASI[kat]}` +
    `<br><small>Kemungkinan lain: ${lain}${yakin ? " · +10 EcoPoints" : ""}</small>`,
    kat === "b3" || !yakin ? "warn" : "ok"
  );
}

$("#analyzeBtn").addEventListener("click", async () => {
  const btn = $("#analyzeBtn");
  btn.disabled = true;
  showMsg("⏳ Menyiapkan model AI. Pertama kali bisa beberapa menit.", "ok");
  try {
    const m = await muatModel();
    showMsg("🔍 Menganalisis foto…", "ok");
    const out = await m(preview.src, ITEMS.map((i) => i[0]), { hypothesis_template: "a photo of {}." });
    tampilkan(out);
  } catch (err) {
    showMsg("❌ Gagal memuat atau menjalankan model AI (" + ((err && err.message) || err) + "). Pastikan internet aktif dan situs dibuka lewat Live Server atau GitHub Pages.");
  }
  btn.disabled = false;
});

/* ===== MULAI ===== */
addEventListener("hashchange", go);
updateModelStatus();
go();

