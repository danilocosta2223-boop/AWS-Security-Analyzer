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
  entries: [],
  selectedId: "",
  lastRawSnapshot: "",
  channel: null,
  pollTimerId: null
};

const dom = {
  themeToggle: document.getElementById("themeToggle"),
  reportsThemeCss: document.getElementById("reports-theme-css"),
  reportAuditSelect: document.getElementById("reportAuditSelect"),
  exportSingleJsonBtn: document.getElementById("exportSingleJsonBtn"),
  exportAllJsonBtn: document.getElementById("exportAllJsonBtn"),
  exportReportPdfBtn: document.getElementById("exportReportPdfBtn"),
  reportTarget: document.getElementById("reportTarget"),
  reportScore: document.getElementById("reportScore"),
  reportGrade: document.getElementById("reportGrade"),
  reportRisk: document.getElementById("reportRisk"),
  reportModulesList: document.getElementById("reportModulesList"),
  reportRecommendationsList: document.getElementById("reportRecommendationsList"),
  reportJsonPreview: document.getElementById("reportJsonPreview")
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

function formatReportTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("pt-PT");
}

function sanitizeTargetFilename(target) {
  return String(target || "alvo")
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9.-]/gi, "_");
}

function getCurrentTheme() {
  return document.body.dataset.theme === "light" || document.body.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function applyTheme(themeName) {
  const normalized = themeName === "light" ? "light" : "dark";
  document.body.dataset.theme = normalized;
  document.body.setAttribute("data-theme", normalized);

  if (dom.reportsThemeCss) {
    dom.reportsThemeCss.setAttribute("href", THEME_STYLESHEETS[normalized]);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (err) {
    console.warn("[CyberCheck] Falha ao guardar tema:", err);
  }
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
}

/* ==========================================
   BLOCO 03: Normalizacao e Leitura do Historico
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

function inferGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

function normalizeReportEntry(entry) {
  const score = clampScore(pickField(entry, ["score", "Score"], 0));
  const rawRisk = pickField(entry, ["risk", "Risk"], "");
  const risk = normalizeRisk(rawRisk, score);
  const rawGrade = pickField(entry, ["grade", "Grade"], "");
  const grade = String(rawGrade || inferGrade(score)).trim();
  const rawId = pickField(entry, ["id"], `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const rawTarget = pickField(entry, ["target", "url", "domain"], "alvo-desconhecido");
  const rawTimestamp = pickField(entry, ["timestamp", "scanDate", "analyzedAt"], new Date().toISOString());
  const rawElapsed = Number(pickField(entry, ["elapsedMs"], 0));
  const details = entry?.details && typeof entry.details === "object" ? entry.details : (entry || {});

  return {
    id: String(rawId),
    target: String(rawTarget),
    score,
    grade,
    risk,
    elapsedMs: Number.isFinite(rawElapsed) ? rawElapsed : 0,
    timestamp: rawTimestamp,
    details
  };
}

function readRawSnapshot() {
  try {
    return localStorage.getItem(HISTORY_STORAGE_KEY) || "";
  } catch (_) {
    return "";
  }
}

function loadReportEntries() {
  try {
    const raw = readRawSnapshot();
    state.lastRawSnapshot = raw;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeReportEntry) : [];
  } catch (err) {
    console.warn("[CyberCheck] Falha ao ler historico para relatorios:", err);
    return [];
  }
}

function getSelectedEntry() {
  if (!state.entries.length) return null;
  return state.entries.find((item) => item.id === state.selectedId) || state.entries[0];
}

/* ==========================================
   BLOCO 04: Extracao de Modulos e Recomendacoes Tecnicas
   ========================================== */
function extractModulesSummary(entry) {
  const d = entry.details || {};
  const modules = [];

  const vt = pickField(d, ["virustotal", "VirusTotal"], null);
  if (vt && typeof vt === "object") {
    const stats = vt.stats && typeof vt.stats === "object" ? vt.stats : {};
    const mal = pickField(vt, ["malicious", "Malicious"], pickField(stats, ["malicious"], 0));
    const susp = pickField(vt, ["suspicious", "Suspicious"], pickField(stats, ["suspicious"], 0));
    const harm = pickField(vt, ["harmless", "Harmless"], pickField(stats, ["harmless"], 0));
    modules.push(`VirusTotal: Maliciosos ${mal} | Suspeitos ${susp} | Seguros ${harm}`);
  } else {
    modules.push(`VirusTotal: Risco ${entry.risk} | Score ${entry.score}/100`);
  }

  const ssl = pickField(d, ["ssl", "Ssl"], null);
  const sslValid = pickField(d, ["sslValid", "SslValid"], undefined);
  if (ssl && typeof ssl === "object") {
    const enabled = Boolean(pickField(ssl, ["enabled", "Enabled"], false));
    const scheme = pickField(ssl, ["scheme", "Scheme"], "");
    const detail = pickField(ssl, ["detail", "Detail"], "");
    modules.push(`SSL/TLS: ${enabled ? "Ativo" : "Inativo"}${scheme ? ` (${scheme})` : ""}${detail ? ` - ${detail}` : ""}`);
  } else if (typeof sslValid === "boolean") {
    modules.push(`SSL/TLS: ${sslValid ? "Valido" : "Invalido"}`);
  } else {
    modules.push("SSL/TLS: Sem detalhes adicionais");
  }

  const headers = pickField(d, ["headers", "Headers"], null);
  if (headers && typeof headers === "object") {
    const hsts = Boolean(pickField(headers, ["hasStrictTransportSecurity", "HasStrictTransportSecurity", "hsts"], false));
    const csp = Boolean(pickField(headers, ["hasContentSecurityPolicy", "HasContentSecurityPolicy", "csp"], false));
    const xfo = Boolean(pickField(headers, ["hasXFrameOptions", "HasXFrameOptions", "xFrameOptions"], false));
    modules.push(`Headers HTTP: HSTS ${hsts ? "Sim" : "Nao"} | CSP ${csp ? "Sim" : "Nao"} | X-Frame-Options ${xfo ? "Sim" : "Nao"}`);
  } else {
    modules.push("Headers HTTP: Sem detalhes adicionais");
  }

  const dns = pickField(d, ["dns", "Dns"], null);
  if (dns && typeof dns === "object") {
    const rawIps = pickField(dns, ["addresses", "Addresses"], []);
    const ips = Array.isArray(rawIps) ? rawIps : [];
    modules.push(`DNS: ${ips.length ? ips.join(", ") : "Sem IPs listados"}`);
  } else {
    modules.push("DNS: Sem detalhes adicionais");
  }

  const whois = pickField(d, ["whois", "Whois"], null);
  if (whois && typeof whois === "object") {
    const domain = pickField(whois, ["domain", "Domain"], entry.target);
    modules.push(`WHOIS: Dominio ${domain}`);
  } else {
    modules.push(`WHOIS: Alvo ${entry.target}`);
  }

  const tech = pickField(d, ["technologies", "Technologies"], null);
  if (Array.isArray(tech) && tech.length > 0) {
    modules.push(`Tecnologias: ${tech.join(" | ")}`);
  }

  return modules;
}

function buildTechnicalRecommendations(entry) {
  const d = entry.details || {};
  const recs = [];
  const seen = new Set();

  const pushUnique = (line) => {
    const clean = String(line || "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    recs.push(clean);
  };

  const provided = pickField(d, ["recommendations", "Recommendations"], null);
  if (Array.isArray(provided) && provided.length > 0) {
    provided.forEach((item) => pushUnique(item));
  }

  const vt = pickField(d, ["virustotal", "VirusTotal"], null);
  if (vt && typeof vt === "object") {
    const stats = vt.stats && typeof vt.stats === "object" ? vt.stats : {};
    const mal = Number(pickField(vt, ["malicious", "Malicious"], pickField(stats, ["malicious"], 0))) || 0;
    const susp = Number(pickField(vt, ["suspicious", "Suspicious"], pickField(stats, ["suspicious"], 0))) || 0;
    if (mal > 0) {
      pushUnique(
        `CRITICO [Reputacao/AV]: ${mal} motor(es) sinalizaram o alvo como malicioso. Isolar o dominio/URL, bloquear em proxy/WAF e investigar IOCs imediatamente.`
      );
    } else if (susp > 0) {
      pushUnique(
        `ALTO [Reputacao/AV]: ${susp} motor(es) marcaram atividade suspeita. Revisar redirecionamentos, scripts externos e historico de reputacao.`
      );
    }
  }

  const ssl = pickField(d, ["ssl", "Ssl"], null);
  const sslValid = pickField(d, ["sslValid", "SslValid"], undefined);
  const sslEnabled = ssl && typeof ssl === "object"
    ? Boolean(pickField(ssl, ["enabled", "Enabled"], false))
    : (typeof sslValid === "boolean" ? sslValid : null);

  if (sslEnabled === false) {
    pushUnique(
      "CRITICO [TLS/HTTPS]: Conexao sem TLS/HTTPS ativo. Habilitar certificado X.509 valido (TLS 1.2/1.3) e redirecionar HTTP 80 para HTTPS 443."
    );
  } else if (sslEnabled === true) {
    pushUnique(
      "OPERACIONAL [TLS/HTTPS]: Validar periodicamente expiracao do certificado, cadeia intermediaria, ciphers modernos (TLS 1.2/1.3) e OCSP stapling."
    );
  }

  const headers = pickField(d, ["headers", "Headers"], null);
  if (headers && typeof headers === "object") {
    const hsts = Boolean(pickField(headers, ["hasStrictTransportSecurity", "HasStrictTransportSecurity", "hsts"], false));
    const csp = Boolean(pickField(headers, ["hasContentSecurityPolicy", "HasContentSecurityPolicy", "csp"], false));
    const xfo = Boolean(pickField(headers, ["hasXFrameOptions", "HasXFrameOptions", "xFrameOptions"], false));
    const xcto = Boolean(pickField(headers, ["hasXContentTypeOptions", "HasXContentTypeOptions", "xContentTypeOptions"], false));
    const refPol = Boolean(pickField(headers, ["hasReferrerPolicy", "HasReferrerPolicy", "referrerPolicy"], false));

    if (!hsts) {
      pushUnique(
        "ALTO [Cabecalhos HTTP]: Ausencia de Strict-Transport-Security (HSTS). Configurar max-age>=31536000; includeSubDomains; preload apos validar HTTPS."
      );
    }
    if (!csp) {
      pushUnique(
        "CRITICO [Cabecalhos HTTP]: Ausencia de Content-Security-Policy (CSP). Definir diretivas restritivas (default-src 'self', script-src, object-src 'none') para reduzir XSS e injecao de scripts."
      );
    }
    if (!xfo) {
      pushUnique(
        "MEDIO [Cabecalhos HTTP]: Ausencia de X-Frame-Options. Configurar SAMEORIGIN ou DENY (e frame-ancestors na CSP) para mitigar clickjacking."
      );
    }
    if (pickField(headers, ["hasXContentTypeOptions", "HasXContentTypeOptions", "xContentTypeOptions"], undefined) !== undefined && !xcto) {
      pushUnique(
        "BAIXO [Cabecalhos HTTP]: Adicionar X-Content-Type-Options: nosniff para impedir MIME-type sniffing."
      );
    }
    if (pickField(headers, ["hasReferrerPolicy", "HasReferrerPolicy", "referrerPolicy"], undefined) !== undefined && !refPol) {
      pushUnique(
        "BAIXO [Cabecalhos HTTP]: Definir Referrer-Policy (ex.: strict-origin-when-cross-origin) para limitar vazamento de URLs em cabecalhos Referer."
      );
    }
  }

  const dns = pickField(d, ["dns", "Dns"], null);
  if (dns && typeof dns === "object") {
    const rawIps = pickField(dns, ["addresses", "Addresses"], []);
    const ips = Array.isArray(rawIps) ? rawIps : [];
    if (!ips.length) {
      pushUnique(
        "ALTO [DNS]: Nenhum endereco IP resolvido para o alvo. Verificar registros A/AAAA, propagacao DNS e disponibilidade da zona."
      );
    } else {
      pushUnique(
        `OPERACIONAL [DNS/Resiliencia]: Monitorar registros A/AAAA (${ips.slice(0, 3).join(", ")}${ips.length > 3 ? "..." : ""}), DNSSEC, SPF/DMARC e TTLs para prevenir sequestro de subdominio ou falhas de resolucao.`
      );
    }
  }

  const tech = pickField(d, ["technologies", "Technologies"], null);
  if (Array.isArray(tech) && tech.length > 0) {
    pushUnique(
      `TECNICO [Superficie/Stack]: Inventariar versoes de ${tech.join(", ")} e aplicar patches de seguranca alem de ocultar banners de versao desnecessarios.`
    );
  }

  if (entry.risk === "HIGH" || entry.score < 60) {
    pushUnique(
      `PRIORIDADE [Plano de Remediação]: Score ${entry.score}/100 (${entry.grade}) indica risco ${entry.risk}. Priorizar correcao de falhas criticas/altas e reexecutar auditoria apos mudancas.`
    );
  } else if (entry.risk === "MEDIUM" || entry.score < 85) {
    pushUnique(
      `MELHORIA [Hardening]: Score ${entry.score}/100 (${entry.grade}) com risco ${entry.risk}. Endurecer cabecalhos de seguranca e revisar exposicao de endpoints/tecnologias.`
    );
  }

  pushUnique(
    "CONTINUIDADE [Monitorizacao]: Manter monitorizacao continua de certificados TLS, cabecalhos HTTP, reputacao e registros DNS com reauditorias periodicas."
  );

  return recs;
}

function extractRecommendations(entry) {
  return buildTechnicalRecommendations(entry);
}

/* ==========================================
   BLOCO 05: Renderizacao da Interface e Selecao
   ========================================== */
function populateAuditSelect(entries, activeId) {
  if (!dom.reportAuditSelect) return;
  dom.reportAuditSelect.innerHTML = "";

  if (!entries.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Nenhuma auditoria disponivel no historico";
    dom.reportAuditSelect.appendChild(opt);
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach((item, index) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    const dateText = formatReportTimestamp(item.timestamp);
    opt.textContent = `#${index + 1} - ${item.target} (${item.score}/100 | ${item.risk}) - ${dateText}`;
    if (item.id === activeId) {
      opt.selected = true;
    }
    fragment.appendChild(opt);
  });
  dom.reportAuditSelect.appendChild(fragment);
}

function renderListItems(listEl, items, emptyText) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = emptyText;
    listEl.appendChild(li);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((text) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const span = document.createElement("span");
    span.textContent = text;
    li.appendChild(span);
    fragment.appendChild(li);
  });
  listEl.appendChild(fragment);
}

function applyRiskBadgeState(riskText) {
  if (!dom.reportRisk) return;
  dom.reportRisk.textContent = riskText;
  if (riskText === "LOW" || riskText === "MEDIUM" || riskText === "HIGH") {
    dom.reportRisk.dataset.risk = riskText;
  } else {
    delete dom.reportRisk.dataset.risk;
  }
}

function renderSelectedReport() {
  const entry = getSelectedEntry();

  if (!entry) {
    if (dom.reportTarget) dom.reportTarget.textContent = "--";
    if (dom.reportScore) dom.reportScore.textContent = "--";
    if (dom.reportGrade) dom.reportGrade.textContent = "--";
    applyRiskBadgeState("--");
    renderListItems(dom.reportModulesList, [], "Nenhuma auditoria selecionada.");
    renderListItems(dom.reportRecommendationsList, [], "Sem recomendacoes carregadas.");
    if (dom.reportJsonPreview) dom.reportJsonPreview.textContent = "{}";
    return;
  }

  state.selectedId = entry.id;
  if (dom.reportTarget) dom.reportTarget.textContent = entry.target;
  if (dom.reportScore) dom.reportScore.textContent = `${entry.score}/100`;
  if (dom.reportGrade) dom.reportGrade.textContent = entry.grade;
  applyRiskBadgeState(entry.risk);

  renderListItems(dom.reportModulesList, extractModulesSummary(entry), "Sem modulos disponiveis.");
  renderListItems(dom.reportRecommendationsList, extractRecommendations(entry), "Sem recomendacoes.");

  if (dom.reportJsonPreview) {
    dom.reportJsonPreview.textContent = JSON.stringify(entry.details, null, 2);
  }
}

/* ==========================================
   BLOCO 06: Exportacao JSON, PDF Executivo e Sincronizacao
   ========================================== */
function downloadJsonFile(dataObj, filenamePrefix) {
  const content = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExportSingleJson() {
  const entry = getSelectedEntry();
  if (!entry) return;
  downloadJsonFile(entry, `cybercheck-relatorio-${sanitizeTargetFilename(entry.target)}`);
}

function handleExportAllJson() {
  if (!state.entries.length) return;
  downloadJsonFile(state.entries, "cybercheck-relatorios-todos");
}

function getRiskPdfColors(risk) {
  if (risk === "HIGH") {
    return { bg: [254, 226, 226], text: [153, 27, 27], border: [248, 113, 113] };
  }
  if (risk === "MEDIUM") {
    return { bg: [254, 249, 195], text: [133, 77, 14], border: [250, 204, 21] };
  }
  return { bg: [220, 252, 231], text: [22, 101, 52], border: [74, 222, 128] };
}

function handleExportPdf() {
  const entry = getSelectedEntry();
  if (!entry) return;

  const jspdfLib = window.jspdf;
  if (!jspdfLib || !jspdfLib.jsPDF) {
    console.warn("[CyberCheck] Biblioteca jsPDF nao disponivel.");
    return;
  }

  const { jsPDF } = jspdfLib;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const scanDate = formatReportTimestamp(entry.timestamp);
  const stamp = new Date().toISOString().slice(0, 10);
  const riskColors = getRiskPdfColors(entry.risk);

  // Cabecalho executivo
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setFillColor(56, 189, 248);
  doc.rect(0, 38, pageWidth, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("CyberCheck PRO - Relatorio Tecnico de Auditoria", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  const targetLines = doc.splitTextToSize(`Alvo: ${entry.target}`, contentWidth - 52);
  doc.text(targetLines, margin, 25);
  doc.text(`Analise: ${scanDate}`, margin, 33);

  // Badge de risco no canto superior direito
  doc.setFillColor(...riskColors.bg);
  doc.setDrawColor(...riskColors.border);
  doc.roundedRect(pageWidth - margin - 34, 13, 34, 9, 2, 2, "FD");
  doc.setTextColor(...riskColors.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`RISCO ${entry.risk}`, pageWidth - margin - 17, 18.8, { align: "center" });

  // Faixa de KPIs resumidos
  const kpiY = 45;
  const kpiH = 16;
  const kpiGap = 4;
  const kpiW = (contentWidth - kpiGap * 2) / 3;
  const kpis = [
    { label: "SECURITY SCORE", value: `${entry.score} / 100` },
    { label: "CLASSIFICACAO", value: `Nota ${entry.grade}` },
    { label: "TEMPO DE ANALISE", value: entry.elapsedMs > 0 ? `${entry.elapsedMs} ms` : "Registrado" }
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, kpiY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 4, kpiY + 12.2);
  });

  // Tabela de modulos verificados
  const moduleRows = extractModulesSummary(entry).map((line) => {
    const idx = line.indexOf(":");
    if (idx > -1) {
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }
    return ["Modulo", line];
  });

  let nextY = kpiY + kpiH + 8;

  if (typeof doc.autoTable === "function") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Modulos Verificados", margin, nextY);
    nextY += 3;

    doc.autoTable({
      startY: nextY,
      margin: { left: margin, right: margin },
      head: [["Modulo", "Diagnostico"]],
      body: moduleRows,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 8.8,
        textColor: [30, 41, 59],
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 44, fontStyle: "bold", textColor: [2, 132, 199] },
        1: { cellWidth: "auto" }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });
    nextY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 9 : nextY + 14;
  } else {
    nextY += 4;
  }

  // Secao de recomendacoes tecnicas
  const recs = extractRecommendations(entry);
  const ensureSpace = (neededHeight) => {
    if (nextY + neededHeight > pageHeight - 16) {
      doc.addPage();
      nextY = 18;
    }
  };

  ensureSpace(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Recomendacoes Tecnicas", margin, nextY);
  nextY += 5;

  recs.forEach((rec, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, contentWidth - 8);
    const boxHeight = Math.max(9, lines.length * 4.4 + 5);
    ensureSpace(boxHeight + 3);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, nextY, contentWidth, boxHeight, 1.5, 1.5, "FD");

    doc.setFillColor(2, 132, 199);
    doc.rect(margin, nextY, 1.8, boxHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(lines, margin + 4.5, nextY + 4.8);

    nextY += boxHeight + 3;
  });

  // Rodape com numeracao de paginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `CyberCheck PRO - Relatorio de Seguranca | Gerado em ${new Date().toLocaleDateString("pt-PT")}`,
      margin,
      pageHeight - 8
    );
    doc.text(`Pagina ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  doc.save(`cybercheck-relatorio-${sanitizeTargetFilename(entry.target)}-${stamp}.pdf`);
}

function refreshReportsView(force = false) {
  const snapshot = readRawSnapshot();
  if (!force && snapshot === state.lastRawSnapshot) return;

  state.entries = loadReportEntries();
  const stillExists = state.entries.some((item) => item.id === state.selectedId);
  if (!stillExists) {
    state.selectedId = state.entries[0]?.id || "";
  }

  populateAuditSelect(state.entries, state.selectedId);
  renderSelectedReport();
}

function setupRealtimeSync() {
  if ("BroadcastChannel" in window) {
    state.channel = new BroadcastChannel(HISTORY_CHANNEL_NAME);
    state.channel.addEventListener("message", (event) => {
      if (event?.data?.type === "history-updated") {
        refreshReportsView(true);
      }
    });
  }

  window.addEventListener(HISTORY_UPDATED_EVENT, () => refreshReportsView(true));
  window.addEventListener("focus", () => refreshReportsView(false));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReportsView(false);
  });

  state.pollTimerId = window.setInterval(() => refreshReportsView(false), POLL_INTERVAL_MS);

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

/* ==========================================
   BLOCO 07: Eventos e Inicializacao
   ========================================== */
function bindEvents() {
  dom.themeToggle?.addEventListener("click", toggleTheme);

  dom.reportAuditSelect?.addEventListener("change", (e) => {
    state.selectedId = e.target.value;
    renderSelectedReport();
  });

  dom.exportSingleJsonBtn?.addEventListener("click", handleExportSingleJson);
  dom.exportAllJsonBtn?.addEventListener("click", handleExportAllJson);
  dom.exportReportPdfBtn?.addEventListener("click", handleExportPdf);

  window.addEventListener("storage", (event) => {
    if (event.key === HISTORY_STORAGE_KEY) {
      refreshReportsView(true);
    } else if (event.key === THEME_STORAGE_KEY) {
      applyTheme(event.newValue || "dark");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || document.body.dataset.theme || "dark";
  } catch (_) {
    savedTheme = "dark";
  }

  applyTheme(savedTheme);
  bindEvents();
  setupRealtimeSync();
  refreshReportsView(true);
});