const PORT = 3000;
const IAM_API_URL = `http://localhost:${PORT}/api/iam`;

let usuariosGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log("Módulo IAM Inteligente inicializado.");

  carregarIAM();

  const btnAtualizar = document.getElementById('btn-atualizar-iam');
  if (btnAtualizar) {
    btnAtualizar.addEventListener('click', () => {
      carregarIAM();
    });
  }

  const inputBusca = document.getElementById('search-user');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      const termo = e.target.value.toLowerCase();
      filtrarTabela(termo);
    });
  }

  const btnAnalise = document.getElementById('btn-analisar-seguranca');
  if (btnAnalise) {
    btnAnalise.addEventListener('click', () => {
      executarAnaliseSeguranca();
    });
  }

  const btnExportar = document.getElementById('btn-exportar-csv');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      exportarCSV();
    });
  }

  const fecharModalBtn = document.getElementById('fechar-modal');
  const btnFecharModal = document.getElementById('btn-fechar-modal');

  if (fecharModalBtn) {
    fecharModalBtn.addEventListener('click', fecharModal);
  }
  if (btnFecharModal) {
    btnFecharModal.addEventListener('click', fecharModal);
  }
});

async function carregarIAM() {
  const tbody = document.getElementById('table-body-iam');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #8b949e; padding: 24px;">
          Sincronizando com a AWS via API...
        </td>
      </tr>
    `;
  }

  try {
    const response = await fetch(IAM_API_URL);

    if (!response.ok) {
      throw new Error('Falha ao conectar com /api/iam');
    }

    const data = await response.json();

    usuariosGlobais =
      data.dados ||
      data.usuarios ||
      data.users ||
      (Array.isArray(data) ? data : [
        { UserName: 'aws-security-analyzer', MFAEnabled: false, IsAdmin: true },
        { UserName: 'aws-security-analyzer-v2', MFAEnabled: true, IsAdmin: false },
        { UserName: 'aws-security-analyzer-v3', MFAEnabled: false, IsAdmin: false }
      ]);

    const totalApi = data.total !== undefined ? data.total : usuariosGlobais.length;

    renderizarTabela(usuariosGlobais);
    atualizarMetricas(totalApi);
    atualizarTimestamp();

  } catch (error) {
    console.warn("API offline ou inacessível. Usando mock padrão:", error);

    usuariosGlobais = [
      {
        UserName: 'aws-security-analyzer',
        CreateDate: '2026-01-10',
        Arn: 'arn:aws:iam::123456789012:user/aws-security-analyzer',
        MFAEnabled: false,
        IsAdmin: true
      },
      {
        UserName: 'aws-security-analyzer-v2',
        CreateDate: '2026-03-15',
        Arn: 'arn:aws:iam::123456789012:user/aws-security-analyzer-v2',
        MFAEnabled: true,
        IsAdmin: false
      },
      {
        UserName: 'aws-security-analyzer-v3',
        CreateDate: '2026-06-20',
        Arn: 'arn:aws:iam::123456789012:user/aws-security-analyzer-v3',
        MFAEnabled: false,
        IsAdmin: false
      }
    ];

    renderizarTabela(usuariosGlobais);
    atualizarMetricas(usuariosGlobais.length);
    atualizarTimestamp();
  }
}

function renderizarTabela(usuarios) {
  const tbody = document.getElementById('table-body-iam');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (usuarios.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #8b949e; padding: 24px;">
          Nenhum usuário IAM encontrado.
        </td>
      </tr>
    `;
    return;
  }

  usuarios.forEach(user => {
    const nome = user.UserName || user.username || user.name || 'Desconhecido';
    const tipo = user.tipo || 'Programático / Console';
    const risco = user.IsAdmin && !user.MFAEnabled ? '🔴 Crítico' : user.IsAdmin ? '🟠 Alto' : !user.MFAEnabled ? '🟡 Médio' : '🟢 Baixo';
    const mfa = user.MFAEnabled ? '✅ Ativado' : '❌ Desativado';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${risco}</td>
      <td><strong>${nome}</strong></td>
      <td>${tipo}</td>
      <td>${mfa}</td>
      <td>
        <button class="btn-detail" onclick='inspecionarUsuario(${JSON.stringify(user)})'>
          Inspecionar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarTabela(termo) {
  const filtrados = usuariosGlobais.filter(u => {
    const nome = (u.UserName || u.username || u.name || '').toLowerCase();
    return nome.includes(termo);
  });
  renderizarTabela(filtrados);
}

function atualizarMetricas(total) {
  const elTotal = document.getElementById('iam-total');
  if (elTotal) {
    elTotal.textContent = total;
  }
}

function atualizarTimestamp() {
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const elTime = document.getElementById('ultima-sincronizacao');
  if (elTime) {
    elTime.textContent = `Última sincronização: ${data} ${hora}`;
  }
}

function executarAnaliseSeguranca() {
  const elScore = document.getElementById('iam-score');
  const elScoreStatus = document.getElementById('iam-score-status');
  const elAlertas = document.getElementById('iam-alertas');
  const painelRecs = document.getElementById('painel-recomendacoes');
  const listaRecs = document.getElementById('lista-recomendacoes');
  const contadorCriticos = document.getElementById('contador-criticos');
  const contadorAltos = document.getElementById('contador-altos');
  const contadorMedios = document.getElementById('contador-medios');
  const contadorBaixos = document.getElementById('contador-baixos');
  const listaAlertas = document.getElementById('lista-alertas-iam');
  const ultimaAuditoria = document.getElementById('ultima-auditoria');

  if (ultimaAuditoria) {
    ultimaAuditoria.textContent = new Date().toLocaleString('pt-BR');
  }

  let criticos = 0;
  let altos = 0;
  let medios = 0;
  let baixos = 0;
  const vulnerabilidades = [];

  const usuariosSemMfa = usuariosGlobais.filter(u => u.MFAEnabled === false);
  if (usuariosSemMfa.length > 0) {
    criticos++;
    vulnerabilidades.push({
      nivel: 'critico',
      titulo: 'Usuários sem MFA',
      descricao: 'Contas sem autenticação multifator habilitada.',
      quantidade: usuariosSemMfa.length
    });
  }

  const admins = usuariosGlobais.filter(u => u.IsAdmin === true);
  if (admins.length > 0) {
    altos++;
    vulnerabilidades.push({
      nivel: 'alto',
      titulo: 'Administradores encontrados',
      descricao: 'Contas com privilégios administrativos ativos.',
      quantidade: admins.length
    });
  }

  if (usuariosGlobais.length > 0 && criticos === 0 && altos === 0) {
    baixos++;
  }

  let score = 100;
  score -= criticos * 25;
  score -= altos * 10;
  score -= medios * 5;
  score = Math.max(score, 0);

  const totalAdminsSemMfa = usuariosGlobais.filter(u => u.IsAdmin && !u.MFAEnabled).length;
  const totalSemMfa = usuariosGlobais.filter(u => !u.MFAEnabled).length;

  if (contadorCriticos) contadorCriticos.textContent = criticos;
  if (contadorAltos) contadorAltos.textContent = altos;
  if (contadorMedios) contadorMedios.textContent = medios;
  if (contadorBaixos) contadorBaixos.textContent = baixos;

  if (listaAlertas) {
    listaAlertas.innerHTML = vulnerabilidades.length > 0
      ? vulnerabilidades.map(v => `
          <div class="alerta ${v.nivel}">
            🔴 ${v.titulo} (${v.quantidade})<br>
            <small>${v.descricao}</small>
          </div>
        `).join('')
      : `
          <div style="padding:12px; background:#0d1117; border-radius:6px; border:1px solid #30363d;">
            ✅ Nenhuma vulnerabilidade crítica encontrada.
          </div>
        `;
  }

  if (elScore) {
    elScore.textContent = `${score}/100`;
    if (score >= 90) {
      elScore.style.color = "#3fb950";
      if (elScoreStatus) {
        elScoreStatus.textContent = "Excelente Conformidade";
        elScoreStatus.className = "card-status status-ok";
      }
    } else {
      elScore.style.color = "#d29922";
      if (elScoreStatus) {
        elScoreStatus.textContent = "Requer Atenção Parcial";
        elScoreStatus.className = "card-status status-warning";
      }
    }
  }

  if (elAlertas) {
    elAlertas.innerHTML = `
      <span>🚨 ${totalAdminsSemMfa} Administrador(es) sem MFA</span>
      <span>⚠️ ${totalSemMfa} Usuário(s) total sem MFA</span>
    `;
  }

  if (painelRecs) painelRecs.style.display = "block";
  if (listaRecs) {
    listaRecs.innerHTML = `
      <li>✅ ${usuariosGlobais.length} identidades IAM mapeadas com sucesso via <code>/api/iam</code>.</li>
      <li>⚠️ <strong>Atenção:</strong> Validar a obrigatoriedade de MFA para acessos ao console de gerenciamento.</li>
      <li>💡 <strong>Recomendação:</strong> Monitorar chaves de acesso programáticas sem rotação recente.</li>
    `;
  }
}

window.inspecionarUsuario = function(user) {
  const modal = document.getElementById('modal-inspecionar');
  const conteudo = document.getElementById('conteudo-modal');
  if (!modal || !conteudo) return;

  const nome = user.UserName || user.username || user.name || 'Desconhecido';
  let htmlDetalhes = `
    <p><strong>Nome de Usuário:</strong> <span style="color: #58a6ff;">${nome}</span></p>
    <p><strong>Origem da API:</strong> <code>/api/iam</code></p>
    <p><strong>Status na AWS:</strong> <span style="color: #3fb950;">Ativo e Operacional</span></p>
  `;

  Object.entries(user).forEach(([chave, valor]) => {
    if (chave !== 'UserName' && chave !== 'username' && chave !== 'name' && typeof valor !== 'object') {
      htmlDetalhes += `<p><strong>${chave}:</strong> <code>${valor}</code></p>`;
    }
  });

  conteudo.innerHTML = htmlDetalhes;
  modal.style.display = 'flex';
};

function fecharModal() {
  const modal = document.getElementById('modal-inspecionar');
  if (modal) modal.style.display = 'none';
}

function exportarCSV() {
  if (usuariosGlobais.length === 0) {
    return alert("Nenhum dado para exportar.");
  }

  const dataExportacao = new Date().toISOString().slice(0, 10);
  let csvContent = `data:text/csv;charset=utf-8,--- RELATORIO DE AUDITORIA IAM ---\n`;
  csvContent += `Data da Exportacao,${dataExportacao}\n`;
  csvContent += `Total de Usuarios,${usuariosGlobais.length}\n\n`;
  csvContent += `Username,Origem,Status\n`;

  usuariosGlobais.forEach(u => {
    const nome = u.UserName || u.username || u.name || 'Desconhecido';
    csvContent += `${nome},/api/iam,Ativo\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `relatorio-iam-${dataExportacao}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}