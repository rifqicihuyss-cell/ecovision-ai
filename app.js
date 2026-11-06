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
  if (MODEL_URL) {
    el.className = "alert ok";
    el.textContent = "🔗 URL model sudah diisi. Kode klasifikasi ditambahkan di Langkah 2.";
  } else {
    el.className = "alert warn";
    el.innerHTML = "⚠️ <b>Model AI belum terhubung.</b> Isi <code>MODEL_URL</code> di <code>js/app.js</code> setelah model Teachable Machine siap.";
  }
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

/* ===== ANALISIS (diisi penuh di Langkah 2) ===== */
$("#analyzeBtn").addEventListener("click", () => {
  if (!MODEL_URL) {
    return showMsg("⚠️ <b>Model AI belum terhubung.</b> Foto belum bisa dianalisis. EcoVision AI tidak menampilkan hasil palsu.");
  }
  showMsg("🔗 URL model sudah terisi, tetapi kode klasifikasinya baru ditambahkan di Langkah 2.", "ok");
});

/* ===== MULAI ===== */
addEventListener("hashchange", go);
updateModelStatus();
go();

