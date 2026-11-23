/* ==========================================
   BLOCO 01: Configuracoes Globais, Chaves e Seletores
   ========================================== */
const HISTORY_STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const HISTORY_UPDATED_EVENT = "cybercheck:history-updated";
const HISTORY_CHANNEL_NAME = "cybercheck_audit_sync_channel";
const POLL_INTERVAL_MS = 1500;

const THEME_STYLESHEETS = {
  light: "../styles-light/dashboard.css",
  dark: "../styles-dark/dashboard.css"
};

const state = {
  allEntries: [],
  filteredEntries: [],
  lastRawSnapshot: "",
  channel: null,
  pollTimerId: null
};

const dom = {
  themeToggle: document.getElementById("themeToggle"),
  historyThemeCss: document.getElementById("history-theme-css"),
  historySearchInput: document.getElementById("historySearchInput"),
  historyRiskFilter: document.getElementById("historyRiskFilter"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  exportHistoryJsonBtn: document.getElementById("exportHistoryJsonBtn"),
  historyFilteredCount: document.getElementById("historyFilteredCount"),
  historyAverageScore: document.getElementById("historyAverageScore"),
  historyHighCount: document.getElementById("historyHighCount"),
  historyLowCount: document.getElementById("historyLowCount"),
  historyList: document.getElementById("historyList")
};

/* ==========================================
   BLOCO 02: Utilitarios e Gerenciamento de Tema
   ========================================== */
function pickField(obj, keys, fallback = undefined) {
  if (!obj || typeof obj !== "object") return fallback;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  return fallback;
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function formatHistoryTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("pt-PT");
}

function getCurrentTheme() {
  return document.body.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(themeName) {
  const normalizedTheme = themeName === "light" ? "light" : "dark";
  document.body.dataset.theme = normalizedTheme;
  document.body.setAttribute("data-theme", normalizedTheme);

  if (dom.historyThemeCss) {
    dom.historyThemeCss.setAttribute("href", THEME_STYLESHEETS[normalizedTheme]);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch (err) {
    console.warn("Falha ao guardar preferencia de tema:", err);
  }
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

/* ==========================================
   BLOCO 03: Normalizacao e Leitura do Historico
   ========================================== */
function normalizeRisk(riskValue) {
  const raw = String(riskValue || "").trim().toUpperCase();
  if (raw === "HIGH" || raw === "ALTO" || raw === "CRITICAL") return "HIGH";
  if (raw === "MEDIUM" || raw === "MEDIO" || raw === "MÉDIO") return "MEDIUM";
  return "LOW";
}

function inferGrade(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}

function normalizeAuditEntry(entry) {
  const safeScore = clampScore(pickField(entry, ["score", "Score"], NaN));
  const rawTarget = pickField(entry, ["target", "url", "domain"], "alvo-desconhecido");
  const rawGrade = pickField(entry, ["grade"], "");
  const rawRisk = pickField(entry, ["risk"], "");
  const rawTimestamp = pickField(entry, ["timestamp", "analyzedAt", "scanDate"], new Date().toISOString());
  const rawId = pickField(entry, ["id"], `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  return {
    id: rawId,
    target: String(rawTarget),
    score: safeScore,
    grade: rawGrade || inferGrade(safeScore),
    risk: normalizeRisk(rawRisk),
    timestamp: rawTimestamp
  };
}

function readRawHistorySnapshot() {
  try {
    return localStorage.getItem(HISTORY_STORAGE_KEY) || "";
  } catch (err) {
    console.warn("Erro ao ler snapshot do historico:", err);
    return "";
  }
}

function loadHistoryEntries() {
  try {
    const raw = readRawHistorySnapshot();
    state.lastRawSnapshot = raw;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeAuditEntry) : [];
  } catch (err) {
    console.warn("Erro ao ler historico local:", err);
    return [];
  }
}

function saveHistoryEntries(entries) {
  try {
    const serialized = JSON.stringify(entries);
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
    state.lastRawSnapshot = serialized;
    notifyHistoryChange(entries);
  } catch (err) {
    console.warn("Erro ao guardar historico local:", err);
  }
}

/* ==========================================
   BLOCO 04: Filtros, Resumo e Renderizacao
   ========================================== */
function getFilteredEntries() {
  const term = (dom.historySearchInput?.value || "").trim().toLowerCase();
  const riskFilter = (dom.historyRiskFilter?.value || "ALL").toUpperCase();

  return state.allEntries.filter((item) => {
    const matchesRisk = riskFilter === "ALL" || item.risk === riskFilter;
    const matchesTerm = !term || item.target.toLowerCase().includes(term);
    return matchesRisk && matchesTerm;
  });
}

function updateSummaryKpis(entries) {
  const total = entries.length;
  let highCount = 0;
  let lowCount = 0;
  let scoreSum = 0;

  for (const item of entries) {
    scoreSum += item.score;
    if (item.risk === "HIGH") highCount += 1;
    else if (item.risk === "LOW") lowCount += 1;
  }

  const avg = total > 0 ? (scoreSum / total).toFixed(1) : "--";

  if (dom.historyFilteredCount) dom.historyFilteredCount.textContent = String(total);
  if (dom.historyAverageScore) dom.historyAverageScore.textContent = total > 0 ? avg : "--";
  if (dom.historyHighCount) dom.historyHighCount.textContent = String(highCount);
  if (dom.historyLowCount) dom.historyLowCount.textContent = String(lowCount);
}

function buildHistoryListItem(item) {
  const li = document.createElement("li");
  li.className = "history-item";
  li.setAttribute("role", "button");
  li.setAttribute("tabindex", "0");

  const targetSpan = document.createElement("span");
  targetSpan.textContent = `${item.target} - Score: `;

  const scoreStrong = document.createElement("strong");
  scoreStrong.textContent = `${item.score}/100 (${item.risk})`;
  targetSpan.appendChild(scoreStrong);

  const dateSpan = document.createElement("span");
  dateSpan.textContent = formatHistoryTimestamp(item.timestamp);

  const openTargetAudit = () => {
    window.location.href = `../audit/audit.html?target=${encodeURIComponent(item.target)}`;
  };

  li.addEventListener("click", openTargetAudit);
  li.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTargetAudit();
    }
  });

  li.appendChild(targetSpan);
  li.appendChild(dateSpan);
  return li;
}

function renderHistoryList(entries) {
  if (!dom.historyList) return;
  dom.historyList.innerHTML = "";

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history-empty";
    emptyItem.textContent = "Nenhuma auditoria registada.";
    dom.historyList.appendChild(emptyItem);
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach((item) => {
    fragment.appendChild(buildHistoryListItem(item));
  });
  dom.historyList.appendChild(fragment);
}

/* ==========================================
   BLOCO 05: Exportacao e Limpeza do Historico
   ========================================== */
function exportHistoryJson() {
  const payload = JSON.stringify(state.filteredEntries, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);

  const link = document.createElement("a");
  link.href = url;
  link.download = `cybercheck-historico-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function clearHistory() {
  state.allEntries = [];
  state.filteredEntries = [];
  saveHistoryEntries([]);
  updateSummaryKpis([]);
  renderHistoryList([]);
}

/* ==========================================
   BLOCO 06: Sincronizacao em Tempo Real com audit.js
   ========================================== */
function notifyHistoryChange(entries) {
  try {
    window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT, { detail: entries }));
  } catch (err) {
    console.warn("Falha ao disparar evento de historico:", err);
  }

  if (state.channel) {
    try {
      state.channel.postMessage({ type: "history-updated", entries });
    } catch (err) {
      console.warn("Falha ao publicar no BroadcastChannel:", err);
    }
  }
}

function applyFilterAndRender() {
  state.filteredEntries = getFilteredEntries();
  updateSummaryKpis(state.filteredEntries);
  renderHistoryList(state.filteredEntries);
}

function refreshHistoryView(force = false) {
  const currentSnapshot = readRawHistorySnapshot();
  if (!force && currentSnapshot === state.lastRawSnapshot) {
    return;
  }

  state.allEntries = loadHistoryEntries();
  applyFilterAndRender();
}

function setupRealtimeSync() {
  if ("BroadcastChannel" in window) {
    state.channel = new BroadcastChannel(HISTORY_CHANNEL_NAME);
    state.channel.addEventListener("message", (event) => {
      if (event?.data?.type === "history-updated") {
        refreshHistoryView(true);
      }
    });
  }

  window.addEventListener(HISTORY_UPDATED_EVENT, () => {
    refreshHistoryView(true);
  });

  window.addEventListener("focus", () => {
    refreshHistoryView(false);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshHistoryView(false);
    }
  });

  state.pollTimerId = window.setInterval(() => {
    refreshHistoryView(false);
  }, POLL_INTERVAL_MS);

  window.addEventListener("beforeunload", () => {
    if (state.pollTimerId !== null) {
      clearInterval(state.pollTimerId);
      state.pollTimerId = null;
    }
    if (state.channel) {
      state.channel.close();
      state.channel = null;
    }
  });
}

function bindEvents() {
  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", toggleTheme);
  }

  if (dom.historySearchInput) {
    dom.historySearchInput.addEventListener("input", applyFilterAndRender);
  }

  if (dom.historyRiskFilter) {
    dom.historyRiskFilter.addEventListener("change", applyFilterAndRender);
  }

  if (dom.clearHistoryBtn) {
    dom.clearHistoryBtn.addEventListener("click", clearHistory);
  }

  if (dom.exportHistoryJsonBtn) {
    dom.exportHistoryJsonBtn.addEventListener("click", exportHistoryJson);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === HISTORY_STORAGE_KEY) {
      refreshHistoryView(true);
    } else if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue || "dark");
    }
  });
}

/* ==========================================
   BLOCO 07: Inicializacao da Aplicacao
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.theme || "dark";
  } catch (err) {
    savedTheme = "dark";
  }

  applyTheme(savedTheme);
  bindEvents();
  setupRealtimeSync();
  refreshHistoryView(true);
});