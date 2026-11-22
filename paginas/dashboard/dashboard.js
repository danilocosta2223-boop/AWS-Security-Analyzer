/* ==========================================
   BLOCO 01: Configuracoes Globais, Endpoints e Seletores
   ========================================== */
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const HISTORY_STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const HISTORY_UPDATED_EVENT = "cybercheck:history-updated";
const HISTORY_CHANNEL_NAME = "cybercheck_audit_sync_channel";
const AUDIT_GOAL_COUNT = 25;

const state = {
  history: [],
  riskChart: null,
  trendChart: null,
  isRefreshing: false,
  lastRawSnapshot: "",
  channel: null
};

const dom = {
  apiStatus: document.getElementById("apiStatus"),
  apiVersion: document.getElementById("apiVersion"),
  backendType: document.getElementById("backendType"),
  refreshDashboardBtn: document.getElementById("refreshDashboardBtn"),
  themeToggle: document.getElementById("themeToggle"),
  dashboardThemeCss: document.getElementById("dashboard-theme-css"),
  totalAudits: document.getElementById("totalAudits"),
  averageScore: document.getElementById("averageScore"),
  highRiskCount: document.getElementById("highRiskCount"),
  lowRiskCount: document.getElementById("lowRiskCount"),
  verifiedSitesCount: document.getElementById("verifiedSitesCount"),
  safeSitesCount: document.getElementById("safeSitesCount"),
  safeProbability: document.getElementById("safeProbability"),
  goalProgressText: document.getElementById("goalProgressText"),
  riskChartCanvas: document.getElementById("riskChart"),
  trendChartCanvas: document.getElementById("trendChart"),
  dashboardHistoryList: document.getElementById("dashboardHistoryList")
};

/* ==========================================
   BLOCO 02: Gerenciamento de Tema (Dark / Light)
   ========================================== */
function getCurrentTheme() {
  return document.body.dataset.theme === "light" || document.body.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function applyTheme(themeName) {
  const normalizedTheme = themeName === "light" ? "light" : "dark";
  document.body.dataset.theme = normalizedTheme;
  document.body.setAttribute("data-theme", normalizedTheme);

  if (dom.dashboardThemeCss) {
    dom.dashboardThemeCss.setAttribute(
      "href",
      normalizedTheme === "light"
        ? "../styles-light/dashboard.css"
        : "../styles-dark/dashboard.css"
    );
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch (err) {
    console.warn("[Dashboard] Falha ao guardar preferencia de tema:", err);
  }

  renderCharts();
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

/* ==========================================
   BLOCO 03: Estado da API e Normalizacao de Dados
   ========================================== */
function normalizeRisk(riskValue, score) {
  const raw = String(riskValue || "").trim().toUpperCase();
  if (raw === "HIGH" || raw === "ALTO" || raw === "CRITICAL") return "HIGH";
  if (raw === "MEDIUM" || raw === "MEDIO" || raw === "MÉDIO") return "MEDIUM";
  if (raw === "LOW" || raw === "BAIXO") return "LOW";
  if (score >= 85) return "LOW";
  if (score >= 60) return "MEDIUM";
  return "HIGH";
}

function normalizeAuditEntry(entry) {
  const numericScore = Number(entry?.score ?? entry?.Score ?? 0);
  const safeScore = Number.isFinite(numericScore)
    ? Math.max(0, Math.min(100, Math.round(numericScore)))
    : 0;

  return {
    id: String(entry?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    target: String(entry?.target || entry?.url || entry?.domain || "alvo-desconhecido"),
    score: safeScore,
    grade: String(
      entry?.grade ??
        entry?.Grade ??
        (safeScore >= 90 ? "A" : safeScore >= 80 ? "B" : safeScore >= 65 ? "C" : safeScore >= 50 ? "D" : "F")
    ).trim(),
    risk: normalizeRisk(entry?.risk ?? entry?.Risk, safeScore),
    timestamp: entry?.timestamp || entry?.scanDate || entry?.analyzedAt || new Date().toISOString()
  };
}

function readRawHistorySnapshot() {
  try {
    return localStorage.getItem(HISTORY_STORAGE_KEY) || "";
  } catch (err) {
    console.warn("[Dashboard] Erro ao ler snapshot do historico:", err);
    return "";
  }
}

function loadHistoryFromStorage() {
  try {
    const raw = readRawHistorySnapshot();
    state.lastRawSnapshot = raw;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeAuditEntry) : [];
  } catch (err) {
    console.warn("[Dashboard] Erro ao ler historico local:", err);
    return [];
  }
}

async function checkApiHealth() {
  if (!dom.apiStatus) return;

  dom.apiStatus.textContent = "A verificar ligacao com a API...";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    dom.apiStatus.textContent = "API Online e operacional";

    if (dom.apiVersion) {
      dom.apiVersion.textContent = `Aplicacao: ${data?.application || data?.Application || data?.service || "Cyber Shield API"}`;
    }

    if (dom.backendType) {
      const stamp = data?.timestamp || data?.Timestamp || new Date().toLocaleTimeString("pt-PT");
      dom.backendType.textContent = `Timestamp: ${stamp}`;
    }
  } catch (err) {
    dom.apiStatus.textContent = "API indisponivel (modo historico local ativo)";
    if (dom.backendType) {
      dom.backendType.textContent = `Timestamp: ${new Date().toLocaleTimeString("pt-PT")}`;
    }
  }
}

/* ==========================================
   BLOCO 04: Calculo de KPIs, Probabilidade e Historico
   ========================================== */
function computeDashboardMetrics(entries) {
  const totalAudits = entries.length;
  const uniqueTargets = new Set(
    entries.map((item) => String(item.target || "").trim().toLowerCase()).filter(Boolean)
  );
  const verifiedSites = uniqueTargets.size;
  const safeAudits = entries.filter((item) => item.risk === "LOW" || item.score >= 85).length;
  const highRisk = entries.filter((item) => item.risk === "HIGH" || item.risk === "CRITICAL").length;
  const lowRisk = entries.filter((item) => item.risk === "LOW").length;

  const averageScore = totalAudits > 0
    ? (entries.reduce((acc, item) => acc + item.score, 0) / totalAudits).toFixed(1)
    : "--";

  const safeProbabilityPct = totalAudits > 0
    ? Math.round((safeAudits / totalAudits) * 100)
    : 0;

  const goalPct = Math.min(100, Math.round((totalAudits / AUDIT_GOAL_COUNT) * 100));

  return {
    totalAudits,
    verifiedSites,
    safeAudits,
    highRisk,
    lowRisk,
    averageScore,
    safeProbabilityPct,
    goalPct
  };
}

function updateKpis(entries) {
  const metrics = computeDashboardMetrics(entries);

  if (dom.totalAudits) dom.totalAudits.textContent = String(metrics.totalAudits);
  if (dom.averageScore) dom.averageScore.textContent = metrics.averageScore;
  if (dom.highRiskCount) dom.highRiskCount.textContent = String(metrics.highRisk);
  if (dom.lowRiskCount) dom.lowRiskCount.textContent = String(metrics.lowRisk);
  if (dom.verifiedSitesCount) dom.verifiedSitesCount.textContent = String(metrics.verifiedSites);
  if (dom.safeSitesCount) dom.safeSitesCount.textContent = String(metrics.safeAudits);
  if (dom.safeProbability) dom.safeProbability.textContent = `${metrics.safeProbabilityPct}%`;
  if (dom.goalProgressText) {
    dom.goalProgressText.textContent = `${metrics.totalAudits}/${AUDIT_GOAL_COUNT} (${metrics.goalPct}%)`;
  }
}

function renderDashboardHistory(entries) {
  if (!dom.dashboardHistoryList) return;
  dom.dashboardHistoryList.innerHTML = "";

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history-empty";
    emptyItem.textContent = "Nenhuma auditoria registada.";
    dom.dashboardHistoryList.appendChild(emptyItem);
    return;
  }

  entries.slice(0, 10).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const targetSpan = document.createElement("span");
    targetSpan.textContent = `${item.target} - Score: `;

    const scoreStrong = document.createElement("strong");
    scoreStrong.textContent = `${item.score}/100 (${item.risk})`;
    targetSpan.appendChild(scoreStrong);

    const metaSpan = document.createElement("span");
    metaSpan.textContent = new Date(item.timestamp).toLocaleString("pt-PT");

    li.addEventListener("click", () => {
      window.location.href = `../audit/audit.html?target=${encodeURIComponent(item.target)}`;
    });

    li.appendChild(targetSpan);
    li.appendChild(metaSpan);
    dom.dashboardHistoryList.appendChild(li);
  });
}

/* ==========================================
   BLOCO 05: Graficos Chart.js
   ========================================== */
function getThemeChartPalette() {
  const isLight = getCurrentTheme() === "light";
  return {
    textColor: isLight ? "#0f172a" : "#e2e8f0",
    gridColor: isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(148, 163, 184, 0.18)",
    lineColor: isLight ? "#0284c7" : "#38bdf8",
    lineFill: isLight ? "rgba(2, 132, 199, 0.16)" : "rgba(56, 189, 248, 0.18)",
    lowColor: "#16a34a",
    mediumColor: "#eab308",
    highColor: "#dc2626"
  };
}

function destroyChartInstance(chartKey) {
  if (state[chartKey]) {
    state[chartKey].destroy();
    state[chartKey] = null;
  }
}

function renderRiskChart(palette) {
  if (!dom.riskChartCanvas) return;
  destroyChartInstance("riskChart");

  const lowCount = state.history.filter((item) => item.risk === "LOW").length;
  const mediumCount = state.history.filter((item) => item.risk === "MEDIUM").length;
  const highCount = state.history.filter((item) => item.risk === "HIGH" || item.risk === "CRITICAL").length;
  const hasRiskData = lowCount + mediumCount + highCount > 0;

  state.riskChart = new Chart(dom.riskChartCanvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Risco Baixo", "Risco Medio", "Risco Alto"],
      datasets: [
        {
          data: hasRiskData ? [lowCount, mediumCount, highCount] : [1, 0, 0],
          backgroundColor: [palette.lowColor, palette.mediumColor, palette.highColor],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: palette.textColor }
        }
      }
    }
  });
}

function renderTrendChart(palette) {
  if (!dom.trendChartCanvas) return;
  destroyChartInstance("trendChart");

  const orderedForTrend = [...state.history].slice(0, 8).reverse();
  const labels = orderedForTrend.length
    ? orderedForTrend.map((item, idx) => `${idx + 1}. ${item.target.replace(/^https?:\/\//, "").slice(0, 18)}`)
    : ["Sem dados"];
  const scores = orderedForTrend.length
    ? orderedForTrend.map((item) => item.score)
    : [0];

  state.trendChart = new Chart(dom.trendChartCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Security Score",
          data: scores,
          borderColor: palette.lineColor,
          backgroundColor: palette.lineFill,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: palette.textColor },
          grid: { color: palette.gridColor }
        },
        x: {
          ticks: { color: palette.textColor },
          grid: { color: palette.gridColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: palette.textColor }
        }
      }
    }
  });
}

function renderCharts() {
  if (typeof Chart === "undefined") return;
  const palette = getThemeChartPalette();
  renderRiskChart(palette);
  renderTrendChart(palette);
}

/* ==========================================
   BLOCO 06: Atualizacao em Tempo Real e Eventos
   ========================================== */
function syncHistoryViews(force = false) {
  const snapshot = readRawHistorySnapshot();
  if (!force && snapshot === state.lastRawSnapshot) {
    return;
  }

  state.history = loadHistoryFromStorage();
  updateKpis(state.history);
  renderDashboardHistory(state.history);
  renderCharts();
}

async function refreshDashboard() {
  if (state.isRefreshing) return;
  state.isRefreshing = true;

  try {
    syncHistoryViews(true);
    await checkApiHealth();
  } finally {
    state.isRefreshing = false;
  }
}

function setupRealtimeSync() {
  if ("BroadcastChannel" in window) {
    try {
      state.channel = new BroadcastChannel(HISTORY_CHANNEL_NAME);
      state.channel.addEventListener("message", (event) => {
        if (event?.data?.type === "history-updated") {
          syncHistoryViews(true);
        }
      });
    } catch (err) {
      console.warn("[Dashboard] BroadcastChannel indisponivel:", err);
    }
  }

  window.addEventListener(HISTORY_UPDATED_EVENT, () => {
    syncHistoryViews(true);
  });

  window.addEventListener("focus", () => {
    syncHistoryViews(false);
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      syncHistoryViews(false);
    }
  });

  setInterval(() => {
    syncHistoryViews(false);
  }, 1500);
}

function bindEvents() {
  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", toggleTheme);
  }

  if (dom.refreshDashboardBtn) {
    dom.refreshDashboardBtn.addEventListener("click", refreshDashboard);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === HISTORY_STORAGE_KEY) {
      syncHistoryViews(true);
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
  refreshDashboard();
});