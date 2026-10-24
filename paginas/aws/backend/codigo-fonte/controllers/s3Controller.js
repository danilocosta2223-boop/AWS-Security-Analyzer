const { verificarBuckets } = require("../services/s3Service");

async function listarBuckets(req, res) {
    try {
        const resultado = await verificarBuckets();

        res.status(200).json({
            servico: "Amazon S3",
            total: resultado.length,
            dados: resultado
        });
    } catch (error) {
        res.status(500).json({
            erro: error.message
        });
    }
}

module.exports = {
    listarBuckets
};