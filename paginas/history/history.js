/* ==========================================
   BLOCO 01: Configuracoes Globais, Chaves e Seletores
   ========================================== */
const HISTORY_STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const HISTORY_UPDATED_EVENT = "cybercheck:history-updated";
const HISTORY_CHANNEL_NAME = "cybercheck_audit_sync_channel";

const state = {
  allEntries: [],
  filteredEntries: [],
  lastRawSnapshot: "",
  channel: null
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
   BLOCO 02: Gerenciamento de Tema (Dark / Light)
   ========================================== */
function getCurrentTheme() {
  return document.body.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(themeName) {
  const normalizedTheme = themeName === "light" ? "light" : "dark";
  document.body.dataset.theme = normalizedTheme;
  document.body.setAttribute("data-theme", normalizedTheme);

  if (dom.historyThemeCss) {
    dom.historyThemeCss.setAttribute(
      "href",
      normalizedTheme === "light"
        ? "../styles-light/dashboard.css"
        : "../styles-dark/dashboard.css"
    );
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

function normalizeAuditEntry(entry) {
  const numericScore = Number(entry?.score ?? entry?.Score);
  const safeScore = Number.isFinite(numericScore)
    ? Math.max(0, Math.min(100, Math.round(numericScore)))
    : 0;

  return {
    id: entry?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    target: String(entry?.target || entry?.url || entry?.domain || "alvo-desconhecido"),
    score: safeScore,
    grade: entry?.grade || (safeScore >= 80 ? "A" : safeScore >= 60 ? "B" : "C"),
    risk: normalizeRisk(entry?.risk),
    timestamp: entry?.timestamp || entry?.analyzedAt || entry?.scanDate || new Date().toISOString()
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
  const highCount = entries.filter((item) => item.risk === "HIGH").length;
  const lowCount = entries.filter((item) => item.risk === "LOW").length;
  const avg = total > 0
    ? (entries.reduce((acc, item) => acc + item.score, 0) / total).toFixed(1)
    : "--";

  if (dom.historyFilteredCount) dom.historyFilteredCount.textContent = String(total);
  if (dom.historyAverageScore) dom.historyAverageScore.textContent = total > 0 ? avg : "--";
  if (dom.historyHighCount) dom.historyHighCount.textContent = String(highCount);
  if (dom.historyLowCount) dom.historyLowCount.textContent = String(lowCount);
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

  entries.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const targetSpan = document.createElement("span");
    targetSpan.textContent = `${item.target} - Score: `;

    const scoreStrong = document.createElement("strong");
    scoreStrong.textContent = `${item.score}/100 (${item.risk})`;
    targetSpan.appendChild(scoreStrong);

    const dateSpan = document.createElement("span");
    dateSpan.textContent = new Date(item.timestamp).toLocaleString("pt-PT");

    li.addEventListener("click", () => {
      window.location.href = `../audit/audit.html?target=${encodeURIComponent(item.target)}`;
    });

    li.appendChild(targetSpan);
    li.appendChild(dateSpan);
    dom.historyList.appendChild(li);
  });
}

/* ==========================================
   BLOCO 05: Exportacao e Limpeza do Historico
   ========================================== */
function exportHistoryJson() {
  const payload = JSON.stringify(state.filteredEntries, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `cybercheck-historico-${new Date().toISOString().slice(0, 10)}.json`;
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

  setInterval(() => {
    refreshHistoryView(false);
  }, 1500);
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