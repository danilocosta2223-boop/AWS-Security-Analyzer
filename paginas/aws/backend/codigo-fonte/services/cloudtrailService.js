const s3Service = require("../services/s3Service");

async function analisar(req, res, next) {
    try {
        const dados = await s3Service.verificarBuckets();
        res.json({
            servico: "S3",
            dados
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    analisar
};