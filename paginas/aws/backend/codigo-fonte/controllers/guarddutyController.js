const {
    verificarGuardDuty
} = require("../services/guarddutyService");

async function listarGuardDuty(req, res) {
    try {
        const resultado = await verificarGuardDuty();

        res.status(200).json({
            servico: "GuardDuty",
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
    listarGuardDuty
};