async function carregarDashboard() {
    await carregarIAM();
    await carregarS3();
    await carregarEC2();
    await carregarCloudTrail();
    await carregarSecurityHub();

    atualizarData();
}

async function carregarIAM() {
    try {
        const response = await fetch("/api/iam");
        const data = await response.json();

        document.getElementById("val-iam-usuarios").textContent =
            data.total || 0;

        document.getElementById("tbl-iam-users").textContent =
            `${data.total || 0} usuários registrados`;

    } catch (error) {
        console.error("Erro IAM:", error);
    }
}

async function carregarS3() {
    try {
        const response = await fetch("/api/s3");
        const data = await response.json();

        document.getElementById("val-s3-buckets").textContent =
            data.total || 0;

        document.getElementById("tbl-s3-buckets").textContent =
            `${data.total || 0} bucket(s) encontrados`;

    } catch (error) {
        console.error("Erro S3:", error);
    }
}

async function carregarEC2() {
    try {
        const response = await fetch("/api/ec2");
        const data = await response.json();

        document.getElementById("val-ec2-instancias").textContent =
            data.total || 0;

        document.getElementById("tbl-ec2-instances").textContent =
            `${data.total || 0} instância(s)`;

    } catch (error) {
        console.error("Erro EC2:", error);
    }
}

async function carregarCloudTrail() {
    try {
        const response = await fetch("/api/cloudtrail");
        const data = await response.json();

        document.getElementById("val-cloudtrail-trails").textContent =
            data.total || 0;

        document.getElementById("tbl-cloudtrail-trails").textContent =
            `${data.total || 0} trail(s) ativos`;

    } catch (error) {
        console.error("Erro CloudTrail:", error);
    }
}

async function carregarSecurityHub() {
    try {
        const response = await fetch("/api/securityhub");
        const data = await response.json();

        document.getElementById("val-sechub-achados").textContent =
            data.total || 0;

        document.getElementById("tbl-sechub-findings").textContent =
            `${data.total || 0} achado(s)`;

    } catch (error) {
        console.error("Erro Security Hub:", error);
    }
}

function atualizarData() {
    const dataAtual = new Date().toLocaleString("pt-BR");

    document.getElementById(
        "ultima-atualizacao"
    ).textContent = dataAtual;
}

document
    .getElementById("btn-atualizar")
    .addEventListener("click", () => {
        carregarDashboard();
    });

document.addEventListener(
    "DOMContentLoaded",
    carregarDashboard
);