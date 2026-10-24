const {
    S3Client,
    ListBucketsCommand,
    GetPublicAccessBlockCommand
} = require("@aws-sdk/client-s3");

const { region } = require("../config/aws");

const s3Client = new S3Client({ region });

async function verificarBuckets() {
    try {
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));

        if (!Buckets || Buckets.length === 0) {
            return [
                {
                    nome: "Nenhum bucket encontrado",
                    status: "Conta sem buckets S3",
                    severidade: "Baixa"
                }
            ];
        }

        const resultados = [];

        for (const bucket of Buckets) {
            try {
                const response = await s3Client.send(
                    new GetPublicAccessBlockCommand({
                        Bucket: bucket.Name
                    })
                );

                const config = response.PublicAccessBlockConfiguration;

                const bloqueado =
                    config?.BlockPublicAcls &&
                    config?.IgnorePublicAcls &&
                    config?.BlockPublicPolicy &&
                    config?.RestrictPublicBuckets;

                resultados.push({
                    nome: bucket.Name,
                    status: bloqueado ? "Seguro" : "Possível exposição pública",
                    severidade: bloqueado ? "Baixa" : "Crítica"
                });
            } catch (error) {
                resultados.push({
                    nome: bucket.Name,
                    status: "Não foi possível verificar o bloco público.",
                    severidade: "Média",
                    erro: error.message
                });
            }
        }

        return resultados;
    } catch (error) {
        throw new Error(`Erro ao analisar buckets S3: ${error.message}`);
    }
}

module.exports = {
    verificarBuckets
};