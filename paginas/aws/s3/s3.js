const S3_API_URL = 'http://localhost:3000/api/s3';

let bucketsGlobais = [];

document.addEventListener('DOMContentLoaded', () => {
  console.log('Módulo S3 inicializado');

  carregarS3();

  document.getElementById('btn-atualizar-s3')?.addEventListener('click', carregarS3);

  document.getElementById('s3-search-bucket')?.addEventListener('input', (e) => {
    filtrarBuckets(e.target.value.toLowerCase());
  });

  document.getElementById('btn-analisar-s3')?.addEventListener('click', () => {
    executarAnaliseS3();
  });

  document.getElementById('btn-exportar-s3-csv')?.addEventListener('click', () => {
    exportarCSV();
  });
});

async function carregarS3() {
  const tbody = document.getElementById('s3-table-body');

  tbody.innerHTML = `
    <tr>
      <td colspan="5">Carregando buckets...</td>
    </tr>
  `;

  try {
    const response = await fetch(S3_API_URL);

    if (!response.ok) {
      throw new Error('Falha ao conectar');
    }

    const data = await response.json();

    bucketsGlobais =
      data.buckets ||
      data.dados ||
      [];

    renderizarTabela(bucketsGlobais);

    document.getElementById('s3-total').textContent =
      bucketsGlobais.length;

    atualizarTimestamp();

  } catch (error) {

    console.warn(error);

    bucketsGlobais = [
      {
        Name: 'bucket-financeiro',
        Publico: true,
        Encryption: false
      },
      {
        Name: 'bucket-backup',
        Publico: false,
        Encryption: true
      }
    ];

    renderizarTabela(bucketsGlobais);

    document.getElementById('s3-total').textContent =
      bucketsGlobais.length;

    atualizarTimestamp();
  }
}

function renderizarTabela(buckets) {

  const tbody =
    document.getElementById('s3-table-body');

  tbody.innerHTML = '';

  buckets.forEach(bucket => {

    const risco =
      bucket.Publico && !bucket.Encryption
        ? '🔴 Crítico'
        : bucket.Publico
        ? '🟠 Alto'
        : '🟢 Baixo';

    tbody.innerHTML += `
      <tr>
        <td>${risco}</td>
        <td>${bucket.Name}</td>
        <td>${bucket.Publico ? '🌎 Público' : '🔒 Privado'}</td>
        <td>${bucket.Encryption ? '✅ AES256' : '❌ Não'}</td>
        <td>
          <button onclick='inspecionarBucket(${JSON.stringify(bucket)})'>
            Inspecionar
          </button>
        </td>
      </tr>
    `;
  });
}

function filtrarBuckets(termo) {

  const resultado =
    bucketsGlobais.filter(bucket =>
      bucket.Name
        .toLowerCase()
        .includes(termo)
    );

  renderizarTabela(resultado);
}

function executarAnaliseS3() {

  const publicos =
    bucketsGlobais.filter(b => b.Publico);

  const semCriptografia =
    bucketsGlobais.filter(b => !b.Encryption);

  document.getElementById('s3-publicos').textContent =
    publicos.length;

  let score = 100;

  score -= publicos.length * 15;
  score -= semCriptografia.length * 10;

  score = Math.max(score, 0);

  document.getElementById('s3-score').textContent =
    score + '/100';

  document.getElementById(
    's3-ultima-auditoria'
  ).textContent =
    new Date().toLocaleString('pt-BR');

  document.getElementById('s3-lista-alertas').innerHTML = `
    <div>🌎 Buckets públicos: ${publicos.length}</div>
    <div>🔓 Sem criptografia: ${semCriptografia.length}</div>
  `;
}

function atualizarTimestamp() {

  document.getElementById(
    's3-ultima-sincronizacao'
  ).textContent =
    new Date().toLocaleString('pt-BR');
}

window.inspecionarBucket = function(bucket) {

  const modal =
    document.getElementById(
      's3-modal-inspecionar'
    );

  const conteudo =
    document.getElementById(
      's3-conteudo-modal'
    );

  conteudo.innerHTML = `
    <p><strong>Bucket:</strong> ${bucket.Name}</p>
    <p><strong>Público:</strong> ${bucket.Publico ? 'Sim' : 'Não'}</p>
    <p><strong>Criptografia:</strong> ${bucket.Encryption ? 'Ativa' : 'Inativa'}</p>
  `;

  modal.style.display = 'flex';
};

function exportarCSV() {

  let csv =
    'Bucket,Publico,Criptografia\n';

  bucketsGlobais.forEach(bucket => {

    csv +=
      `${bucket.Name},${bucket.Publico},${bucket.Encryption}\n`;
  });

  const encoded =
    encodeURI(
      'data:text/csv;charset=utf-8,' + csv
    );

  const link =
    document.createElement('a');

  link.href = encoded;

  link.download =
    'relatorio-s3.csv';

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
}