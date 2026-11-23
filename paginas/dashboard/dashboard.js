/* ==========================================
   BLOCO 01: Configuracoes Globais, Endpoints e Seletores
   ========================================== */
const API_BASE_URL = "https://aws-security-analyzer.onrender.com";
const UPLOAD_PDF_ENDPOINT = `${API_BASE_URL}/api/upload-pdf`;
const LIVE_STREAM_ENDPOINT = `${API_BASE_URL}/api/auditoria/stream`;
const LIVE_WS_ENDPOINT = API_BASE_URL.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://") + "/ws/auditoria";
const HISTORY_STORAGE_KEY = "cybershield_audit_history_v1";
const THEME_STORAGE_KEY = "cybershield_theme";
const HISTORY_UPDATED_EVENT = "cybercheck:history-updated";
const HISTORY_CHANNEL_NAME = "cybercheck_audit_sync_channel";
const AUDIT_GOAL_COUNT = 25;
const LIVE_POLL_INTERVAL_MS = 10000;

const state = {
  history: [],
  riskChart: null,
  trendChart: null,
  isRefreshing: false,
  lastRawSnapshot: "",
  channel: null,
  pdfUrlCache: new Map(),
  uploadingIds: new Set(),
  liveScore: null,
  previousScore: null,
  lastScoreDeltaText: "--",
  lastLiveUpdateText: "--",
  timelineSteps: [],
  eventSource: null,
  webSocket: null,
  liveTimer: null
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
  dashboardHistoryList: document.getElementById("dashboardHistoryList"),
  liveReportContainer: document.getElementById("liveReportContainer"),
  liveScoreValue: document.getElementById("liveScoreValue"),
  liveScoreDelta: document.getElementById("liveScoreDelta"),
  liveLastUpdate: document.getElementById("liveLastUpdate"),
  liveExecutiveSummary: document.getElementById("liveExecutiveSummary"),
  liveLaymanCards: document.getElementById("liveLaymanCards"),
  liveTimelineList: document.getElementById("liveTimelineList"),
  regenerateLivePdfBtn: document.getElementById("regenerateLivePdfBtn")
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
    dom.dashboardThemeCss.href =
      normalizedTheme === "light"
        ? "../styles-light/dashboard.css"
        : "../styles-dark/dashboard.css";
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

  const rawPdfPath = String(entry?.pdfPath ?? entry?.PdfPath ?? "").trim();

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
    elapsedMs: Number(entry?.elapsedMs ?? entry?.ElapsedMs ?? 0) || 0,
    timestamp: entry?.timestamp || entry?.scanDate || entry?.analyzedAt || new Date().toISOString(),
    pdfPath: rawPdfPath,
    details: entry?.details && typeof entry.details === "object" ? entry.details : {}
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

function persistHistoryAndNotify(updatedEntries) {
  try {
    const serialized = JSON.stringify(updatedEntries);
    localStorage.setItem(HISTORY_STORAGE_KEY, serialized);
    state.lastRawSnapshot = serialized;
    state.history = updatedEntries;
  } catch (err) {
    console.warn("[Dashboard] Falha ao atualizar historico no localStorage:", err);
  }

  window.dispatchEvent(new CustomEvent(HISTORY_UPDATED_EVENT, { detail: updatedEntries }));

  if ("BroadcastChannel" in window) {
    try {
      const syncChannel = new BroadcastChannel(HISTORY_CHANNEL_NAME);
      syncChannel.postMessage({ type: "history-updated", entries: updatedEntries });
      syncChannel.close();
    } catch (_) {
      // ignora erro de BroadcastChannel
    }
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
      const stamp = data?.timestamp || data?.Timestamp || new Date().toLocaleTimeString("pt-BR");
      dom.backendType.textContent = `Timestamp: ${stamp}`;
    }
  } catch (err) {
    dom.apiStatus.textContent = "API indisponivel (modo historico local ativo)";
    if (dom.backendType) {
      dom.backendType.textContent = `Timestamp: ${new Date().toLocaleTimeString("pt-BR")}`;
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

function sanitizeFileSlug(target) {
  return (
    String(target || "auditoria")
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/[^a-z0-9.-]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "auditoria"
  );
}

function resolveRemotePdfUrl(pdfPath) {
  if (!pdfPath) return "";
  if (/^https?:\/\//i.test(pdfPath)) return pdfPath;
  const normalizedPath = pdfPath.startsWith("/") ? pdfPath : `/${pdfPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function renderDashboardHistory(entries) {
  if (!dom.dashboardHistoryList) return;
  dom.dashboardHistoryList.classList.add("cyber-audit-list");
  dom.dashboardHistoryList.innerHTML = "";
  clearPdfCache();

  if (!entries.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history-empty cyber-audit-empty";
    emptyItem.textContent = "Nenhuma auditoria registada.";
    dom.dashboardHistoryList.appendChild(emptyItem);
    return;
  }

  entries.slice(0, 10).forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item cyber-audit-item";

    const stamp = new Date(item.timestamp).toISOString().slice(0, 10);
    const fileName = `cybercheck-relatorio-${sanitizeFileSlug(item.target)}-${stamp}.pdf`;
    const remoteUrl = resolveRemotePdfUrl(item.pdfPath);

    const link = document.createElement("a");
    link.className = "cyber-audit-link";
    link.href = remoteUrl || getAuditReportPdfUrl(item);
    link.target = "_blank";
    link.rel = "noopener";
    if (!remoteUrl) {
      link.download = fileName;
    }
    link.title = remoteUrl
      ? `Abrir relatorio PDF no servidor de ${item.target}`
      : `Gerar e baixar relatorio PDF de ${item.target}`;

    link.addEventListener("click", async (event) => {
      if (remoteUrl) return;
      event.preventDefault();
      await generateAuditPdfReport(item);
    });

    const infoWrapper = document.createElement("div");
    infoWrapper.className = "cyber-audit-main";

    const targetSpan = document.createElement("span");
    targetSpan.className = "cyber-audit-target";
    targetSpan.textContent = `${item.target} - Score: `;

    const scoreStrong = document.createElement("strong");
    scoreStrong.className = "cyber-audit-score";
    scoreStrong.textContent = `${item.score}/100 (${item.grade} | ${item.risk})`;
    targetSpan.appendChild(scoreStrong);

    const metaSpan = document.createElement("span");
    metaSpan.className = "cyber-audit-meta";
    const statusSuffix = remoteUrl ? " | Servidor" : " | Local";
    metaSpan.textContent = `${new Date(item.timestamp).toLocaleString("pt-BR")}${statusSuffix}`;

    const badgeSpan = document.createElement("span");
    badgeSpan.className = "cyber-audit-pdf-badge";
    badgeSpan.textContent = remoteUrl ? "Abrir PDF" : "PDF";

    infoWrapper.appendChild(targetSpan);
    infoWrapper.appendChild(metaSpan);

    link.appendChild(infoWrapper);
    link.appendChild(badgeSpan);
    li.appendChild(link);
    dom.dashboardHistoryList.appendChild(li);
  });
}

/* ==========================================
   BLOCO 05: Graficos Chart.js (Dashboard e Ao Vivo)
   ========================================== */
function getThemeChartPalette() {
  const isLight = getCurrentTheme() === "light";
  return {
    isLight,
    textColor: "#f8fafc",
    gridColor: isLight ? "rgba(148, 163, 184, 0.22)" : "rgba(148, 163, 184, 0.18)",
    lineColor: "#38bdf8",
    lineFill: isLight ? "rgba(56, 189, 248, 0.28)" : "rgba(56, 189, 248, 0.18)",
    pointBg: isLight ? "#0f172a" : "#38bdf8",
    pointBorder: isLight ? "#67e8f9" : "#38bdf8",
    doughnutBorder: isLight ? "#061526" : "#0f172a",
    lowColor: "#16a34a",
    mediumColor: "#eab308",
    highColor: "#dc2626"
  };
}

const cyberNeonGlowPlugin = {
  id: "cyberNeonGlow",
  beforeDatasetsDraw(chart) {
    if (getCurrentTheme() !== "light") return;
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = "rgba(56, 189, 248, 0.75)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  },
  afterDatasetsDraw(chart) {
    if (getCurrentTheme() !== "light") return;
    chart.ctx.restore();
  }
};

function createCyberTrendGradient(ctx, chartArea) {
  const top = chartArea ? chartArea.top : 0;
  const bottom = chartArea ? chartArea.bottom : 260;
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, "rgba(56, 189, 248, 0.44)");
  gradient.addColorStop(0.65, "rgba(14, 116, 144, 0.16)");
  gradient.addColorStop(1, "rgba(8, 22, 38, 0.04)");
  return gradient;
}

function destroyChartInstance(chartKey) {
  if (state[chartKey]) {
    state[chartKey].destroy();
    state[chartKey] = null;
  }
}

function formatCompactHostLabel(target) {
  const clean = String(target || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();
  if (!clean) return "alvo";
  return clean.length > 13 ? `${clean.slice(0, 12)}...` : clean;
}

function renderRiskChart(palette) {
  if (!dom.riskChartCanvas) return;
  destroyChartInstance("riskChart");

  const lowCount = state.history.filter((item) => item.risk === "LOW").length;
  const mediumCount = state.history.filter((item) => item.risk === "MEDIUM").length;
  const highCount = state.history.filter((item) => item.risk === "HIGH" || item.risk === "CRITICAL").length;
  const hasRiskData = lowCount + mediumCount + highCount > 0;
  const isCyberLight = palette.isLight;

  state.riskChart = new Chart(dom.riskChartCanvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Risco Baixo", "Risco Medio", "Risco Alto"],
      datasets: [
        {
          data: hasRiskData ? [lowCount, mediumCount, highCount] : [1, 0, 0],
          backgroundColor: [palette.lowColor, palette.mediumColor, palette.highColor],
          borderColor: palette.doughnutBorder,
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "54%",
      layout: {
        padding: {
          top: 6,
          bottom: 4
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: palette.textColor,
            usePointStyle: true,
            pointStyle: "rect",
            boxWidth: 18,
            boxHeight: 11,
            padding: 16,
            font: {
              size: 12,
              weight: "600"
            }
          }
        },
        tooltip: {
          backgroundColor: "rgba(7, 18, 34, 0.96)",
          titleColor: "#38bdf8",
          bodyColor: "#f8fafc",
          borderColor: "rgba(56, 189, 248, 0.55)",
          borderWidth: 1,
          padding: 10
        }
      }
    },
    plugins: isCyberLight ? [cyberNeonGlowPlugin] : []
  });
}

function renderTrendChart(palette) {
  if (!dom.trendChartCanvas) return;
  destroyChartInstance("trendChart");

  const ctx = dom.trendChartCanvas.getContext("2d");
  const isCyberLight = palette.isLight;

  const orderedForTrend = [...state.history].slice(0, 8).reverse();
  const labels = orderedForTrend.length
    ? orderedForTrend.map((item, idx) => {
        const hora = new Date(item.timestamp).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        });
        return `#${idx + 1} ${hora}`;
      })
    : ["Sem dados"];

  const fullTargets = orderedForTrend.length
    ? orderedForTrend.map((item) => `${item.target} (${formatCompactHostLabel(item.target)})`)
    : ["Sem auditorias"];

  const scores = orderedForTrend.length
    ? orderedForTrend.map((item) => item.score)
    : [0];

  const backgroundColor = isCyberLight
    ? (context) => {
        const { chart } = context;
        return createCyberTrendGradient(chart.ctx, chart.chartArea);
      }
    : palette.lineFill;

  state.trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Evolucao das Auditorias (Score 0-100)",
          data: scores,
          borderColor: palette.lineColor,
          backgroundColor,
          borderWidth: isCyberLight ? 3 : 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: palette.pointBg,
          pointBorderColor: palette.pointBorder,
          pointBorderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: {
        padding: {
          top: 10,
          right: 16,
          bottom: 6,
          left: 6
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            color: palette.textColor,
            backdropColor: "rgba(7, 18, 34, 0.75)",
            backdropPadding: { x: 5, y: 2 },
            font: { size: 11, weight: "600" }
          },
          grid: { color: palette.gridColor }
        },
        x: {
          ticks: {
            color: palette.textColor,
            backdropColor: "rgba(7, 18, 34, 0.75)",
            backdropPadding: { x: 5, y: 2 },
            font: { size: 11, weight: "600" },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            padding: 6
          },
          grid: { color: palette.gridColor }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(7, 18, 34, 0.96)",
          titleColor: "#38bdf8",
          bodyColor: "#f8fafc",
          borderColor: "rgba(56, 189, 248, 0.55)",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            afterLabel: (context) => {
              const idx = context.dataIndex;
              return `Alvo: ${fullTargets[idx] || "--"}`;
            }
          }
        }
      }
    },
    plugins: isCyberLight ? [cyberNeonGlowPlugin] : []
  });
}

function renderCharts() {
  if (typeof Chart === "undefined") return;
  const palette = getThemeChartPalette();
  renderRiskChart(palette);
  renderTrendChart(palette);
}

/* ==========================================
   BLOCO 06: Relatorio Vivo (Live Report), Timeline e Tempo Real
   ========================================== */
function updateScoreDeltaTracking(newScore, timestampIso) {
  const horaFormatada = new Date(timestampIso || Date.now()).toLocaleTimeString("pt-BR");
  state.lastLiveUpdateText = `${new Date(timestampIso || Date.now()).toLocaleDateString("pt-BR")} ${horaFormatada}`;

  if (state.liveScore !== null && Number.isFinite(state.liveScore)) {
    const diff = newScore - state.liveScore;
    if (diff > 0) {
      state.lastScoreDeltaText = `+${diff} pontos (${horaFormatada})`;
    } else if (diff < 0) {
      state.lastScoreDeltaText = `${diff} pontos (${horaFormatada})`;
    } else {
      state.lastScoreDeltaText = `0 pontos (${horaFormatada})`;
    }
  } else {
    state.lastScoreDeltaText = `0 pontos (${horaFormatada})`;
  }

  state.previousScore = state.liveScore;
  state.liveScore = newScore;
}

function buildLaymanExplanations(entry) {
  const d = entry.details || {};
  const sslObj = d.ssl ?? d.Ssl;
  const sslValid = typeof d.sslValid === "boolean"
    ? d.sslValid
    : typeof d.SslValid === "boolean"
      ? d.SslValid
      : Boolean(sslObj?.enabled ?? sslObj?.Enabled ?? entry.score >= 60);

  const headersObj = d.headers ?? d.Headers;
  const hsts = Boolean(headersObj?.hasStrictTransportSecurity ?? headersObj?.HasStrictTransportSecurity ?? headersObj?.hsts);
  const csp = Boolean(headersObj?.hasContentSecurityPolicy ?? headersObj?.HasContentSecurityPolicy ?? headersObj?.csp);
  const xfo = Boolean(headersObj?.hasXFrameOptions ?? headersObj?.HasXFrameOptions ?? headersObj?.xFrameOptions);

  const dnsObj = d.dns ?? d.Dns;
  const ips = Array.isArray(dnsObj?.addresses ?? dnsObj?.Addresses) ? (dnsObj.addresses ?? dnsObj.Addresses) : [];
  const dnsOk = dnsObj ? ips.length > 0 || Boolean(dnsObj.hostName ?? dnsObj.HostName) : entry.score >= 50;

  const whoisObj = d.whois ?? d.Whois;
  const whoisOk = whoisObj ? Boolean(whoisObj.domain ?? whoisObj.Domain) : Boolean(entry.target);

  const vtObj = d.virustotal ?? d.VirusTotal;
  const malicious = Number(vtObj?.malicious ?? vtObj?.Malicious ?? vtObj?.stats?.malicious ?? 0) || 0;
  const suspicious = Number(vtObj?.suspicious ?? vtObj?.Suspicious ?? vtObj?.stats?.suspicious ?? 0) || 0;
  const vtOk = vtObj ? malicious === 0 && suspicious === 0 : entry.score >= 60;

  return [
    {
      module: "SSL/TLS",
      status: sslValid ? "Valido" : "Nao configurado / Invalido",
      whatFound: sslValid
        ? "O dominio utiliza certificado HTTPS valido e conexao criptografada."
        : "O certificado HTTPS nao foi confirmado ou nao esta ativo.",
      meaning: sslValid
        ? "A comunicacao entre o navegador e o servidor fica protegida."
        : "Visitantes podem acessar o site sem criptografia ou ver avisos de seguranca.",
      impact: "Protege dados em transito contra interceptacao.",
      risk: sslValid ? "Baixo" : "Alto",
      ok: sslValid,
      radarScore: sslValid ? 95 : 25
    },
    {
      module: "HSTS e Headers HTTP",
      status: hsts ? "HSTS Configurado" : "HSTS: Nao configurado",
      whatFound: `HSTS: ${hsts ? "Configurado" : "Nao configurado"} | CSP: ${csp ? "Ativo" : "Ausente"} | X-Frame-Options: ${xfo ? "Ativo" : "Ausente"}`,
      meaning: hsts
        ? "O navegador exige HTTPS automaticamente."
        : "Sem HSTS, visitantes podem ser redirecionados de forma insegura para versoes HTTP do site.",
      impact: "Reduz risco de downgrade de conexao, XSS e clickjacking.",
      risk: hsts && csp ? "Baixo" : "Alto",
      ok: hsts && (csp || xfo),
      radarScore: hsts && csp ? 92 : (hsts || xfo ? 55 : 25)
    },
    {
      module: "DNS",
      status: dnsOk ? "Resolvido" : "Sem resposta DNS",
      whatFound: dnsOk
        ? `Enderecos IP encontrados: ${ips.length ? ips.join(", ") : "Host resolvido"}`
        : "Nenhum endereco IP publico foi retornado na consulta DNS.",
      meaning: dnsOk
        ? "O nome do dominio aponta corretamente para servidores."
        : "O dominio pode estar offline ou mal configurado no DNS.",
      impact: "Garante disponibilidade e roteamento correto do site.",
      risk: dnsOk ? "Baixo" : "Alto",
      ok: dnsOk,
      radarScore: dnsOk ? 90 : 35
    },
    {
      module: "WHOIS",
      status: whoisOk ? "Registrado" : "Nao identificado",
      whatFound: whoisObj
        ? `Dominio: ${whoisObj.domain ?? whoisObj.Domain ?? entry.target}${whoisObj.registrar ?? whoisObj.Registrar ? ` | Registrador: ${whoisObj.registrar ?? whoisObj.Registrar}` : ""}`
        : `Alvo verificado: ${entry.target}`,
      meaning: "Identifica a titularidade e o registro administrativo do dominio.",
      impact: "Ajuda a validar autenticidade e propriedade do endereco.",
      risk: "Baixo",
      ok: whoisOk,
      radarScore: whoisOk ? 85 : 40
    },
    {
      module: "VirusTotal",
      status: vtOk ? "Limpo" : "Alerta de Reputacao",
      whatFound: `${malicious} motores detectaram malware | ${suspicious} motores detectaram suspeita`,
      meaning: vtOk
        ? "Nenhum indicador malicioso encontrado nas bases consultadas."
        : "Ha alertas de seguranca associados ao alvo.",
      impact: "Evita que usuarios acessem paginas maliciosas ou de phishing.",
      risk: vtOk ? "Baixo" : "Alto",
      ok: vtOk,
      radarScore: vtOk ? 96 : 20
    }
  ];
}

function buildDefaultTimeline(entry) {
  const base = new Date(entry.timestamp || Date.now()).getTime();
  const fmt = (offsetSec) => new Date(base + offsetSec * 1000).toLocaleTimeString("pt-BR");

  return [
    { time: fmt(0), label: "Iniciando auditoria" },
    { time: fmt(1), label: "Consultando DNS" },
    { time: fmt(2), label: "Consultando WHOIS" },
    { time: fmt(3), label: "Consultando SSL" },
    { time: fmt(5), label: "Consultando VirusTotal" },
    { time: fmt(7), label: "Gerando relatorio" },
    { time: fmt(8), label: "Concluido" }
  ];
}

function renderLiveReportPanel(entry) {
  if (!entry) return;
  updateScoreDeltaTracking(entry.score, entry.timestamp);
  const laymen = buildLaymanExplanations(entry);
  const timeline = state.timelineSteps.length ? state.timelineSteps : buildDefaultTimeline(entry);
  const summaryText = buildExecutiveSummaryText(entry, evaluateModuleSignals(entry));

  if (dom.liveScoreValue) {
    dom.liveScoreValue.textContent = `Score Atual: ${entry.score}/100`;
  }
  if (dom.liveScoreDelta) {
    dom.liveScoreDelta.textContent = `Ultima variacao: ${state.lastScoreDeltaText}`;
  }
  if (dom.liveLastUpdate) {
    dom.liveLastUpdate.textContent = `Ultima atualizacao: ${state.lastLiveUpdateText}`;
  }
  if (dom.liveExecutiveSummary) {
    dom.liveExecutiveSummary.textContent = summaryText;
  }

  if (dom.liveLaymanCards) {
    dom.liveLaymanCards.innerHTML = laymen
      .map(
        (item) => `
          <div class="live-layman-card">
            <div class="live-layman-header">
              <strong>${item.module}</strong>
              <span>Status: ${item.status} | Risco: ${item.risk}</span>
            </div>
            <p><strong>O que foi encontrado:</strong> ${item.whatFound}</p>
            <p><strong>O que isso significa:</strong> ${item.meaning}</p>
            <p><strong>Impacto:</strong> ${item.impact}</p>
          </div>
        `
      )
      .join("");
  }

  if (dom.liveTimelineList) {
    dom.liveTimelineList.innerHTML = timeline
      .map(
        (step) => `
          <li class="live-timeline-item">
            <span class="live-timeline-time">${step.time}</span>
            <span class="live-timeline-label">${step.label}</span>
          </li>
        `
      )
      .join("");
  }
}

function ingestLiveTelemetryPayload(payload) {
  if (!payload || typeof payload !== "object") return;

  const nowIso = payload.timestamp || payload.Timestamp || new Date().toISOString();
  const timeLabel = new Date(nowIso).toLocaleTimeString("pt-BR");
  const stepText = String(payload.step ?? payload.Step ?? payload.status ?? payload.Status ?? "").trim();

  if (stepText) {
    state.timelineSteps = [
      ...state.timelineSteps.slice(-11),
      { time: timeLabel, label: stepText }
    ];
  }

  const currentList = loadHistoryFromStorage();
  const latest = currentList[0] || normalizeAuditEntry({
    target: payload.target || payload.url || "alvo-monitorado",
    score: payload.score ?? payload.Score ?? 0,
    timestamp: nowIso,
    details: payload
  });

  const mergedScore = Number.isFinite(Number(payload.score ?? payload.Score))
    ? Math.max(0, Math.min(100, Math.round(Number(payload.score ?? payload.Score))))
    : latest.score;

  const mergedDetails = {
    ...(latest.details || {}),
    ...(payload.ssl ? { ssl: payload.ssl } : {}),
    ...(payload.dns ? { dns: payload.dns } : {}),
    ...(payload.virustotal ? { virustotal: payload.virustotal } : {}),
    ...(payload.whois ? { whois: payload.whois } : {}),
    ...(payload.headers ? { headers: payload.headers } : {}),
    ...(payload.recon ? { recon: payload.recon } : {})
  };

  const updatedLatest = normalizeAuditEntry({
    ...latest,
    score: mergedScore,
    risk: payload.risk ?? payload.Risk ?? latest.risk,
    timestamp: nowIso,
    pdfPath: "",
    details: mergedDetails
  });

  const nextHistory = currentList.length
    ? [updatedLatest, ...currentList.slice(1)]
    : [updatedLatest];

  persistHistoryAndNotify(nextHistory);
  updateKpis(nextHistory);
  renderDashboardHistory(nextHistory);
  renderCharts();
  renderLiveReportPanel(updatedLatest);
}

function connectLiveStreams() {
  const latestTarget = state.history[0]?.target;
  if (typeof EventSource !== "undefined" && latestTarget) {
    try {
      if (state.eventSource) {
        state.eventSource.close();
      }
      const streamUrl = `${LIVE_STREAM_ENDPOINT}?url=${encodeURIComponent(latestTarget)}`;
      const es = new EventSource(streamUrl);
      state.eventSource = es;

      const onTelemetry = (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          ingestLiveTelemetryPayload(parsed);
        } catch (_) {
          // ignora payload nao-JSON
        }
      };

      es.addEventListener("progress", onTelemetry);
      es.addEventListener("telemetry", onTelemetry);
      es.addEventListener("completed", onTelemetry);
      es.addEventListener("error", () => {
        if (state.eventSource) {
          state.eventSource.close();
          state.eventSource = null;
        }
      });
    } catch (_) {
      // fallback para polling
    }
  }

  if (typeof WebSocket !== "undefined") {
    try {
      if (state.webSocket && state.webSocket.readyState <= 1) {
        state.webSocket.close();
      }
      const ws = new WebSocket(LIVE_WS_ENDPOINT);
      state.webSocket = ws;

      ws.addEventListener("message", (ev) => {
        try {
          const parsed = JSON.parse(ev.data);
          ingestLiveTelemetryPayload(parsed);
        } catch (_) {
          // ignora mensagem nao-JSON
        }
      });

      ws.addEventListener("error", () => {
        try {
          ws.close();
        } catch (_) {
          // ignora erro de fechamento
        }
      });
    } catch (_) {
      // ignora erro de WebSocket
    }
  }
}

function syncHistoryViews(force = false) {
  const snapshot = readRawHistorySnapshot();
  if (!force && snapshot === state.lastRawSnapshot) {
    return;
  }

  state.history = loadHistoryFromStorage();
  updateKpis(state.history);
  renderDashboardHistory(state.history);
  renderCharts();
  if (state.history[0]) {
    renderLiveReportPanel(state.history[0]);
  }
  syncPendingPdfUploads(state.history);
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

  connectLiveStreams();

  if (state.liveTimer) {
    clearInterval(state.liveTimer);
  }
  state.liveTimer = setInterval(() => {
    syncHistoryViews(false);
    if (!state.eventSource && (!state.webSocket || state.webSocket.readyState !== 1)) {
      checkApiHealth();
    }
  }, LIVE_POLL_INTERVAL_MS);
}

function bindEvents() {
  if (dom.themeToggle) {
    dom.themeToggle.addEventListener("click", toggleTheme);
  }

  if (dom.refreshDashboardBtn) {
    dom.refreshDashboardBtn.addEventListener("click", refreshDashboard);
  }

  if (dom.regenerateLivePdfBtn) {
    dom.regenerateLivePdfBtn.addEventListener("click", () => {
      generateAuditPdfReport(state.history[0]);
    });
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
   BLOCO 07: Relatorio Executivo PDF, Radar Chart e Upload
   ========================================== */
const JSPDF_CDN_URL = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
const AUTOTABLE_CDN_URL = "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js";

function loadScriptOnce(src, globalCheckFn) {
  return new Promise((resolve) => {
    if (typeof globalCheckFn === "function" && globalCheckFn()) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(globalCheckFn())), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(Boolean(globalCheckFn()));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

async function ensurePdfLibrariesLoaded() {
  const hasJsPdf = () => Boolean(window.jspdf?.jsPDF || window.jsPDF);
  if (!hasJsPdf()) {
    await loadScriptOnce(JSPDF_CDN_URL, hasJsPdf);
  }

  const hasAutoTable = () => {
    const JsPdfCtor = window.jspdf?.jsPDF || window.jsPDF;
    return Boolean(JsPdfCtor?.API?.autoTable);
  };

  if (hasJsPdf() && !hasAutoTable()) {
    await loadScriptOnce(AUTOTABLE_CDN_URL, hasAutoTable);
  }
}

function resolveJsPdfConstructor() {
  if (window.jspdf && typeof window.jspdf.jsPDF === "function") {
    return window.jspdf.jsPDF;
  }
  if (typeof window.jsPDF === "function") {
    return window.jsPDF;
  }
  return null;
}

function getScoreColorRgb(score) {
  if (score >= 85) {
    return { r: 22, g: 163, b: 74, hex: "#16a34a", label: "RISCO BAIXO" };
  }
  if (score >= 60) {
    return { r: 217, g: 119, b: 6, hex: "#d97706", label: "RISCO MEDIO" };
  }
  return { r: 220, g: 38, b: 38, hex: "#dc2626", label: "RISCO ALTO" };
}

function formatAuditCode(entry) {
  const d = new Date(entry.timestamp || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = String(entry.id || "001").slice(-3).toUpperCase();
  return `AUD-${y}${m}${day}-${suffix}`;
}

function evaluateModuleSignals(entry) {
  const laymen = buildLaymanExplanations(entry);
  const d = entry.details || {};

  const sslValid = laymen[0]?.ok ?? false;
  const headersOk = laymen[1]?.ok ?? false;
  const dnsOk = laymen[2]?.ok ?? false;
  const whoisOk = laymen[3]?.ok ?? false;
  const vtOk = laymen[4]?.ok ?? false;

  const reconObj = d.recon ?? d.Recon;
  const reconOk = reconObj
    ? Boolean(reconObj.robotsReachable ?? reconObj.RobotsReachable ?? reconObj.sitemapReachable ?? reconObj.SitemapReachable)
    : entry.score >= 65;

  const radarScores = [
    laymen[0]?.radarScore ?? 50,
    laymen[1]?.radarScore ?? 50,
    laymen[2]?.radarScore ?? 50,
    laymen[3]?.radarScore ?? 50,
    laymen[4]?.radarScore ?? 50,
    reconOk ? 85 : 45
  ];

  const indicators = [
    { name: "SSL/TLS", ok: sslValid },
    { name: "Headers de Seguranca", ok: headersOk },
    { name: "DNS", ok: dnsOk },
    { name: "WHOIS", ok: whoisOk },
    { name: "VirusTotal", ok: vtOk },
    { name: "Recon", ok: reconOk }
  ];

  const vulnerabilities = [];
  if (Array.isArray(d.recommendations ?? d.Recommendations)) {
    (d.recommendations ?? d.Recommendations).forEach((rec) => {
      const text = String(rec || "");
      const upper = text.toUpperCase();
      const sev = upper.includes("CRITIC") ? "Critica" : upper.includes("ALTO") || upper.includes("HIGH") ? "Alta" : "Media";
      vulnerabilities.push([sev, text]);
    });
  }

  if (!vulnerabilities.length) {
    if (!laymen[1]?.ok) vulnerabilities.push(["Critica", "CSP ausente ou nao configurada"]);
    if (!laymen[1]?.ok) vulnerabilities.push(["Alta", "HSTS: Nao configurado"]);
    vulnerabilities.push(["Media", "X-Frame-Options ausente ou requer revisao"]);
    if (!sslValid) vulnerabilities.push(["Critica", "Certificado SSL/TLS ausente ou invalido"]);
    if (!vtOk) vulnerabilities.push(["Critica", "Indicadores maliciosos ou suspeitos no VirusTotal"]);
  }

  if (!vulnerabilities.length) {
    vulnerabilities.push(["Baixa", "Nenhuma vulnerabilidade critica identificada nos modulos verificados"]);
  }

  const recommendationsList = [
    "Implementar Content-Security-Policy.",
    "Habilitar HSTS.",
    "Configurar X-Frame-Options.",
    "Revisar cabecalhos HTTP."
  ];

  return {
    sslValid,
    headersOk,
    dnsOk,
    whoisOk,
    vtOk,
    reconOk,
    radarScores,
    indicators,
    vulnerabilities,
    recommendationsList
  };
}

function buildExecutiveSummaryText(entry, signals) {
  if (entry.score >= 85 && signals.sslValid && signals.vtOk) {
    return "O site apresenta boa postura de seguranca, com HTTPS valido, ausencia de indicadores maliciosos no VirusTotal e adequada configuracao dos principais controles. A principal melhoria recomendada e a implementacao de Content-Security-Policy, que reduz riscos de ataques XSS.";
  }
  if (entry.score >= 60) {
    return "O dominio apresenta nivel de seguranca moderado, exigindo reforco em cabecalhos HTTP (como HSTS e Content-Security-Policy) e revisao de configuracoes de exposicao.";
  }
  return "O dominio apresenta nivel de seguranca elevado/critico e requer acao corretiva imediata em certificados, cabecalhos HTTP e reputacao.";
}

function renderRadarChartDataUrl(labels, values, accentHex) {
  if (typeof Chart === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  const tempChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Postura por Dominio (0-100)",
          data: values,
          fill: true,
          backgroundColor: "rgba(56, 189, 248, 0.22)",
          borderColor: accentHex || "#0284c7",
          borderWidth: 2,
          pointBackgroundColor: accentHex || "#0284c7",
          pointBorderColor: "#ffffff",
          pointRadius: 3.5
        }
      ]
    },
    options: {
      responsive: false,
      animation: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            display: false
          },
          grid: { color: "rgba(100, 116, 139, 0.25)" },
          angleLines: { color: "rgba(100, 116, 139, 0.25)" },
          pointLabels: {
            color: "#1e293b",
            font: { size: 11, weight: "bold" }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  const dataUrl = canvas.toDataURL("image/png", 1.0);
  tempChart.destroy();
  return dataUrl;
}

function createExecutivePdfDocument(entry) {
  const JsPDF = resolveJsPdfConstructor();
  if (!JsPDF) {
    return null;
  }

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const signals = evaluateModuleSignals(entry);
  const scoreStyle = getScoreColorRgb(entry.score);
  const auditCode = formatAuditCode(entry);
  const formattedDate = new Date(entry.timestamp || Date.now()).toLocaleDateString("pt-BR");
  const summaryText = buildExecutiveSummaryText(entry, signals);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("CyberCheck PRO", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(125, 211, 252);
  doc.text("Security Assessment Report", 14, 21);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  const targetLines = doc.splitTextToSize(`Alvo: ${entry.target}`, 94);
  doc.text(targetLines, 14, 29);
  doc.text(`Data: ${formattedDate}`, 112, 30);
  doc.text(`ID: ${auditCode}`, 152, 30);

  let y = 46;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 82, 44, 3, 3, "F");

  doc.setFillColor(scoreStyle.r, scoreStyle.g, scoreStyle.b);
  doc.rect(14, y, 82, 3, "F");

  doc.setTextColor(scoreStyle.r, scoreStyle.g, scoreStyle.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(`${entry.score}/100`, 55, y + 20, { align: "center" });

  doc.setFontSize(10.5);
  doc.text(scoreStyle.label, 55, y + 30, { align: "center" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nota: ${entry.grade} | Faixas: 85-100 / 60-84 / 0-59`, 55, y + 38, { align: "center" });

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(102, y, 94, 44, 3, 3, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Indicadores Visuais", 107, y + 8);

  doc.setFontSize(8.8);
  signals.indicators.forEach((ind, idx) => {
    const col = idx % 2 === 0 ? 107 : 150;
    const row = Math.floor(idx / 2);
    const iy = y + 16 + row * 8.5;
    doc.setTextColor(ind.ok ? 22 : 185, ind.ok ? 163 : 28, ind.ok ? 74 : 28);
    doc.setFont("helvetica", "bold");
    doc.text(`${ind.name} ${ind.ok ? "[OK]" : "[!]"}`, col, iy);
  });

  y = 97;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo Executivo", 14, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(summaryText, 182);
  doc.text(summaryLines, 14, y);
  y += summaryLines.length * 4.8 + 5;

  const radarLabels = ["SSL", "Headers", "DNS", "WHOIS", "VirusTotal", "Recon"];
  const radarImg = renderRadarChartDataUrl(radarLabels, signals.radarScores, scoreStyle.hex);

  if (radarImg) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Grafico Radar de Cobertura", 14, y);
    y += 3;
    doc.addImage(radarImg, "PNG", 48, y, 114, 71);
    y += 76;
  }

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Tabela de Vulnerabilidades", 14, y);
  y += 4;

  if (typeof doc.autoTable === "function") {
    doc.autoTable({
      startY: y,
      head: [["Severidade", "Problema"]],
      body: signals.vulnerabilities,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 38, fontStyle: "bold" }, 1: { cellWidth: 144 } }
    });
    y = doc.lastAutoTable.finalY + 9;
  } else {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    signals.vulnerabilities.forEach(([sev, prob]) => {
      const wrapped = doc.splitTextToSize(`[${sev}] ${prob}`, 182);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 5 + 1.5;
    });
    y += 4;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Recomendacoes", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  signals.recommendationsList.forEach((rec, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, 182);
    if (y + lines.length * 5 > 276) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 284, 196, 284);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("CyberCheck PRO Enterprise Edition  |  www.cybercheck.com  |  Relatorio Confidencial", 14, 290);
    doc.text(`Pagina ${i} de ${totalPages}`, 196, 290, { align: "right" });
  }

  return doc;
}

function sanitizePdfAscii(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPlainTextLines(text, maxChars = 76) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const out = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) out.push(current);
      if (word.length > maxChars) {
        for (let i = 0; i < word.length; i += maxChars) {
          out.push(word.slice(i, i + maxChars));
        }
        current = "";
      } else {
        current = word;
      }
    }
  });

  if (current) out.push(current);
  return out;
}

function buildFallbackPdfBlob(entry) {
  const signals = evaluateModuleSignals(entry);
  const scoreStyle = getScoreColorRgb(entry.score);
  const auditCode = formatAuditCode(entry);
  const formattedDate = new Date(entry.timestamp || Date.now()).toLocaleDateString("pt-BR");

  const rawLines = [
    "CyberCheck PRO - Security Assessment Report",
    "============================================================================",
    ...wrapPlainTextLines(`Alvo: ${entry.target} | Data: ${formattedDate} | ID: ${auditCode}`, 76),
    ...wrapPlainTextLines(`Score: ${entry.score}/100 (${scoreStyle.label}) | Nota: ${entry.grade}`, 76),
    "----------------------------------------------------------------------------",
    ...wrapPlainTextLines(
      "Indicadores: " + signals.indicators.map((i) => `${i.name} ${i.ok ? "[OK]" : "[!]"}`).join(" | "),
      76
    ),
    "----------------------------------------------------------------------------",
    "Resumo Executivo:",
    ...wrapPlainTextLines(buildExecutiveSummaryText(entry, signals), 76),
    "----------------------------------------------------------------------------",
    "Vulnerabilidades:",
    ...signals.vulnerabilities.flatMap(([sev, prob]) => wrapPlainTextLines(`- [${sev}] ${prob}`, 74)),
    "----------------------------------------------------------------------------",
    "Recomendacoes:",
    ...signals.recommendationsList.flatMap((rec, idx) => wrapPlainTextLines(`${idx + 1}. ${rec}`, 74)),
    "============================================================================",
    ...wrapPlainTextLines("CyberCheck PRO Enterprise Edition | www.cybercheck.com | Relatorio Confidencial", 76)
  ];

  const ops = ["BT", "/F1 9 Tf", "36 754 Td", "13.5 TL"];
  rawLines.forEach((line, idx) => {
    const safe = sanitizePdfAscii(line);
    if (idx === 0) {
      ops.push("/F2 12 Tf", `(${safe}) Tj`, "/F1 9 Tf", "T*");
    } else {
      ops.push(`(${safe}) Tj T*`);
    }
  });
  ops.push("ET");

  const stream = ops.join("\n");
  const len = new TextEncoder().encode(stream).length;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${len} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += obj;
  }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildAuditPdfBlob(entry) {
  const doc = createExecutivePdfDocument(entry);
  return doc ? doc.output("blob") : buildFallbackPdfBlob(entry);
}

function clearPdfCache() {
  state.pdfUrlCache.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {
      // ignora erro de revogacao
    }
  });
  state.pdfUrlCache.clear();
}

function getAuditReportPdfUrl(entry) {
  const key = `${entry.id}_${entry.score}_${entry.risk}_${entry.timestamp}`;
  if (state.pdfUrlCache.has(key)) {
    return state.pdfUrlCache.get(key);
  }
  const blob = buildAuditPdfBlob(entry);
  const url = URL.createObjectURL(blob);
  state.pdfUrlCache.set(key, url);
  return url;
}

async function uploadAuditPdfToApi(entry) {
  if (!entry || entry.pdfPath || state.uploadingIds.has(entry.id)) {
    return entry?.pdfPath || "";
  }

  state.uploadingIds.add(entry.id);

  try {
    await ensurePdfLibrariesLoaded();
    const stamp = new Date(entry.timestamp).toISOString().slice(0, 10);
    const fileName = `cybercheck-relatorio-${sanitizeFileSlug(entry.target)}-${stamp}.pdf`;
    const pdfBlob = buildAuditPdfBlob(entry);

    const formData = new FormData();
    formData.append("file", pdfBlob, fileName);
    formData.append("auditId", entry.id);
    formData.append("target", entry.target);

    const response = await fetch(UPLOAD_PDF_ENDPOINT, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json().catch(() => null);
    const returnedPath = String(data?.pdfPath ?? data?.PdfPath ?? "").trim();
    if (!returnedPath) {
      return "";
    }

    const currentHistory = loadHistoryFromStorage();
    const updatedHistory = currentHistory.map((item) =>
      item.id === entry.id ? { ...item, pdfPath: returnedPath } : item
    );

    persistHistoryAndNotify(updatedHistory);
    updateKpis(updatedHistory);
    renderDashboardHistory(updatedHistory);
    renderCharts();

    return returnedPath;
  } catch (err) {
    console.warn("[Dashboard] Falha ao enviar PDF para a API:", err);
    return "";
  } finally {
    state.uploadingIds.delete(entry.id);
  }
}

function syncPendingPdfUploads(entries) {
  entries.slice(0, 5).forEach((entry) => {
    if (!entry.pdfPath && !state.uploadingIds.has(entry.id)) {
      uploadAuditPdfToApi(entry);
    }
  });
}

async function generateAuditPdfReport(entryArg) {
  const entry = entryArg || state.history[0];
  if (!entry) return;

  await ensurePdfLibrariesLoaded();

  const stamp = new Date(entry.timestamp).toISOString().slice(0, 10);
  const fileName = `cybercheck-relatorio-${sanitizeFileSlug(entry.target)}-${stamp}.pdf`;
  const uploadedPath = await uploadAuditPdfToApi(entry);
  const finalPath = uploadedPath || entry.pdfPath;

  if (finalPath) {
    window.open(resolveRemotePdfUrl(finalPath), "_blank", "noopener");
    return;
  }

  const doc = createExecutivePdfDocument(entry);
  if (doc) {
    doc.save(fileName);
    return;
  }

  const fallbackUrl = getAuditReportPdfUrl(entry);
  const a = document.createElement("a");
  a.href = fallbackUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

window.generateAuditPdfReport = generateAuditPdfReport;
window.uploadAuditPdfToApi = uploadAuditPdfToApi;
window.ingestLiveTelemetryPayload = ingestLiveTelemetryPayload;

/* ==========================================
   BLOCO 08: Inicializacao da Aplicacao
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