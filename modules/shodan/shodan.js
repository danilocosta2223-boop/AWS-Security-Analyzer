async function analyzeShodan() {

    const target =
        document
            .getElementById(
                "shodanInput"
            )
            .value
            .trim();

    if (!target) {

        alert(
            "Digite um IP ou domínio."
        );

        return;

    }

    const response =
        await fetch(
            "/api/shodan",
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
            "shodanResult"
        )
        .innerHTML = `

        <h3>Resultado Shodan</h3>

        <p>
        <strong>Alvo:</strong>
        ${data.target}
        </p>

        <p>
        <strong>Organização:</strong>
        ${data.organization}
        </p>

        <p>
        <strong>País:</strong>
        ${data.country}
        </p>

        <p>
        <strong>Portas:</strong>
        ${data.open_ports.join(", ")}
        </p>

        <p>
        <strong>Serviços:</strong>
        ${data.services.join(", ")}
        </p>

        <p>
        <strong>Risco:</strong>
        ${data.risk}
        </p>

        `;

}