async function checkLeak() {

    const email =
        document
            .getElementById(
                "emailInput"
            )
            .value
            .trim();

    if (!email) {

        alert(
            "Informe um e-mail."
        );

        return;

    }

    const response =
        await fetch(
            "/api/leak-check",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                    "application/json"

                },

                body: JSON.stringify({

                    email

                })

            }
        );

    const data =
        await response.json();

    document
        .getElementById(
            "leakResult"
        )
        .innerHTML = `

        <h3>Resultado</h3>

        <p>
        <strong>E-mail:</strong>
        ${data.email}
        </p>

        <p>
        <strong>Risco:</strong>
        ${data.risk}
        </p>

        <p>
        <strong>Status:</strong>
        ${data.status}
        </p>

        <p>
        <strong>Vazamentos:</strong>
        ${data.breaches_found}
        </p>

        `;

}