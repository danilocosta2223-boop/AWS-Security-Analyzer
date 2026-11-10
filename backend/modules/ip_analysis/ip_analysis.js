async function analyzeIP() {

    const ip =
        document
            .getElementById("ipInput")
            .value
            .trim();

    if (!ip) {

        alert(
            "Digite um endereço IP."
        );

        return;

    }

    try {

        const response =
            await fetch(
                "/api/ip-analysis",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                        "application/json"

                    },

                    body: JSON.stringify({

                        ip

                    })

                }
            );

        const data =
            await response.json();

        document
            .getElementById(
                "ipResult"
            ).innerHTML = `

            <h3>Resultado da Análise</h3>

            <p>
            <strong>IP:</strong>
            ${data.ip}
            </p>

            <p>
            <strong>Hostname:</strong>
            ${data.hostname}
            </p>

            <p>
            <strong>Versão:</strong>
            IPv${data.version}
            </p>

            <p>
            <strong>Privado:</strong>
            ${data.private}
            </p>

            <p>
            <strong>Loopback:</strong>
            ${data.loopback}
            </p>

            <p>
            <strong>Multicast:</strong>
            ${data.multicast}
            </p>

            <p>
            <strong>Reservado:</strong>
            ${data.reserved}
            </p>

            <p>
            <strong>Nível de Risco:</strong>
            ${data.risk}
            </p>

        `;

    } catch (error) {

        console.error(error);

        alert(
            "Erro ao analisar IP."
        );

    }

}