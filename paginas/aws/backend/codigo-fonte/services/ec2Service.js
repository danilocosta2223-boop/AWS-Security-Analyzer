const {
    EC2Client,
    DescribeInstancesCommand
} = require("@aws-sdk/client-ec2");

const { region } = require("../config/aws");

console.log("REGIAO EC2:", region);

const ec2Client = new EC2Client({
    region
});

async function verificarInstancias() {
    try {
        const response = await ec2Client.send(
            new DescribeInstancesCommand({})
        );

        const resultados = [];

        response.Reservations?.forEach(reservation => {
            reservation.Instances?.forEach(instance => {
                resultados.push({
                    id: instance.InstanceId,
                    tipo: instance.InstanceType,
                    estado: instance.State?.Name,
                    lancadaEm: instance.LaunchTime
                });
            });
        });

        return resultados;
    } catch (error) {
        throw new Error(
            `Erro ao consultar EC2: ${error.message}`
        );
    }
}

module.exports = {
    verificarInstancias
};