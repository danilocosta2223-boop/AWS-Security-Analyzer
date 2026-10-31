const {
    verificarInstancias
} = require("../services/ec2Service");

async function listarInstancias(req, res) {
    try {
        const resultado = await verificarInstancias();

        res.status(200).json({
            servico: "EC2",
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
    listarInstancias
};