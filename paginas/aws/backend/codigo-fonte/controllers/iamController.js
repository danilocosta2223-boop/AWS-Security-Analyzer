const { verificarUsuarios } = require("../services/iamService");

async function listarUsuarios(req, res) {
    try {
        const resultado = await verificarUsuarios();

        res.status(200).json({
            servico: "IAM",
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
    listarUsuarios
};