const DEFAULT_EXERCISES = {
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

function getExercises() {
  return load("exercises", DEFAULT_EXERCISES);
}

function saveExercises(ex) {
  save("exercises", ex);
}

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
    if (btn.dataset.tab === "resume") renderResume();
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
  document.getElementById("carb-goal").textContent = p.carb
    ? "/ " + p.carb + " g"
    : "/ — g";
  document.getElementById("fat-goal").textContent = p.fat
    ? "/ " + p.fat + " g"
    : "/ — g";
  drawRing(totCal, p.cal || 0, "cal-ring", "#b8ff4f");
  drawRing(totProt, p.prot || 0, "prot-ring", "#4fffb0");
  drawRing(totCarb, p.carb || 0, "carb-ring", "#4fb8ff");
  drawRing(totFat, p.fat || 0, "fat-ring", "#ffb84f");
}

function drawRing(val, goal, canvasId, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 4,
    lw = size > 50 ? 7 : 4;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = lw;
  ctx.stroke();
  if (goal > 0) {
    const pct = Math.min(val / goal, 1.05);
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = pct > 1 ? "#ff4f4f" : color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  if (size > 50) {
    ctx.fillStyle = color;
    ctx.font = "bold 13px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(goal > 0 ? Math.round((val / goal) * 100) + "%" : "—", cx, cy);
  }
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
// FAVORIS
function renderFavorites() {
  const el = document.getElementById("favorites-list");
  const favs = load("favorites", []);
  if (!favs.length) {
    el.innerHTML = '<p class="empty">Aucun favori enregistré.</p>';
    return;
  }
  el.innerHTML = favs
    .map(
      (f, i) => `
    <div class="fav-item">
      <div>
        <div class="fav-name">${f.name}</div>
        <div class="fav-macros">${f.totalCal} kcal · P:${f.totalProt}g · G:${f.totalCarb}g · L:${f.totalFat}g</div>
      </div>
      <div class="fav-actions">
        <button class="btn-fav-add" onclick="loadFavorite(${i})">+ Ajouter</button>
        <button class="btn-fav-del" onclick="deleteFavorite(${i})">×</button>
      </div>
    </div>
  `,
    )
    .join("");
}

window.saveFavorite = function () {
  if (!state.foods.length) return;
  const name =
    document.getElementById("fav-name").value.trim() ||
    "Repas du " + getToday();
  const favs = load("favorites", []);
  favs.push({
    name,
    foods: [...state.foods],
    totalCal: state.foods.reduce((s, f) => s + f.cal, 0),
    totalProt: state.foods.reduce((s, f) => s + f.prot, 0),
    totalCarb: state.foods.reduce((s, f) => s + f.carb, 0),
    totalFat: state.foods.reduce((s, f) => s + f.fat, 0),
  });
  save("favorites", favs);
  document.getElementById("fav-name").value = "";
  renderFavorites();
};

window.loadFavorite = function (i) {
  const favs = load("favorites", []);
  const fav = favs[i];
  fav.foods.forEach((f) => state.foods.push(f));
  save("foods_" + getToday(), state.foods);
  renderFoods();
  updateNutrition();
};

window.deleteFavorite = function (i) {
  const favs = load("favorites", []);
  favs.splice(i, 1);
  save("favorites", favs);
  renderFavorites();
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
  const today = getToday();
  if (state.sessions[today]) {
    if (!confirm("Annuler la séance enregistrée aujourd'hui ?")) return;
    delete state.sessions[today];
  } else {
    state.sessions[today] = type;
  }
  save("sessions", state.sessions);
  renderWeekStrip();
  renderHeader();
  renderSessionHistory();
  const msg = document.getElementById("session-msg");
  msg.textContent = state.sessions[today]
    ? `Séance ${type} enregistrée !`
    : "Séance annulée.";
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
  const exercises = getExercises();
  const list = exercises[currentProgram] || [];
  const checks = state.checks[currentProgram] || {};
  document.getElementById("program-list").innerHTML = list.length
    ? list
        .map(
          (e, i) => `
    <div class="ex-item">
      <div>
        <div class="ex-name">${e.name}</div>
        <div class="ex-detail">${e.detail}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="ex-check ${checks[i] ? "done" : ""}" onclick="toggleCheck('${currentProgram}', ${i})">${checks[i] ? "✓" : ""}</button>
        <button class="btn-ex-del" onclick="deleteExercise('${currentProgram}', ${i})">×</button>
      </div>
    </div>
  `,
        )
        .join("")
    : '<p class="empty">Aucun exercice. Ajoutes-en un ci-dessous !</p>';
}

window.toggleCheck = function (s, i) {
  state.checks[s][i] = !state.checks[s][i];
  save("checks_" + getToday(), state.checks);
  renderProgram();
};

window.addExercise = function () {
  const name = document.getElementById("ex-name").value.trim();
  const detail = document.getElementById("ex-detail").value.trim();
  if (!name) return;
  const exercises = getExercises();
  exercises[currentProgram].push({ name, detail: detail || "3 × 10 reps" });
  saveExercises(exercises);
  document.getElementById("ex-name").value = "";
  document.getElementById("ex-detail").value = "";
  renderProgram();
};

window.deleteExercise = function (s, i) {
  if (!confirm("Supprimer cet exercice ?")) return;
  const exercises = getExercises();
  exercises[s].splice(i, 1);
  saveExercises(exercises);
  const checks = state.checks[s] || {};
  const newChecks = {};
  Object.keys(checks).forEach((k) => {
    const ki = parseInt(k);
    if (ki < i) newChecks[ki] = checks[ki];
    else if (ki > i) newChecks[ki - 1] = checks[ki];
  });
  state.checks[s] = newChecks;
  save("checks_" + getToday(), state.checks);
  renderProgram();
};

// EAU
function updateWater() {
  const ml = load("water_" + getToday(), 0);
  const goal = state.profil.water || 2000;
  const l = (ml / 1000).toFixed(1);
  const goalL = (goal / 1000).toFixed(1);
  document.getElementById("water-val").textContent = l + " L";
  document.getElementById("water-goal").textContent = "/ " + goalL + " L";
  document.getElementById("water-bar").style.width =
    Math.min((ml / goal) * 100, 100) + "%";
}

window.addWater = function (ml) {
  const current = load("water_" + getToday(), 0);
  save("water_" + getToday(), current + ml);
  updateWater();
};

window.resetWater = function () {
  save("water_" + getToday(), 0);
  updateWater();
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
    const protAuto = Math.round(p.poids * 2);
    const carbAuto = Math.round((deficit * 0.4) / 4);
    const fatAuto = Math.round((deficit * 0.3) / 9);

    state.profil.prot = protAuto;
    state.profil.carb = carbAuto;
    state.profil.fat = fatAuto;
    if (!state.profil.cal) state.profil.cal = deficit;
    save("profil", state.profil);

    document.getElementById("calc-block").style.display = "block";
    document.getElementById("calc-content").innerHTML = `
    <div class="calc-row"><span>BMR</span><span class="cv">${bmr} kcal</span></div>
    <div class="calc-row"><span>TDEE sédentaire</span><span class="cv">${tdee} kcal</span></div>
    <div class="calc-row"><span>Objectif calorique</span><span class="cv">${deficit} kcal</span></div>
    <div class="calc-row"><span>Protéines</span><span class="cv">${protAuto} g/j</span></div>
    <div class="calc-row"><span>Glucides</span><span class="cv">${carbAuto} g/j</span></div>
    <div class="calc-row"><span>Lipides</span><span class="cv">${fatAuto} g/j</span></div>
  `;
    updateNutrition();
  }
  const msg = document.getElementById("profil-msg");
  msg.textContent = "Profil enregistré !";
  setTimeout(() => (msg.textContent = ""), 2500);
  loadProfilInputs();
  renderGoal();
};

function loadProfilInputs() {
  const p = state.profil;
  if (p.poids) document.getElementById("p-poids").value = p.poids;
  if (p.taille) document.getElementById("p-taille").value = p.taille;
  if (p.age) document.getElementById("p-age").value = p.age;
  if (p.cal) document.getElementById("p-cal").value = p.cal;
  if (p.prot) document.getElementById("p-prot").value = p.prot;
  const gw = load("goal-weight", 0);
  if (gw) document.getElementById("p-goal").value = gw;
}

// OBJECTIF
function renderGoal() {
  const el = document.getElementById("goal-preview");
  if (!el) return;
  const p = state.profil;
  const goalWeight = load("goal-weight", 0);
  const weights = state.weights;
  if (!goalWeight || !p.poids) {
    el.innerHTML =
      '<p class="empty">Entre ton poids actuel et ton objectif pour voir ta progression.</p>';
    return;
  }
  const startWeight = weights.length > 0 ? weights[0].val : p.poids;
  const currentWeight =
    weights.length > 0 ? weights[weights.length - 1].val : p.poids;
  const totalToLose = startWeight - goalWeight;
  const lost = startWeight - currentWeight;
  const pct =
    totalToLose > 0 ? Math.min(Math.round((lost / totalToLose) * 100), 100) : 0;
  const now = new Date();
  const target = new Date("2026-08-01");
  const daysLeft = Math.max(
    0,
    Math.round((target - now) / (1000 * 60 * 60 * 24)),
  );
  const remaining = Math.max(0, (currentWeight - goalWeight).toFixed(1));
  el.innerHTML = `
    <div class="goal-bar-wrap">
      <div class="goal-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="goal-stats">
      <div class="goal-stat">
        <div class="goal-stat-val">${pct}%</div>
        <div class="goal-stat-label">Accompli</div>
      </div>
      <div class="goal-stat">
        <div class="goal-stat-val">${remaining}kg</div>
        <div class="goal-stat-label">Restants</div>
      </div>
      <div class="goal-stat">
        <div class="goal-stat-val">${daysLeft}j</div>
        <div class="goal-stat-label">Avant août</div>
      </div>
    </div>
  `;
}

window.saveGoalWeight = function () {
  const val = parseFloat(document.getElementById("p-goal").value) || 0;
  if (!val) return;
  save("goal-weight", val);
  renderGoal();
};

// RÉSUMÉ
function renderResume() {
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const days = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  const weekDates = days.map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - todayIdx + i);
    return { label: d, key: date.toISOString().split("T")[0] };
  });

  // Nutrition moyenne
  let totalCal = 0,
    totalProt = 0,
    totalCarb = 0,
    totalFat = 0,
    daysWithData = 0;
  weekDates.forEach(({ key }) => {
    const foods = load("foods_" + key, []);
    if (foods.length) {
      totalCal += foods.reduce((s, f) => s + (f.cal || 0), 0);
      totalProt += foods.reduce((s, f) => s + (f.prot || 0), 0);
      totalCarb += foods.reduce((s, f) => s + (f.carb || 0), 0);
      totalFat += foods.reduce((s, f) => s + (f.fat || 0), 0);
      daysWithData++;
    }
  });
  const avgCal = daysWithData ? Math.round(totalCal / daysWithData) : 0;
  const avgProt = daysWithData ? Math.round(totalProt / daysWithData) : 0;
  const avgCarb = daysWithData ? Math.round(totalCarb / daysWithData) : 0;
  const avgFat = daysWithData ? Math.round(totalFat / daysWithData) : 0;
  const goalCal = state.profil.cal || 0;

  document.getElementById("resume-nutrition").innerHTML = `
    <div class="resume-grid">
      <div class="resume-stat">
        <div class="resume-stat-val">${avgCal}</div>
        <div class="resume-stat-label">kcal / jour</div>
      </div>
      <div class="resume-stat">
        <div class="resume-stat-val">${goalCal ? Math.round((avgCal / goalCal) * 100) + "%" : "—"}</div>
        <div class="resume-stat-label">de l'objectif</div>
      </div>
      <div class="resume-stat">
        <div class="resume-stat-val">${avgProt}g</div>
        <div class="resume-stat-label">protéines moy.</div>
      </div>
      <div class="resume-stat">
        <div class="resume-stat-val">${daysWithData}j</div>
        <div class="resume-stat-label">jours trackés</div>
      </div>
    </div>
  `;

  // Séances
  const sessionCount = weekDates.filter(
    ({ key }) => state.sessions[key],
  ).length;
  document.getElementById("resume-semaine").innerHTML = weekDates
    .map(({ label, key }) => {
      const session = state.sessions[key];
      const foods = load("foods_" + key, []);
      const cal = foods.reduce((s, f) => s + (f.cal || 0), 0);
      return `<div class="resume-day">
      <span class="resume-day-name">${label}</span>
      <div style="display:flex;gap:6px;align-items:center;">
        ${cal ? `<span class="resume-day-val">${cal} kcal</span>` : ""}
        ${session ? `<span class="badge-done">Séance ${session}</span>` : `<span class="badge-rest">Repos</span>`}
      </div>
    </div>`;
    })
    .join("");

  document.getElementById("resume-workout").innerHTML = `
    <div class="resume-grid">
      <div class="resume-stat">
        <div class="resume-stat-val">${sessionCount}</div>
        <div class="resume-stat-label">séances cette semaine</div>
      </div>
      <div class="resume-stat">
        <div class="resume-stat-val">${Object.keys(state.sessions).length}</div>
        <div class="resume-stat-label">séances au total</div>
      </div>
    </div>
  `;

  // Poids
  const weights = state.weights;
  if (weights.length >= 2) {
    const first = weights[0].val;
    const last = weights[weights.length - 1].val;
    const diff = (last - first).toFixed(1);
    const arrow = diff < 0 ? "down" : "up";
    const sign = diff < 0 ? "" : "+";
    document.getElementById("resume-poids").innerHTML = `
      <div class="resume-grid">
        <div class="resume-stat">
          <div class="resume-stat-val">${last} kg</div>
          <div class="resume-stat-label">poids actuel</div>
        </div>
        <div class="resume-stat">
          <div class="resume-stat-val ${arrow}">${sign}${diff} kg</div>
          <div class="resume-stat-label">depuis le début</div>
        </div>
      </div>
    `;
  } else {
    document.getElementById("resume-poids").innerHTML =
      '<p class="empty">Enregistre au moins 2 pesées pour voir l\'évolution.</p>';
  }
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
updateWater();
renderFavorites();
renderGoal();
