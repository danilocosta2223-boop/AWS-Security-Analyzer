async function analyzeDomain() {

    const domain =
        document
            .getElementById(
                "domainInput"
            )
            .value
            .trim();

    if (!domain) {

        alert(
            "Digite um domínio."
        );

        return;

    }

    const response =
        await fetch(
            "/api/domain-analysis",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify({

                    domain

                })

            }
        );

    const data =
        await response.json();

    document
        .getElementById(
            "domainResult"
        )
        .innerHTML = `

        <h3>Análise do Domínio</h3>

        <p>
        <strong>Domínio:</strong>
        ${data.domain}
        </p>

        <p>
        <strong>IP:</strong>
        ${data.ip}
        </p>

        <p>
        <strong>Status:</strong>
        ${data.status}
        </p>

        `;

}