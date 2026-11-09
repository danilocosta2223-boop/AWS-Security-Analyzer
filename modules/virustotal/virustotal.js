async function analyzeVirusTotal() {

    const target =
        document
            .getElementById(
                "virusInput"
            )
            .value
            .trim();

    if (!target) {

        alert(
            "Digite uma URL, domínio ou IP."
        );

        return;

    }

    const response =
        await fetch(
            "/api/virustotal",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify({

                    target

                })

            }
        );

    const data =
        await response.json();

    document
        .getElementById(
            "virusResult"
        )
        .innerHTML = `

        <h3>VirusTotal</h3>

        <p>
        <strong>Alvo:</strong>
        ${data.target}
        </p>

        <p>
        <strong>Maliciosos:</strong>
        ${data.malicious}
        </p>

        <p>
        <strong>Suspeitos:</strong>
        ${data.suspicious}
        </p>

        <p>
        <strong>Seguros:</strong>
        ${data.harmless}
        </p>

        <p>
        <strong>Não Detectados:</strong>
        ${data.undetected}
        </p>

        <p>
        <strong>Risco:</strong>
        ${data.risk}
        </p>

        `;

}