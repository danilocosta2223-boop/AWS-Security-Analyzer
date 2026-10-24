
const cloudtrailService = require("../services/cloudtrailService");

async function listarTrails(req, res) {

    try {

        const resultado =
            await cloudtrailService.verificarTrails();

        res.json({
            servico: "CloudTrail",
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
    listarTrails
};