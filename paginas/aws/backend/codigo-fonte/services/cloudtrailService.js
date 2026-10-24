const {
    CloudTrailClient,
    DescribeTrailsCommand
} = require("@aws-sdk/client-cloudtrail");

const client = new CloudTrailClient({
    region: process.env.AWS_REGION || "sa-east-1"
});

async function verificarTrails() {

    const command = new DescribeTrailsCommand({});

    const response = await client.send(command);

    return response.trailList || [];

}

module.exports = {
    verificarTrails
};