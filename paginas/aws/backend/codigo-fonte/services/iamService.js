const {
    IAMClient,
    ListUsersCommand
} = require("@aws-sdk/client-iam");

const iamClient = new IAMClient({
    region: process.env.AWS_REGION
});

async function verificarUsuarios() {
    try {
        const response = await iamClient.send(
            new ListUsersCommand({})
        );

        const usuarios = response.Users || [];

        return usuarios.map(usuario => ({
            nome: usuario.UserName,
            criadoEm: usuario.CreateDate,
            arn: usuario.Arn
        }));
    } catch (error) {
        throw new Error(
            `Erro ao consultar usuários IAM: ${error.message}`
        );
    }
}

module.exports = {
    verificarUsuarios
};
