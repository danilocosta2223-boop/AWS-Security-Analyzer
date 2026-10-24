require("dotenv").config();

console.log("--- DIAGNÓSTICO DO .ENV ---");
console.log("REGIAO:", process.env.AWS_REGION);
console.log("KEY:", process.env.AWS_ACCESS_KEY_ID ? "Carregada com sucesso! (Oculta por segurança)" : "UNDEFINED ❌");
console.log("----------------------------");

const express = require("express");
const cors = require("cors");

// Importação das rotas
const s3Routes = require("./routes/s3");
const iamRoutes = require("./routes/iam");
const ec2Routes = require("./routes/ec2");
// const cloudtrailRoutes = require("./routes/cloudtrail"); // Temporariamente comentado
// const securityhubRoutes = require("./routes/securityhub"); // Temporariamente comentado
// const guarddutyRoutes = require("./routes/guardduty"); // Temporariamente comentado

const app = express();

const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || "sa-east-1";
const API_VERSION = "v1";

console.log("Servidor carregando...");

// Middlewares globais
app.use(express.json());
app.use(cors());

// Middleware de log de requisições
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Página principal da API
app.get("/", (req, res) => {
    res.json({
        sistema: "AWS Security Analyzer",
        versao: "1.0.0",
        status: "ONLINE",
        mensagem: "API funcionando com sucesso",
        timestamp: new Date().toISOString()
    });
});

// Endpoint de Informações
app.get("/info", (req, res) => {
    res.json({
        sistema: "AWS Security Analyzer",
        versaoApi: API_VERSION,
        versaoSistema: "1.0.0",
        ambiente: process.env.NODE_ENV || "development",
        regiao: AWS_REGION
    });
});

// Health Check aprimorado
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        data: new Date().toISOString(),
        uptime: process.uptime(),
        memoria: process.memoryUsage().heapUsed
    });
});

// Registro das Rotas da API
app.use("/api/s3", s3Routes);
app.use("/api/iam", iamRoutes);
app.use("/api/ec2", ec2Routes);
// app.use("/api/cloudtrail", cloudtrailRoutes);
// app.use("/api/securityhub", securityhubRoutes);
// app.use("/api/guardduty", guarddutyRoutes);

// Rota não encontrada (404)
app.use((req, res) => {
    res.status(404).json({
        erro: "Rota não encontrada"
    });
});

// Tratamento de Erro Global
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        erro: "Erro interno do servidor"
    });
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log("=================================");
    console.log("    AWS Security Analyzer        ");
    console.log("=================================");
    console.log(`Servidor iniciado na porta ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Região AWS: ${AWS_REGION}`);
    console.log("=================================");
});