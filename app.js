const EXERCISES = {
  A: [
    { name: "Pompes", detail: "3 × 10-12 reps" },
    { name: "Pike push-ups", detail: "3 × 8-10 reps" },
    { name: "Dips (sur chaise)", detail: "3 × 10 reps" },
    { name: "Gainage planche", detail: "3 × 40 sec" },
    { name: "Mountain climbers", detail: "3 × 30 sec" },
  ],
  B: [
    { name: "Squats", detail: "3 × 15 reps" },
    { name: "Fentes alternées", detail: "3 × 10/jambe" },
    { name: "Hip thrust au sol", detail: "3 × 15 reps" },
    { name: "Squats sumo", detail: "3 × 12 reps" },
    { name: "Mollets debout", detail: "3 × 20 reps" },
  ],
  C: [
    { name: "Jumping jacks", detail: "3 × 45 sec" },
    { name: "Burpees", detail: "3 × 8 reps" },
    { name: "High knees", detail: "3 × 30 sec" },
    { name: "Gainage latéral", detail: "2 × 30 sec/côté" },
    { name: "Pompes + squat enchaînés", detail: "3 × 10 cycles" },
  ],
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}
function load(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

let state = {
  foods: load("foods_" + getToday(), []),
  sessions: load("sessions", {}),
  weights: load("weights", []),
  profil: load("profil", {}),
  checks: load("checks_" + getToday(), { A: {}, B: {}, C: {} }),
};

// NAV
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "historique") renderWeightChart();
  });
});

// HEADER
function renderHeader() {
  const d = new Date();
  document.getElementById("date-label").textContent = d.toLocaleDateString(
    "fr-FR",
    { weekday: "long", day: "numeric", month: "long" },
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d2 = new Date(today);
    d2.setDate(today.getDate() - i);
    const key = d2.toISOString().split("T")[0];
    if (state.sessions[key]) streak++;
    else if (i > 0) break;
  }
  document.getElementById("streak-label").textContent = "🔥 " + streak + "j";
}

// NUTRITION
function updateNutrition() {
  const foods = state.foods;
  const p = state.profil;
  const totCal = foods.reduce((s, f) => s + (f.cal || 0), 0);
  const totProt = foods.reduce((s, f) => s + (f.prot || 0), 0);
  const totCarb = foods.reduce((s, f) => s + (f.carb || 0), 0);
  const totFat = foods.reduce((s, f) => s + (f.fat || 0), 0);
  document.getElementById("cal-val").textContent = totCal;
  document.getElementById("prot-val").innerHTML =
    totProt + '<span class="unit">g</span>';
  document.getElementById("carb-val").innerHTML =
    totCarb + '<span class="unit">g</span>';
  document.getElementById("fat-val").innerHTML =
    totFat + '<span class="unit">g</span>';
  document.getElementById("cal-goal").textContent = p.cal
    ? "/ " + p.cal + " kcal"
    : "/ — kcal";
  document.getElementById("prot-goal").textContent = p.prot
    ? "/ " + p.prot + " g"
    : "/ — g";
  drawRing(totCal, p.cal || 0);
}

function drawRing(val, goal) {
  const canvas = document.getElementById("cal-ring");
  const ctx = canvas.getContext("2d");
  const cx = 40,
    cy = 40,
    r = 32,
    lw = 7;
  ctx.clearRect(0, 0, 80, 80);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = lw;
  ctx.stroke();
  if (goal > 0) {
    const pct = Math.min(val / goal, 1.05);
    const color = pct > 1 ? "#ff4f4f" : "#b8ff4f";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.fillStyle = "#b8ff4f";
  ctx.font = "bold 13px Syne, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(goal > 0 ? Math.round((val / goal) * 100) + "%" : "—", cx, cy);
}

function renderFoods() {
  const el = document.getElementById("food-list");
  if (!state.foods.length) {
    el.innerHTML = '<p class="empty">Aucun aliment pour le moment.</p>';
    return;
  }
  el.innerHTML = state.foods
    .map(
      (f, i) => `
    <div class="food-item">
      <div>
        <div class="food-name">${f.name}</div>
        <div class="food-macros">${f.cal} kcal · P:${f.prot}g · G:${f.carb}g · L:${f.fat}g</div>
      </div>
      <button class="food-del" onclick="removeFood(${i})">×</button>
    </div>
  `,
    )
    .join("");
}

const EDAMAM_ID = "f45f8742";
const EDAMAM_KEY = "30c9788d367f78fc6baf6a22c7bd4338";
let selectedProduct = null;
let searchTimeout = null;

window.searchFood = function () {
  const query = document.getElementById("f-search").value.trim();
  const resultsEl = document.getElementById("search-results");
  clearTimeout(searchTimeout);
  if (query.length < 2) {
    resultsEl.innerHTML = "";
    return;
  }
  resultsEl.innerHTML = '<div class="search-status">Recherche...</div>';
  searchTimeout = setTimeout(async () => {
    try {
      const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${EDAMAM_ID}&app_key=${EDAMAM_KEY}&ingr=${encodeURIComponent(query)}&nutrition-type=cooking`;
      const res = await fetch(url);
      const data = await res.json();
      const products = (data.hints || [])
        .slice(0, 8)
        .filter((h) => h.food && h.food.nutrients);
      if (!products.length) {
        resultsEl.innerHTML =
          '<div class="search-status">Aucun résultat trouvé.</div>';
        return;
      }
      window._searchResults = products;
      resultsEl.innerHTML = products
        .map(
          (h, i) => `
        <div class="search-result-item" onclick="selectProduct(${i})">
          <div class="result-name">${h.food.label}</div>
          <div class="result-brand">${h.food.brand || "Aliment générique"} · ${Math.round(h.food.nutrients.ENERC_KCAL || 0)} kcal/100g</div>
        </div>
      `,
        )
        .join("");
    } catch (e) {
      console.error(e);
      resultsEl.innerHTML =
        '<div class="search-status">Erreur de connexion.</div>';
    }
  }, 400);
};

window.selectProduct = function (i) {
  const food = window._searchResults[i].food;
  const n = food.nutrients;
  selectedProduct = {
    name: food.label,
    cal100: Math.round(n.ENERC_KCAL || 0),
    prot100: Math.round(n.PROCNT || 0),
    carb100: Math.round(n.CHOCDF || 0),
    fat100: Math.round(n.FAT || 0),
  };
  document.getElementById("search-results").innerHTML = "";
  document.getElementById("f-search").value = "";
  document.getElementById("selected-name").textContent = selectedProduct.name;
  document.getElementById("selected-macros").textContent =
    `Pour 100g : ${selectedProduct.cal100} kcal · P:${selectedProduct.prot100}g · G:${selectedProduct.carb100}g · L:${selectedProduct.fat100}g`;
  document.getElementById("selected-food").style.display = "block";
  document.getElementById("f-grams").value = "";
  document.getElementById("macro-preview").textContent = "";
  document.getElementById("f-grams").focus();
};

window.updatePreview = function () {
  if (!selectedProduct) return;
  const g = parseFloat(document.getElementById("f-grams").value) || 0;
  if (!g) {
    document.getElementById("macro-preview").textContent = "";
    return;
  }
  const ratio = g / 100;
  const cal = Math.round(selectedProduct.cal100 * ratio);
  const prot = Math.round(selectedProduct.prot100 * ratio);
  const carb = Math.round(selectedProduct.carb100 * ratio);
  const fat = Math.round(selectedProduct.fat100 * ratio);
  document.getElementById("macro-preview").textContent =
    `→ ${cal} kcal · P:${prot}g · G:${carb}g · L:${fat}g`;
};

window.confirmFood = function () {
  if (!selectedProduct) return;
  const g = parseFloat(document.getElementById("f-grams").value) || 0;
  if (!g) return;
  const ratio = g / 100;
  state.foods.push({
    name: `${selectedProduct.name} (${g}g)`,
    cal: Math.round(selectedProduct.cal100 * ratio),
    prot: Math.round(selectedProduct.prot100 * ratio),
    carb: Math.round(selectedProduct.carb100 * ratio),
    fat: Math.round(selectedProduct.fat100 * ratio),
  });
  save("foods_" + getToday(), state.foods);
  selectedProduct = null;
  document.getElementById("selected-food").style.display = "none";
  document.getElementById("f-search").value = "";
  document.getElementById("f-grams").value = "";
  renderFoods();
  updateNutrition();
};

window.removeFood = function (i) {
  state.foods.splice(i, 1);
  save("foods_" + getToday(), state.foods);
  renderFoods();
  updateNutrition();
};

// WORKOUT
function renderWeekStrip() {
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  document.getElementById("week-strip").innerHTML = days
    .map((d, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - todayIdx + i);
      const key = date.toISOString().split("T")[0];
      const trained = state.sessions[key];
      return `<div class="day-cell ${i === todayIdx ? "today" : ""} ${trained ? "trained" : ""}">
      <div class="day-name">${d}</div>
      ${trained ? `<div class="day-badge">${trained}</div>` : ""}
    </div>`;
    })
    .join("");
}

window.logSession = function (type) {
  state.sessions[getToday()] = type;
  save("sessions", state.sessions);
  renderWeekStrip();
  renderHeader();
  renderSessionHistory();
  const msg = document.getElementById("session-msg");
  msg.textContent = `Séance ${type} enregistrée !`;
  setTimeout(() => (msg.textContent = ""), 3000);
};

let currentProgram = "A";
window.showProgram = function (type, btn) {
  currentProgram = type;
  document
    .querySelectorAll(".ptab")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderProgram();
};

function renderProgram() {
  const checks = state.checks[currentProgram] || {};
  document.getElementById("program-list").innerHTML = EXERCISES[currentProgram]
    .map(
      (e, i) => `
    <div class="ex-item">
      <div>
        <div class="ex-name">${e.name}</div>
        <div class="ex-detail">${e.detail}</div>
      </div>
      <button class="ex-check ${checks[i] ? "done" : ""}" onclick="toggleCheck('${currentProgram}', ${i})">${checks[i] ? "✓" : ""}</button>
    </div>
  `,
    )
    .join("");
}

window.toggleCheck = function (s, i) {
  state.checks[s][i] = !state.checks[s][i];
  save("checks_" + getToday(), state.checks);
  renderProgram();
};

// HISTORIQUE
window.logWeight = function () {
  const val = parseFloat(document.getElementById("w-input").value);
  if (!val) return;
  state.weights.push({ date: getToday(), val });
  save("weights", state.weights);
  document.getElementById("w-input").value = "";
  renderWeightChart();
};

function renderWeightChart() {
  const canvas = document.getElementById("weight-chart");
  const ctx = canvas.getContext("2d");
  const data = state.weights.slice(-14);
  canvas.width = canvas.offsetWidth || 400;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (data.length < 2) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px DM Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "Enregistre au moins 2 pesées pour voir le graphique",
      canvas.width / 2,
      80,
    );
    return;
  }
  const vals = data.map((d) => d.val);
  const min = Math.min(...vals) - 0.5,
    max = Math.max(...vals) + 0.5;
  const W = canvas.width,
    H = canvas.height;
  const pad = { t: 20, r: 10, b: 30, l: 40 };
  const xScale = (i) => pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1);
  const yScale = (v) => pad.t + ((max - v) / (max - min)) * (H - pad.t - pad.b);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    const y = pad.t + t * (H - pad.t - pad.b);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
    ctx.stroke();
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px DM Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText((max - t * (max - min)).toFixed(1), pad.l - 4, y + 4);
  });
  const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, "rgba(184,255,79,0.3)");
  grad.addColorStop(1, "rgba(184,255,79,0)");
  ctx.beginPath();
  data.forEach((d, i) =>
    i === 0
      ? ctx.moveTo(xScale(i), yScale(d.val))
      : ctx.lineTo(xScale(i), yScale(d.val)),
  );
  ctx.lineTo(xScale(data.length - 1), H - pad.b);
  ctx.lineTo(xScale(0), H - pad.b);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = "#b8ff4f";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  data.forEach((d, i) =>
    i === 0
      ? ctx.moveTo(xScale(i), yScale(d.val))
      : ctx.lineTo(xScale(i), yScale(d.val)),
  );
  ctx.stroke();
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(xScale(i), yScale(d.val), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#b8ff4f";
    ctx.fill();
  });
}

function renderSessionHistory() {
  const el = document.getElementById("session-history");
  const entries = Object.entries(state.sessions)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 20);
  if (!entries.length) {
    el.innerHTML = '<p class="empty">Aucune séance enregistrée.</p>';
    return;
  }
  el.innerHTML = entries
    .map(([date, type]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return `<div class="food-item">
      <div class="food-name">${label}</div>
      <div class="food-macros">Séance ${type}</div>
    </div>`;
    })
    .join("");
}

// PROFIL
window.saveProfil = function () {
  state.profil = {
    poids: parseFloat(document.getElementById("p-poids").value) || 0,
    taille: parseFloat(document.getElementById("p-taille").value) || 0,
    age: parseInt(document.getElementById("p-age").value) || 0,
    cal: parseInt(document.getElementById("p-cal").value) || 0,
    prot: parseInt(document.getElementById("p-prot").value) || 0,
  };
  save("profil", state.profil);
  updateNutrition();
  const p = state.profil;
  if (p.poids && p.taille && p.age) {
    const bmr = Math.round(10 * p.poids + 6.25 * p.taille - 5 * p.age + 5);
    const tdee = Math.round(bmr * 1.2);
    const deficit = tdee - 350;
    document.getElementById("calc-block").style.display = "block";
    document.getElementById("calc-content").innerHTML = `
      <div class="calc-row"><span>BMR</span><span class="cv">${bmr} kcal</span></div>
      <div class="calc-row"><span>TDEE sédentaire</span><span class="cv">${tdee} kcal</span></div>
      <div class="calc-row"><span>Objectif suggéré (−350)</span><span class="cv">${deficit} kcal</span></div>
      <div class="calc-row"><span>Protéines suggérées</span><span class="cv">${Math.round(p.poids * 1.6)}–${Math.round(p.poids * 2)} g/j</span></div>
    `;
  }
  const msg = document.getElementById("profil-msg");
  msg.textContent = "Profil enregistré !";
  setTimeout(() => (msg.textContent = ""), 2500);
  loadProfilInputs();
};

function loadProfilInputs() {
  const p = state.profil;
  if (p.poids) document.getElementById("p-poids").value = p.poids;
  if (p.taille) document.getElementById("p-taille").value = p.taille;
  if (p.age) document.getElementById("p-age").value = p.age;
  if (p.cal) document.getElementById("p-cal").value = p.cal;
  if (p.prot) document.getElementById("p-prot").value = p.prot;
}

// RESET
window.resetDay = function () {
  if (!confirm("Effacer tous les aliments du jour ?")) return;
  state.foods = [];
  state.checks = { A: {}, B: {}, C: {} };
  save("foods_" + getToday(), state.foods);
  save("checks_" + getToday(), state.checks);
  renderFoods();
  updateNutrition();
  renderProgram();
};

window.resetAll = function () {
  if (!confirm("Effacer TOUTES les données ? Cette action est irréversible."))
    return;
  localStorage.clear();
  location.reload();
};

// SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(console.error);
}

// INIT
renderHeader();
updateNutrition();
renderFoods();
renderWeekStrip();
renderProgram();
renderSessionHistory();
loadProfilInputs();
