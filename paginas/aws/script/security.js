async function analisar() {
    const servicoEl = document.querySelector('input[name="servico"]:checked');

    if (!servicoEl) {
        alert("Selecione um serviço AWS.");
        return;
    }

    const servico = servicoEl.value.toLowerCase(); // ex: 's3', 'iam', 'ec2'
    const resultado = document.getElementById("resultado");

    resultado.innerHTML = `<p>Consultando a AWS em tempo real... Por favor, aguarde.</p>`;

    try {
        const resposta = await fetch(`http://localhost:3000/api/${servico}`);

        if (!resposta.ok) throw new Error("Erro ao consultar a API do backend.");

        const dados = await resposta.json();

        // Renderiza dinamicamente os resultados recebidos da AWS
        let htmlConteudo = `<h3>${dados.servico}</h3>`;

        if (dados.dados && dados.dados.length > 0) {
            dados.dados.forEach(item => {
                const classeSeveridade = item.severidade === "Crítica" ? "critico" : item.severidade === "Alta" ? "alto" : "baixo";
                htmlConteudo += `
          <div class="resultado-card ${classeSeveridade}">
            <p><strong>Recurso:</strong> ${item.nome}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <p><strong>Severidade:</strong> ${item.severidade}</p>
          </div>
        `;
            });
        } else {
            htmlConteudo += `<p>Nenhum problema encontrado para este serviço.</p>`;
        }

        resultado.innerHTML = `
      ${htmlConteudo}
      <button type="button" class="btn-relatorio" onclick="gerarRelatorio()">Gerar Relatório</button>
    `;

    } catch (error) {
        resultado.innerHTML = `<p style="color: red;">Falha na conexão com o backend: ${error.message}</p>`;
    }
}

function gerarRelatorio() {
    window.print();
}