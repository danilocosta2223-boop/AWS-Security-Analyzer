const {
  verificarTrails
} = require("../services/cloudtrailService");

async function listarTrails(req, res) {
  try {
    const resultado = await verificarTrails();

    res.status(200).json({
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